"""Durable, leased outbox. Importing this module never sends a message."""
import json
import logging
import secrets
import smtplib
import ssl
import time
import urllib.request
import certifi
from email.message import EmailMessage
from .db import connect


LOGGER = logging.getLogger(__name__)


def send_notification(config, wish):
    body = f"Một điều ước từ Pé Nhi\n\n{wish['content']}\n\nMã điều ước: {wish['id']}"
    if config['WISH_PROVIDER'] == 'email':
        if not all(config.get(k) for k in ('SMTP_HOST', 'SMTP_FROM', 'WISH_EMAIL_TO')):
            raise RuntimeError('provider_not_configured')
        message = EmailMessage()
        message['Subject'] = 'Một điều ước từ Pé Nhi'
        message['From'] = config['SMTP_FROM']
        message['To'] = config['WISH_EMAIL_TO']
        message['Message-ID'] = f"<{wish['id']}@love-universe.local>"
        message.set_content(body)
        with smtplib.SMTP(config['SMTP_HOST'], config['SMTP_PORT'], timeout=15) as smtp:
            smtp.starttls(context=ssl.create_default_context(cafile=certifi.where()))
            if config.get('SMTP_USERNAME'):
                smtp.login(config['SMTP_USERNAME'], config.get('SMTP_PASSWORD') or '')
            refused = smtp.send_message(message)
            if refused:
                raise RuntimeError('recipient_refused')
        return message['Message-ID']
    if config['WISH_PROVIDER'] != 'telegram' or not config.get('TELEGRAM_BOT_TOKEN') or not config.get('TELEGRAM_CHAT_ID'):
        raise RuntimeError('provider_not_configured')
    payload = json.dumps({'chat_id': config['TELEGRAM_CHAT_ID'], 'text': body}).encode()
    req = urllib.request.Request('https://api.telegram.org/bot' + config['TELEGRAM_BOT_TOKEN'] + '/sendMessage',
                                 data=payload, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=15, context=ssl.create_default_context(cafile=certifi.where())) as response:
        result = json.load(response)
    if not result.get('ok'):
        raise RuntimeError('provider_rejected')
    return str(result['result']['message_id'])


def deliver_one(config, sender=send_notification, timestamp=None):
    now = time.time() if timestamp is None else timestamp
    token = secrets.token_hex(16)
    with connect(config['DATABASE']) as db:
        db.execute('BEGIN IMMEDIATE')
        row = db.execute("""SELECT w.*,j.attempts FROM delivery_jobs j JOIN wishes w ON w.id=j.wish_id
          WHERE w.status IN ('queued','sending') AND j.next_attempt<=? AND j.lease_until<=?
          ORDER BY j.next_attempt LIMIT 1""", (now, now)).fetchone()
        if not row:
            return False
        db.execute('UPDATE delivery_jobs SET lease_until=?,lease_token=?,attempts=attempts+1 WHERE wish_id=?', (now + 120, token, row['id']))
        db.execute("UPDATE wishes SET status='sending' WHERE id=?", (row['id'],))
    try:
        provider_id = sender(config, dict(row))
        status, failure, next_attempt = 'sent', None, now
    except Exception as exc:
        # No raw exception: urllib errors can contain the bot token in the URL.
        failure = 'provider_not_configured' if str(exc) == 'provider_not_configured' else type(exc).__name__
        status = 'failed' if row['attempts'] + 1 >= 8 else 'queued'
        next_attempt = now + min(3600, 30 * 2 ** row['attempts'])
        provider_id = None
        LOGGER.warning('delivery attempt failed: status=%s failure=%s attempt=%s', status, failure, row['attempts'] + 1)
    else:
        LOGGER.info('delivery attempt succeeded: status=sent')
    with connect(config['DATABASE']) as db:
        db.execute('BEGIN IMMEDIATE')
        result = db.execute('UPDATE delivery_jobs SET lease_until=0,lease_token=NULL,next_attempt=?,last_error=?,provider_id=? WHERE wish_id=? AND lease_token=?',
                            (next_attempt, failure, provider_id, row['id'], token))
        if result.rowcount:
            db.execute('UPDATE wishes SET status=? WHERE id=?', (status, row['id']))
    return True
