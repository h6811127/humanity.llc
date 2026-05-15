const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const bs58 = require('bs58').default;
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { createApp, BASE_PATH } = require('../server');

const schemaSql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');

function samplePublicKeyB58() {
  return bs58.encode(crypto.randomBytes(32));
}

describe('POST /profiles (Tech Spec v0.5 §4.2)', () => {
  let db;
  let app;

  before(() => {
    process.env.PUBLIC_BASE_URL = 'https://resolver.humanity.llc';
    db = new Database(':memory:');
    db.exec(schemaSql);
    app = createApp(db);
  });

  after(() => {
    delete process.env.PUBLIC_BASE_URL;
    db.close();
  });

  it('T-01: 201 with profile_id, URLs, revocation_secret (§4.2, §3.4 hash in DB)', async () => {
    const public_key = samplePublicKeyB58();
    const res = await request(app)
      .post(`${BASE_PATH}/profiles`)
      .send({
        handle: 'valid_user',
        manifesto_line: 'Hello commons.',
        public_key,
      })
      .expect(201);

    assert.equal(res.body.success, true);
    assert.match(res.body.profile_id, /^[1-9A-HJ-NP-Za-km-z]{20}$/);
    assert.equal(res.body.handle, 'valid_user');
    assert.equal(res.body.manifesto_line, 'Hello commons.');
    assert.equal(
      res.body.qr_code_url,
      `https://resolver.humanity.llc/.well-known/hc/v0.5/qr/${res.body.profile_id}.png`
    );
    assert.equal(
      res.body.profile_url,
      `https://resolver.humanity.llc/.well-known/hc/v0.5/profile/${res.body.profile_id}`
    );
    assert.ok(typeof res.body.revocation_secret === 'string' && res.body.revocation_secret.length > 0);
    assert.equal(typeof res.body.created_at, 'number');

    const row = db.prepare('SELECT revocation_secret_hash FROM profiles WHERE profile_id = ?').get(res.body.profile_id);
    assert.equal(row.revocation_secret_hash.length, 64);
    assert.notEqual(row.revocation_secret_hash, res.body.revocation_secret);
  });

  it('T-02: duplicate handle returns 409 (§4.2)', async () => {
    const public_key = samplePublicKeyB58();
    await request(app)
      .post(`${BASE_PATH}/profiles`)
      .send({ handle: 'dup_user', manifesto_line: 'One', public_key })
      .expect(201);
    const res = await request(app)
      .post(`${BASE_PATH}/profiles`)
      .send({ handle: 'dup_user', manifesto_line: 'Two', public_key: samplePublicKeyB58() })
      .expect(409);
    assert.equal(res.body.error, 'handle_taken');
    assert.equal(res.body.message, 'This handle is already in use. Please choose another.');
  });

  it('T-03: invalid handle (uppercase) returns 400', async () => {
    const res = await request(app)
      .post(`${BASE_PATH}/profiles`)
      .send({
        handle: 'BadHandle',
        manifesto_line: 'x',
        public_key: samplePublicKeyB58(),
      })
      .expect(400);
    assert.equal(res.body.error, 'invalid_handle');
  });
});
