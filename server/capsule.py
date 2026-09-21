"""Private capsule configuration; never serialized wholesale to the client."""
import json
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from werkzeug.security import check_password_hash


def normalize_answer(answer):
    return ' '.join(unicodedata.normalize('NFC', answer).casefold().split())


def load_capsule(path):
    if not Path(path).is_file():
        return None
    data = json.loads(Path(path).read_text(encoding='utf-8'))
    required = ('id', 'title', 'question', 'unlock_at', 'answer_hash', 'letter')
    if not all(isinstance(data.get(key), str) and data[key].strip() for key in required):
        raise ValueError('Capsule requires nonempty id, title, question, unlock_at, answer_hash and letter')
    unlock = datetime.fromisoformat(data['unlock_at'].replace('Z', '+00:00'))
    if unlock.tzinfo is None:
        raise ValueError('unlock_at must include a timezone, e.g. +07:00')
    data['unlock_timestamp'] = unlock.timestamp()
    return data


def answer_matches(capsule, answer):
    return check_password_hash(capsule['answer_hash'], normalize_answer(answer))


def iso_time(timestamp):
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat()
