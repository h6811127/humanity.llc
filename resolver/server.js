require('dotenv').config();
const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { openDatabase } = require('./lib/db');
const { postProfilesHandler } = require('./lib/post-profiles');
const { getProfileHandler } = require('./lib/get-profile');
const { getQrPngHandler } = require('./lib/get-qr');

/** Tech Spec v0.5 §4.1 base path (no trailing slash here). */
const BASE_PATH = '/.well-known/hc/v0.5';

function publicBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) {
    return String(process.env.PUBLIC_BASE_URL).replace(/\/$/, '');
  }
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @returns {import('express').Express}
 */
function createApp(db) {
  const app = express();
  app.set('trust proxy', 1);

  const v05 = express.Router();

  v05.use(express.json({ limit: '32kb' }));

  // Tech Spec v0.5 §9 — 100 req / IP / 60s; health excluded (same pattern as §10.1 T-11).
  const limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'GET' && req.path === '/health',
  });
  v05.use(limiter);

  // Tech Spec v0.5 §4.7 — GET /health
  v05.get('/health', (_req, res) => {
    res.set('X-Resolver-Version', '0.5');
    try {
      db.prepare('SELECT 1').get();
      res.json({
        status: 'ok',
        version: '0.5',
        uptime: Math.floor(process.uptime()),
        database: 'connected',
      });
    } catch {
      res.status(500).json({
        status: 'error',
        version: '0.5',
        uptime: Math.floor(process.uptime()),
        database: 'error',
      });
    }
  });

  // Tech Spec v0.5 §4.2 — POST /profiles
  v05.post('/profiles', postProfilesHandler(db, publicBaseUrl));

  // Tech Spec v0.5 §4.3–§4.4 — GET /profile/:profileId (JSON vs HTML)
  v05.get('/profile/:profileId', getProfileHandler(db));

  // Tech Spec v0.5 §4.5 — GET /qr/:profile_id.png
  v05.get('/qr/:filename', getQrPngHandler(db));

  app.use(BASE_PATH, v05);
  return app;
}

if (require.main === module) {
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'profiles.sqlite');
  const db = openDatabase(dbPath);
  const app = createApp(db);
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => {
    console.log(`Humanity Commons resolver v0.5 — http://127.0.0.1:${PORT}${BASE_PATH}/health`);
  });
}

module.exports = { createApp, BASE_PATH };
