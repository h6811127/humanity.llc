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

describe('POST /revoke (Tech Spec v0.5 §4.6)', () => {
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

  it('T-09: valid secret returns 200; subsequent GET profile returns 410', async () => {
    const public_key = samplePublicKeyB58();
    const created = await request(app)
      .post(`${BASE_PATH}/profiles`)
      .send({ handle: 'revoke_ok', manifesto_line: 'x', public_key })
      .expect(201);
    const { profile_id, revocation_secret } = created.body;

    const rev = await request(app)
      .post(`${BASE_PATH}/revoke`)
      .send({ profile_id, revocation_secret })
      .expect(200);

    assert.equal(rev.body.success, true);
    assert.equal(
      rev.body.message,
      'Profile revoked. QR codes will return 410 Gone within 1 hour.'
    );

    const profile = await request(app)
      .get(`${BASE_PATH}/profile/${profile_id}`)
      .set('Accept', 'application/json')
      .expect(410);
    assert.equal(profile.body.error, 'revoked');
  });

  it('T-10: wrong secret returns 401 with §8.1 message', async () => {
    const public_key = samplePublicKeyB58();
    const created = await request(app)
      .post(`${BASE_PATH}/profiles`)
      .send({ handle: 'revoke_bad', manifesto_line: 'x', public_key })
      .expect(201);
    const { profile_id } = created.body;

    const res = await request(app)
      .post(`${BASE_PATH}/revoke`)
      .send({ profile_id, revocation_secret: 'definitely-wrong-secret' })
      .expect(401);

    assert.equal(res.body.error, 'invalid_secret');
    assert.equal(res.body.message, 'Revocation failed. Check your secret and try again.');
  });

  it('400 when profile_id or revocation_secret missing', async () => {
    const res = await request(app).post(`${BASE_PATH}/revoke`).send({ profile_id: 'x' }).expect(400);
    assert.equal(res.body.error, 'bad_request');
  });

  it('404 when profile not found', async () => {
    const res = await request(app)
      .post(`${BASE_PATH}/revoke`)
      .send({
        profile_id: '11111111111111111111',
        revocation_secret: 'any',
      })
      .expect(404);
    assert.equal(res.body.error, 'not_found');
    assert.equal(res.body.message, 'Profile not found');
  });

  it('410 when already revoked', async () => {
    const public_key = samplePublicKeyB58();
    const created = await request(app)
      .post(`${BASE_PATH}/profiles`)
      .send({ handle: 'revoke_twice', manifesto_line: 'x', public_key })
      .expect(201);
    const { profile_id, revocation_secret } = created.body;

    await request(app).post(`${BASE_PATH}/revoke`).send({ profile_id, revocation_secret }).expect(200);

    const res = await request(app)
      .post(`${BASE_PATH}/revoke`)
      .send({ profile_id, revocation_secret })
      .expect(410);
    assert.equal(res.body.error, 'revoked');
    assert.equal(res.body.message, 'Profile already revoked');
  });
});
