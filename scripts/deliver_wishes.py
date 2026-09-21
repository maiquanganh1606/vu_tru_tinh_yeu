"""Run separately from Gunicorn. --once processes at most one queued wish."""
import argparse
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from server import create_app
from server.db import connect
from server.delivery import deliver_one


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true')
    parser.add_argument('--retry-failed', action='store_true', help='Requeue failed deliveries before processing')
    args = parser.parse_args()
    app = create_app()
    if args.retry_failed:
        with connect(app.config['DATABASE']) as db:
            db.execute("UPDATE delivery_jobs SET attempts=0,next_attempt=?,lease_until=0,lease_token=NULL WHERE wish_id IN (SELECT id FROM wishes WHERE status='failed')", (time.time(),))
            db.execute("UPDATE wishes SET status='queued' WHERE status='failed'")
    while True:
        processed = deliver_one(app.config)
        if args.once:
            break
        if not processed:
            time.sleep(5)


if __name__ == '__main__':
    main()
