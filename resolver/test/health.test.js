const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { createApp, BASE_PATH } = require('../server');

const schemaSql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');

describe('GET /health (Tech Spec v0.5 §4.7)', () => {
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

  it('returns 200 with required JSON fields when database is connected', async () => {
    const res = await request(app).get(`${BASE_PATH}/health`).expect(200);
    assert.equal(res.headers['x-resolver-version'], '0.5');
    assert.deepEqual(
      {
        status: res.body.status,
        version: res.body.version,
        database: res.body.database,
      },
      {
        status: 'ok',
        version: '0.5',
        database: 'connected',
      }
    );
    assert.equal(typeof res.body.uptime, 'number');
    assert.ok(res.body.uptime >= 0);
  });
});
