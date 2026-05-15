const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { anonymizeIp } = require('../lib/request-log');
const { createApp, BASE_PATH } = require('../server');

const schemaSql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');

describe('anonymizeIp (Tech Spec v0.5 §8.2)', () => {
  it('zeros last IPv4 octet', () => {
    assert.equal(anonymizeIp('203.0.113.42'), '203.0.113.0');
  });

  it('passes through localhost', () => {
    assert.equal(anonymizeIp('127.0.0.1'), '127.0.0.1');
  });
});

describe('Access log format (Tech Spec v0.5 §8.2)', () => {
  let db;
  let app;
  let logPath;

  before(() => {
    logPath = path.join(os.tmpdir(), `hc-access-${Date.now()}-${Math.random().toString(36).slice(2)}.log`);
    process.env.LOG_FILE = logPath;
    process.env.LOG_ENABLED = '1';
    db = new Database(':memory:');
    db.exec(schemaSql);
    app = createApp(db);
  });

  after(() => {
    try {
      fs.unlinkSync(logPath);
    } catch {
      /* ignore */
    }
    delete process.env.LOG_FILE;
    delete process.env.LOG_ENABLED;
    db.close();
  });

  it('writes one line per request: timestamp method path status anonymized-ip', async () => {
    await request(app)
      .get(`${BASE_PATH}/health`)
      .set('X-Forwarded-For', '203.0.113.99')
      .expect(200);

    const content = fs.readFileSync(logPath, 'utf8').trim();
    const lines = content.split('\n').filter(Boolean);
    assert.equal(lines.length, 1);
    // Example from spec: 2026-05-14T10:30:00Z POST /profiles 201 203.0.113.0
    assert.match(
      lines[0],
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z GET \/\.well-known\/hc\/v0\.5\/health 200 203\.0\.113\.0$/
    );
  });

  it('respects LOG_ENABLED=0', async () => {
    process.env.LOG_ENABLED = '0';
    const before = fs.existsSync(logPath) ? fs.statSync(logPath).size : 0;
    await request(app).get(`${BASE_PATH}/health`).expect(200);
    const after = fs.statSync(logPath).size;
    assert.equal(after, before);
    process.env.LOG_ENABLED = '1';
  });
});
