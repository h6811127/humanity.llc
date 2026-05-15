const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { createApp, BASE_PATH } = require('../server');

const schemaSql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');

describe('Static frontend (Tech Spec v0.5 §5.1)', () => {
  let db;
  let app;

  before(() => {
    db = new Database(':memory:');
    db.exec(schemaSql);
    app = createApp(db);
  });

  after(() => {
    db.close();
  });

  it('serves /create.html', async () => {
    const res = await request(app).get('/create.html').expect(200);
    assert.ok(res.text.includes('id="create-form"'));
    assert.ok(res.text.includes('libsodium-wrappers'));
  });

  it('serves /sw.js with Service-Worker-Allowed (§5.3 / SW scope)', async () => {
    const res = await request(app).get('/sw.js').expect(200);
    assert.equal(res.headers['service-worker-allowed'], '/');
  });

  it('HTML profile includes §5.3 asset links when created via API', async () => {
    const crypto = require('crypto');
    const bs58 = require('bs58').default;
    const public_key = bs58.encode(crypto.randomBytes(32));
    const created = await request(app)
      .post(`${BASE_PATH}/profiles`)
      .send({ handle: 'sw_user', manifesto_line: 'Hello', public_key })
      .expect(201);
    const res = await request(app).get(`${BASE_PATH}/profile/${created.body.profile_id}`).expect(200);
    assert.ok(res.text.includes('href="/style.css"'));
    assert.ok(res.text.includes('navigator.serviceWorker.register(\'/sw.js\')'));
  });
});
