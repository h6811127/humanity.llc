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

describe('GET /profile/:id (Tech Spec v0.5 §4.3–§4.4)', () => {
  let db;
  let app;
  let profileId;

  before(async () => {
    process.env.PUBLIC_BASE_URL = 'https://resolver.humanity.llc';
    db = new Database(':memory:');
    db.exec(schemaSql);
    app = createApp(db);
    const public_key = samplePublicKeyB58();
    const res = await request(app)
      .post(`${BASE_PATH}/profiles`)
      .send({ handle: 'resolve_me', manifesto_line: 'A public line.', public_key })
      .expect(201);
    profileId = res.body.profile_id;
  });

  after(() => {
    delete process.env.PUBLIC_BASE_URL;
    db.close();
  });

  it('T-04: JSON 200 with §4.3 shape when Accept: application/json', async () => {
    const res = await request(app)
      .get(`${BASE_PATH}/profile/${profileId}`)
      .set('Accept', 'application/json')
      .expect(200);

    assert.equal(res.headers['x-resolver-version'], '0.5');
    assert.equal(res.headers['cache-control'], 'public, max-age=3600');
    assert.equal(res.body.version, '0.5');
    assert.equal(res.body.profile_id, profileId);
    assert.equal(res.body.handle, 'resolve_me');
    assert.equal(res.body.manifesto_line, 'A public line.');
    assert.deepEqual(res.body.badge, { type: 'early_builder', label: 'Early Builder' });
    assert.equal(typeof res.body.created_at, 'number');
    assert.equal(res.body.revoked, false);
    assert.equal(res.body.constitution_link, 'https://humanity.llc/constitution');
    assert.equal(res.body.governance_link, 'https://humanity.llc/governance');
  });

  it('T-05: unknown profile_id returns 404 JSON', async () => {
    const res = await request(app)
      .get(`${BASE_PATH}/profile/11111111111111111111`)
      .set('Accept', 'application/json')
      .expect(404);
    assert.deepEqual(res.body, { error: 'not_found', message: 'Profile not found' });
  });

  it('T-06: revoked profile returns 410 JSON', async () => {
    db.prepare('UPDATE profiles SET revoked = 1, revoked_at = ? WHERE profile_id = ?').run(
      Math.floor(Date.now() / 1000),
      profileId
    );
    const res = await request(app)
      .get(`${BASE_PATH}/profile/${profileId}`)
      .set('Accept', 'application/json')
      .expect(410);
    assert.deepEqual(res.body, { error: 'revoked', message: 'This profile has been revoked' });
  });

  it('returns HTML when no Accept (§4.4)', async () => {
    const freshPk = samplePublicKeyB58();
    const created = await request(app)
      .post(`${BASE_PATH}/profiles`)
      .send({ handle: 'html_user', manifesto_line: 'Hi', public_key: freshPk })
      .expect(201);
    const id = created.body.profile_id;
    const res = await request(app).get(`${BASE_PATH}/profile/${id}`).expect(200);
    assert.equal(res.headers['content-type'].includes('html'), true);
    assert.match(res.text, /@html_user/);
    assert.match(
      res.text,
      /This profile is part of the Humanity Commons\. Profile data is hosted by independent resolvers\. No data is sold\./
    );
    assert.match(res.text, /Constitution/);
    assert.match(res.text, /Governance/);
  });
});

describe('GET /qr/:id.png (Tech Spec v0.5 §4.5)', () => {
  let db;
  let app;
  let profileId;

  before(async () => {
    process.env.PUBLIC_BASE_URL = 'https://resolver.humanity.llc';
    db = new Database(':memory:');
    db.exec(schemaSql);
    app = createApp(db);
    const res = await request(app)
      .post(`${BASE_PATH}/profiles`)
      .send({
        handle: 'qr_user',
        manifesto_line: 'For QR.',
        public_key: samplePublicKeyB58(),
      })
      .expect(201);
    profileId = res.body.profile_id;
  });

  after(() => {
    delete process.env.PUBLIC_BASE_URL;
    db.close();
  });

  it('T-12: returns valid PNG that encodes hc://resolve/{id}', async () => {
    const res = await request(app).get(`${BASE_PATH}/qr/${profileId}.png`).buffer(true).expect(200);
    assert.equal(res.headers['content-type'], 'image/png');
    const body = Buffer.isBuffer(res.body) ? res.body : Buffer.from(res.body);
    assert.equal(body[0], 0x89);
    assert.equal(body[1], 0x50);
    assert.equal(body[2], 0x4e);
    assert.equal(body[3], 0x47);
  });

  it('returns 404 for unknown profile', async () => {
    await request(app).get(`${BASE_PATH}/qr/22222222222222222222.png`).expect(404);
  });

  it('returns 410 when profile is revoked', async () => {
    db.prepare('UPDATE profiles SET revoked = 1 WHERE profile_id = ?').run(profileId);
    await request(app).get(`${BASE_PATH}/qr/${profileId}.png`).expect(410);
  });
});
