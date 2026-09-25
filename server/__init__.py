"""Application factory and same-origin APIs for the love universe."""
import hashlib
import os
import re
import secrets
import sqlite3
import time
import uuid
from pathlib import Path
from urllib.parse import urlsplit
from flask import Flask, Response, jsonify, redirect, render_template, request, session, url_for
from werkzeug.middleware.proxy_fix import ProxyFix
from image_catalog import catalog_script, universe_data
from .db import connect, initialize
from .capsule import load_capsule, answer_matches, iso_time

ROOT = Path(__file__).resolve().parent.parent


def create_app(overrides=None):
    instance = Path(os.environ.get('LOVE_INSTANCE_PATH', str(ROOT / 'instance'))).resolve()
    app = Flask(__name__, template_folder=str(ROOT / 'templates'), static_folder=str(ROOT / 'static'), instance_path=str(instance))
    app.config.update(
        DATABASE=str(instance / 'universe.sqlite3'), CAPSULE_FILE=str(instance / 'capsule.json'),
        SECRET_KEY=os.environ.get('LOVE_SECRET_KEY'), MAX_CONTENT_LENGTH=16 * 1024,
        SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax',
        SESSION_COOKIE_SECURE=os.environ.get('LOVE_HTTPS') == '1',
        TRUSTED_PROXY_HOPS=int(os.environ.get('LOVE_TRUSTED_PROXY_HOPS', '0')),
        NOW=time.time, TELEGRAM_BOT_TOKEN=os.environ.get('TELEGRAM_BOT_TOKEN'),
        TELEGRAM_CHAT_ID=os.environ.get('TELEGRAM_CHAT_ID'),
        WISH_PROVIDER=os.environ.get('WISH_PROVIDER', 'telegram'),
        SMTP_HOST=os.environ.get('SMTP_HOST'), SMTP_PORT=int(os.environ.get('SMTP_PORT', '587')),
        SMTP_USERNAME=os.environ.get('SMTP_USERNAME'), SMTP_PASSWORD=os.environ.get('SMTP_PASSWORD'),
        SMTP_FROM=os.environ.get('SMTP_FROM'), WISH_EMAIL_TO=os.environ.get('WISH_EMAIL_TO'),
    )
    if overrides:
        app.config.update(overrides)
    if app.config['TRUSTED_PROXY_HOPS']:
        hops = app.config['TRUSTED_PROXY_HOPS']
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=hops, x_proto=hops, x_host=0)
    initialize(app.config['DATABASE'])
    if not app.config['SECRET_KEY']:
        with connect(app.config['DATABASE']) as db:
            db.execute('INSERT OR IGNORE INTO settings(key,value) VALUES (?,?)', ('session_secret', secrets.token_hex(32)))
            app.config['SECRET_KEY'] = db.execute('SELECT value FROM settings WHERE key=?', ('session_secret',)).fetchone()[0]

    def now():
        return app.config['NOW']()

    def capsule():
        try:
            return load_capsule(app.config['CAPSULE_FILE'])
        except (ValueError, OSError):
            app.logger.error('Capsule configuration is invalid (private values omitted)')
            return None

    def ensure_session():
        if 'visitor' not in session:
            session['visitor'] = secrets.token_urlsafe(24)
        if 'csrf' not in session:
            session['csrf'] = secrets.token_urlsafe(32)

    def error(message, status, **extra):
        return jsonify(error=message, **extra), status

    def limited(bucket, limit, period, record=True):
        timestamp = now()
        with connect(app.config['DATABASE']) as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM attempts WHERE created < ?', (timestamp - 86400,))
            rows = db.execute('SELECT created FROM attempts WHERE bucket=? AND created>? ORDER BY created', (bucket, timestamp - period)).fetchall()
            if len(rows) >= limit:
                return max(1, int(rows[0][0] + period - timestamp) + 1)
            if record:
                db.execute('INSERT INTO attempts VALUES (?,?)', (bucket, timestamp))
        return 0

    def ip_bucket(prefix):
        # No untrusted X-Forwarded-For: configure the trusted reverse proxy explicitly if needed.
        digest = hashlib.sha256((request.remote_addr or 'local').encode()).hexdigest()
        return prefix + ':' + digest

    @app.before_request
    def protect_api():
        if not request.path.startswith('/api/'):
            return
        if request.method == 'POST':
            origin = request.headers.get('Origin')
            if origin and (urlsplit(origin).netloc != request.host or urlsplit(origin).scheme != request.scheme):
                return error('Yêu cầu không hợp lệ.', 403)
            if request.headers.get('Sec-Fetch-Site') == 'cross-site':
                return error('Yêu cầu không hợp lệ.', 403)
            token = request.headers.get('X-CSRF-Token', '')
            if not session.get('csrf') or not secrets.compare_digest(token, session['csrf']):
                return error('Phiên đã hết hạn. Pé tải lại trang nhé.', 403)
            if not request.is_json or not isinstance(request.get_json(silent=True), dict):
                return error('Nội dung gửi chưa hợp lệ.', 400)
        ensure_session()

    @app.after_request
    def headers(response):
        if request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'same-origin'
        return response

    @app.errorhandler(sqlite3.Error)
    def database_error(_error):
        app.logger.error('Database operation failed (private values omitted)')
        return error('Chưa lưu được. Pé giữ điều ước và thử lại nhé.', 503)

    @app.errorhandler(413)
    def too_large(_error):
        return error('Nội dung quá dài.', 413)

    @app.get('/')
    def home():
        return render_template('index.html')

    @app.get('/trung-thu-2026/')
    def mid_autumn_legacy():
        return redirect(url_for('mid_autumn'), code=301)

    @app.get('/trung-thu/')
    def mid_autumn():
        return render_template('mid-autumn/index.html')

    @app.get('/static/memories.js')
    def memories():
        return Response(catalog_script(), mimetype='application/javascript', headers={'Cache-Control': 'no-cache'})

    @app.get('/api/universe')
    def universe():
        return jsonify(**universe_data(), csrfToken=session['csrf'], serverNow=iso_time(now()))

    @app.get('/api/capsules/<capsule_id>')
    def capsule_status(capsule_id):
        data = capsule()
        if not data or data['id'] != capsule_id:
            return jsonify(configured=False, state='unconfigured', serverNow=iso_time(now()))
        fingerprint = hashlib.sha256(data['answer_hash'].encode()).hexdigest()
        grant = session.get('capsule_grant', {})
        verified = grant.get('id') == capsule_id and grant.get('until', 0) > now() and grant.get('version') == fingerprint
        state = ('open' if now() >= data['unlock_timestamp'] else 'waiting') if verified else 'sealed'
        return jsonify(configured=True, id=capsule_id, title=data['title'], question=data['question'],
                       unlockAt=data['unlock_at'], serverNow=iso_time(now()), state=state)

    @app.post('/api/capsules/<capsule_id>/unlock')
    def unlock(capsule_id):
        data = capsule()
        if not data or data['id'] != capsule_id:
            return error('Lá thư này đang được anh chuẩn bị.', 503)
        answer = request.get_json().get('answer')
        if not isinstance(answer, str) or not answer.strip() or len(answer) > 200:
            return error('Pé nhập câu trả lời ngắn nhé.', 400)
        # Reserve an attempt transactionally before hashing to prevent parallel guessing.
        bucket = ip_bucket('capsule:' + capsule_id)
        retry = limited(bucket, 5, 900)
        if retry:
            response, status = error('Mình nghỉ một chút rồi thử lại nhé.', 429, retryAfter=retry)
            response.headers['Retry-After'] = str(retry)
            return response, status
        if not answer_matches(data, answer):
            return error('Chưa đúng rồi, pé nhớ lại một chút nha.', 403)
        session['capsule_grant'] = {'id': capsule_id, 'until': now() + 1800,
                                    'version': hashlib.sha256(data['answer_hash'].encode()).hexdigest()}
        return capsule_status(capsule_id)

    @app.get('/api/capsules/<capsule_id>/letter')
    def letter(capsule_id):
        data = capsule()
        grant = session.get('capsule_grant', {})
        if not data or data['id'] != capsule_id:
            return error('Lá thư này đang được anh chuẩn bị.', 503)
        version = hashlib.sha256(data['answer_hash'].encode()).hexdigest()
        if grant.get('id') != capsule_id or grant.get('until', 0) <= now() or grant.get('version') != version:
            return error('Pé trả lời câu hỏi trước nhé.', 403)
        if now() < data['unlock_timestamp']:
            return error('Chưa đến ngày hẹn của mình.', 423, unlockAt=data['unlock_at'], serverNow=iso_time(now()))
        return jsonify(title=data['title'], letter=data['letter'])

    @app.post('/api/wishes')
    def wish_create():
        data = request.get_json()
        content, key = data.get('content'), data.get('idempotencyKey')
        if not isinstance(content, str) or not 1 <= len(content.strip()) <= 1000:
            return error('Điều ước cần từ 1 đến 1.000 ký tự.', 400)
        if not isinstance(key, str) or not re.fullmatch(r'[A-Za-z0-9_-]{16,100}', key):
            return error('Mã điều ước không hợp lệ.', 400)
        content = content.strip()
        with connect(app.config['DATABASE']) as db:
            existing = db.execute('SELECT * FROM wishes WHERE owner=? AND idempotency_key=?', (session['visitor'], key)).fetchone()
        if existing:
            if existing['content'] != content:
                return error('Điều ước này đã được lưu với nội dung khác.', 409)
            return jsonify(id=existing['id'], status=existing['status']), 200
        retry = limited(ip_bucket('wish'), 10, 3600)
        if retry:
            return error('Pé gửi nhiều điều ước rồi, mình chờ một chút nhé.', 429, retryAfter=retry)
        wish_id = uuid.uuid4().hex
        with connect(app.config['DATABASE']) as db:
            db.execute('BEGIN IMMEDIATE')
            # The unique key also handles concurrent requests after the first lookup.
            db.execute('INSERT OR IGNORE INTO wishes(id,owner,content,idempotency_key,created) VALUES(?,?,?,?,?)',
                       (wish_id, session['visitor'], content, key, now()))
            row = db.execute('SELECT * FROM wishes WHERE owner=? AND idempotency_key=?', (session['visitor'], key)).fetchone()
            if row['content'] != content:
                return error('Điều ước này đã được lưu với nội dung khác.', 409)
            db.execute('INSERT OR IGNORE INTO delivery_jobs(wish_id,next_attempt) VALUES(?,?)', (row['id'], now()))
        return jsonify(id=row['id'], status=row['status']), 202

    @app.get('/api/wishes/<wish_id>')
    def wish_status(wish_id):
        with connect(app.config['DATABASE']) as db:
            row = db.execute('SELECT id,status FROM wishes WHERE id=? AND owner=?', (wish_id, session['visitor'])).fetchone()
        if not row:
            return error('Không tìm thấy điều ước trong phiên này.', 404)
        return jsonify(id=row['id'], status=row['status'])

    return app
