require('dotenv').config();
const path = require('path');
const express = require('express');
const { openDatabase } = require('./lib/db');

/** Tech Spec v0.5 §4.1 base path (no trailing slash here). */
const BASE_PATH = '/.well-known/hc/v0.5';

/**
 * @param {import('better-sqlite3').Database} db
 * @returns {import('express').Express}
 */
function createApp(db) {
  const app = express();
  app.set('trust proxy', 1);

  const v05 = express.Router();

  // Tech Spec v0.5 §4.7 — GET /health (relative to §4.1 base URL)
  v05.get('/health', (_req, res) => {
    try {
      db.prepare('SELECT 1').get();
      res.set('X-Resolver-Version', '0.5');
      res.json({
        status: 'ok',
        version: '0.5',
        uptime: Math.floor(process.uptime()),
        database: 'connected',
      });
    } catch {
      res.status(500).set('X-Resolver-Version', '0.5').json({
        status: 'error',
        version: '0.5',
        uptime: Math.floor(process.uptime()),
        database: 'error',
      });
    }
  });

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
