const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { createApp, BASE_PATH } = require('../server');

const schemaSql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');

/** Valid 20-char base58 id that is not in DB → cheap 404 responses. */
const MISSING_PROFILE = `${BASE_PATH}/profile/11111111111111111111`;

describe('T-11 Rate limiting (Tech Spec v0.5 §10.1, §9)', () => {
  let db;

  before(() => {
    db = new Database(':memory:');
    db.exec(schemaSql);
  });

  after(() => {
    db.close();
  });

  it('returns 429 when request count exceeds configured max in the window', async () => {
    const app = createApp(db, { rateLimit: { max: 5, windowMs: 60_000 } });
    for (let i = 0; i < 5; i++) {
      await request(app).get(MISSING_PROFILE).expect(404);
    }
    const res = await request(app).get(MISSING_PROFILE).expect(429);
    assert.ok(res.status === 429);
  });

  it(
    'T-11: 101st request within 60s returns 429 when max is 100 (§10.1, §9)',
    { timeout: 120_000 },
    async () => {
      const app = createApp(db, { rateLimit: { max: 100, windowMs: 60_000 } });
      for (let i = 0; i < 100; i++) {
        await request(app).get(MISSING_PROFILE).expect(404);
      }
      await request(app).get(MISSING_PROFILE).expect(429);
    }
  );
});
