"""Small durable store shared by Flask and the delivery worker."""
import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attempts (bucket TEXT NOT NULL, created REAL NOT NULL);
CREATE INDEX IF NOT EXISTS attempts_bucket ON attempts(bucket, created);
CREATE TABLE IF NOT EXISTS wishes (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, content TEXT NOT NULL,
 idempotency_key TEXT NOT NULL, created REAL NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued', UNIQUE(owner, idempotency_key)
);
CREATE TABLE IF NOT EXISTS delivery_jobs (
 wish_id TEXT PRIMARY KEY REFERENCES wishes(id), attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt REAL NOT NULL, lease_until REAL NOT NULL DEFAULT 0, lease_token TEXT,
 last_error TEXT, provider_id TEXT
);
"""


def connect(path):
    db = sqlite3.connect(path, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    return db


def initialize(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with connect(path) as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.executescript(SCHEMA)
