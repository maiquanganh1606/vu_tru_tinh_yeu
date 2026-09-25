"""Run with python -m unittest discover -s tests -p 'test_*.py'. No real messages."""
import json
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from werkzeug.security import generate_password_hash
from server import create_app
from server.capsule import normalize_answer
from server.db import connect
from server.delivery import deliver_one


class UniverseAPI(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.clock = [1800000000.0]
        self.config = dict(TESTING=True, SECRET_KEY='testing-only', DATABASE=str(self.root/'test.sqlite3'),
                           CAPSULE_FILE=str(self.root/'capsule.json'), NOW=lambda:self.clock[0])
        self.app = create_app(self.config)
        self.client = self.app.test_client()
        self.token = self.client.get('/api/universe').json['csrfToken']
        self.header = {'X-CSRF-Token': self.token}

    def tearDown(self):
        self.temp.cleanup()

    def capsule(self, delta=100):
        data = dict(id='future', title='Thư thử nghiệm', question='Một câu hỏi',
                    unlock_at=datetime.fromtimestamp(self.clock[0]+delta,timezone.utc).isoformat(),
                    answer_hash=generate_password_hash(normalize_answer('Cự Giải')), letter='PRIVATE_FUTURE_LETTER')
        (self.root/'capsule.json').write_text(json.dumps(data))
        return data

    def post(self, path, data):
        return self.client.post(path, json=data, headers=self.header)

    def wish(self, key='abcdefghijklmnop'):
        return self.post('/api/wishes',dict(content='Một ngày cùng nhau',idempotencyKey=key))

    def test_mid_autumn_is_an_isolated_page_in_the_same_app(self):
        legacy = self.client.get('/trung-thu-2026/')
        self.assertEqual(legacy.status_code, 301)
        self.assertEqual(legacy.headers['Location'], '/trung-thu/')
        response = self.client.get('/trung-thu/')
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn('/static/mid-autumn/app.js', html)
        self.assertIn('Gửi ước nguyện lên cung trăng', html)
        self.assertNotIn('/static/app.js', html)
        self.assertNotIn('/static/universe/', html)
        self.assertIn('href="/"', html)
        home = self.client.get('/').get_data(as_text=True)
        self.assertIn('href="/trung-thu/"', home)
        self.assertNotIn('/static/mid-autumn/', home)
        for asset in ('app.js', 'style.css', 'timeline.js', 'stage.js', 'flight.js', 'scene.js', 'audio.js', 'assets/hang-mobile.webp'):
            with self.subTest(asset=asset):
                with self.client.get('/static/mid-autumn/' + asset) as result:
                    self.assertEqual(result.status_code, 200)

    def test_capsule_never_leaks_before_time_and_checks_each_request(self):
        self.capsule()
        for path in ('/', '/api/universe', '/static/memories.js', '/api/capsules/future'):
            self.assertNotIn(b'PRIVATE_FUTURE_LETTER', self.client.get(path).data)
        self.assertEqual(self.client.get('/api/capsules/future/letter').status_code,403)
        self.assertEqual(self.post('/api/capsules/future/unlock',dict(answer='  CỰ   GIẢI  ')).json['state'],'waiting')
        self.clock[0] += 99
        response = self.client.get('/api/capsules/future/letter')
        self.assertEqual(response.status_code,423)
        self.assertEqual(response.headers['Cache-Control'],'no-store')
        self.clock[0] += 1
        self.assertEqual(self.client.get('/api/capsules/future/letter').json['letter'],'PRIVATE_FUTURE_LETTER')
        self.clock[0] += 1801
        self.assertEqual(self.client.get('/api/capsules/future/letter').status_code,403)

    def test_due_time_does_not_bypass_answer_and_rate_limit_survives_restart(self):
        self.capsule(-1)
        for _ in range(5):
            self.assertEqual(self.post('/api/capsules/future/unlock',dict(answer='wrong')).status_code,403)
        self.assertEqual(self.post('/api/capsules/future/unlock',dict(answer='Cự Giải')).status_code,429)
        other = create_app(self.config).test_client()
        token = other.get('/api/universe').json['csrfToken']
        self.assertEqual(other.post('/api/capsules/future/unlock',json={'answer':'Cự Giải'},headers={'X-CSRF-Token':token}).status_code,429)
        self.clock[0] += 901
        self.assertEqual(self.post('/api/capsules/future/unlock',dict(answer='Cự Giải')).json['state'],'open')

    def test_missing_invalid_configuration_and_changed_answer_fail_closed(self):
        self.assertFalse(self.client.get('/api/capsules/future').json['configured'])
        self.assertEqual(self.post('/api/capsules/future/unlock',dict(answer='answer')).status_code,503)
        self.capsule(-1)
        self.post('/api/capsules/future/unlock',dict(answer='Cự Giải'))
        data = self.capsule(-1) # New salted hash revokes the old grant.
        self.assertEqual(self.client.get('/api/capsules/future/letter').status_code,403)
        data['unlock_at'] = '2028-04-21T00:00:00' # Missing timezone must not open it.
        (self.root/'capsule.json').write_text(json.dumps(data))
        self.assertFalse(self.client.get('/api/capsules/future').json['configured'])

    def test_wish_idempotency_private_owner_and_durable_record(self):
        first = self.wish()
        self.assertEqual(first.status_code,202)
        second = self.wish()
        self.assertEqual(first.json['id'],second.json['id'])
        conflict = self.post('/api/wishes',dict(content='Different',idempotencyKey='abcdefghijklmnop'))
        self.assertEqual(conflict.status_code,409)
        other = self.app.test_client()
        self.assertEqual(other.get('/api/wishes/'+first.json['id']).status_code,404)
        with connect(self.config['DATABASE']) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM wishes').fetchone()[0],1)
            self.assertEqual(db.execute('SELECT count(*) FROM delivery_jobs').fetchone()[0],1)
        create_app(self.config) # Initializing again must retain both records.
        self.assertEqual(self.client.get('/api/wishes/'+first.json['id']).json['status'],'queued')

    def test_csrf_origin_and_validation(self):
        self.assertEqual(self.client.post('/api/wishes',json={}).status_code,403)
        self.assertEqual(self.client.post('/api/wishes',json={},headers={**self.header,'Origin':'https://other.example'}).status_code,403)
        self.assertEqual(self.post('/api/wishes',dict(content='x'*1001,idempotencyKey='abcdefghijklmnop')).status_code,400)
        self.assertEqual(self.post('/api/wishes',dict(content='  ',idempotencyKey='abcdefghijklmnop')).status_code,400)
        self.assertEqual(self.post('/api/wishes',dict(content='x',idempotencyKey='../bad')).status_code,400)

    def test_worker_failure_retry_claim_and_delivery(self):
        wish = self.wish().json
        calls=[]
        def fail(config, row):
            calls.append(row['id'])
            raise TimeoutError('secret provider url must not be recorded')
        self.assertTrue(deliver_one(self.app.config,sender=fail,timestamp=self.clock[0]))
        with connect(self.config['DATABASE']) as db:
            job = db.execute('SELECT * FROM delivery_jobs').fetchone()
            self.assertEqual(job['last_error'],'TimeoutError')
            self.assertEqual(job['attempts'],1)
        self.assertFalse(deliver_one(self.app.config,sender=fail,timestamp=self.clock[0]))
        def sent(config, row):
            calls.append(row['id']);return 'fake-provider-id'
        self.assertTrue(deliver_one(self.app.config,sender=sent,timestamp=self.clock[0]+31))
        self.assertEqual(self.client.get('/api/wishes/'+wish['id']).json['status'],'sent')
        self.assertFalse(deliver_one(self.app.config,sender=sent,timestamp=self.clock[0]+1000))
        self.assertEqual(len(calls),2)

    def test_only_one_worker_claims_and_expired_lease_recovers(self):
        self.wish()
        calls=[]
        def send(config,row):
            calls.append(row['id']);return 'fake'
        with ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(lambda _:deliver_one(self.app.config,sender=send,timestamp=self.clock[0]),range(2)))
        self.assertEqual(sum(results),1)
        self.assertEqual(len(calls),1)
        second=self.wish('secondabcdefghijk').json
        with connect(self.config['DATABASE']) as db:
            db.execute("UPDATE wishes SET status='sending' WHERE id=?",(second['id'],))
            db.execute('UPDATE delivery_jobs SET lease_until=?,lease_token=? WHERE wish_id=?',(self.clock[0]+10,'crashed',second['id']))
        self.assertFalse(deliver_one(self.app.config,sender=send,timestamp=self.clock[0]))
        self.assertTrue(deliver_one(self.app.config,sender=send,timestamp=self.clock[0]+11))


if __name__ == '__main__':
    unittest.main()
