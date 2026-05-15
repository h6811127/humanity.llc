require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const Database = require('better-sqlite3');

const {
  handleIssue,
  manifestoIssue,
  sanitizeManifesto,
  isValidPublicKeyBase58,
  isValidProfileId,
} = require('./lib/validation');
const { generateProfileId } = require('./lib/profile-id');
const { profilePageHtml } = require('./lib/html');
const { requestLogMiddleware } = require('./lib/request-log');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const BASE_PATH = '/.well-known/hc/v0.5';
const DEFAULT_CONSTITUTION = 'https://humanity.llc/constitution';
const DEFAULT_GOVERNANCE = 'https://humanity.llc/governance';

const dbPath = process.env.DATABASE_PATH || path.join(ROOT, 'data', 'profiles.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.exec(fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf8'));

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '32kb' }));
app.use(requestLogMiddleware);

const frontendDir = path.join(ROOT, 'frontend');
app.use('/frontend', express.static(frontendDir));
app.get('/sw.js', (_req, res) => {
  res.setHeader('Service-Worker-Allowed', '/');
  res.type('application/javascript');
  res.sendFile(path.join(frontendDir, 'sw.js'));
});
app.get('/', (_req, res) => {
  res.redirect('/frontend/index.html');
});

function publicBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
}

function v05Url(req, suffix) {
  return `${publicBaseUrl(req)}${BASE_PATH}${suffix}`;
}

function wantsHtml(req) {
  const accept = req.get('accept');
  if (!accept) return true;
  if (accept.includes('text/html')) return true;
  if (accept.includes('application/json')) return false;
  return true;
}

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' && req.path === '/health',
});

const v05 = express.Router();
v05.use(limiter);

v05.get('/health', (_req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({
      status: 'ok',
      version: '0.5',
      uptime: Math.floor(process.uptime()),
      database: 'connected',
    });
  } catch (e) {
    res.status(500).json({
      status: 'error',
      version: '0.5',
      uptime: Math.floor(process.uptime()),
      database: 'error',
      message: String(e.message),
    });
  }
});

const MSG = {
  handleFormat:
    'Handle must be 3–32 characters: lowercase letters, numbers, underscore. Must start with a letter.',
  handleReserved: 'This handle is reserved. Please choose another.',
  manifestoEmpty: 'Manifesto line must be 1–280 characters of plain text.',
  manifestoLong: 'Manifesto line cannot exceed 280 characters.',
};

v05.post('/profiles', (req, res) => {
  const { handle, manifesto_line: manifestoRaw, public_key: publicKey } = req.body || {};

  const hi = handleIssue(handle);
  if (hi === 'format') {
    return res.status(400).json({ error: 'invalid_handle', message: MSG.handleFormat });
  }
  if (hi === 'reserved') {
    return res.status(400).json({ error: 'invalid_handle', message: MSG.handleReserved });
  }

  const mi = manifestoIssue(manifestoRaw);
  if (mi === 'too_long') {
    return res.status(400).json({ error: 'invalid_manifesto', message: MSG.manifestoLong });
  }
  if (mi === 'empty') {
    return res.status(400).json({ error: 'invalid_manifesto', message: MSG.manifestoEmpty });
  }

  if (!isValidPublicKeyBase58(publicKey)) {
    return res.status(400).json({
      error: 'invalid_public_key',
      message:
        'public_key must be a valid Ed25519 public key in base58 (32 bytes when decoded; typically ~44 characters).',
    });
  }

  const manifesto_line = sanitizeManifesto(manifestoRaw);
  const now = Math.floor(Date.now() / 1000);
  const profile_id = generateProfileId(db);
  const revocationSecret = crypto.randomBytes(16).toString('base64url');
  const revocation_secret_hash = crypto.createHash('sha256').update(revocationSecret, 'utf8').digest('hex');

  try {
    db.prepare(
      `INSERT INTO profiles (
        profile_id, handle, manifesto_line, public_key,
        created_at, updated_at, revoked, revocation_secret_hash
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(profile_id, handle, manifesto_line, publicKey, now, now, revocation_secret_hash);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({
        error: 'handle_taken',
        message: 'This handle is already in use. Please choose another.',
      });
    }
    console.error(e);
    return res.status(500).json({ error: 'server_error', message: 'Database error' });
  }

  return res.status(201).json({
    success: true,
    profile_id,
    handle,
    manifesto_line,
    qr_code_url: v05Url(req, `/qr/${profile_id}.png`),
    profile_url: v05Url(req, `/profile/${profile_id}`),
    revocation_secret: revocationSecret,
    created_at: now,
  });
});

function getProfileRow(profileId) {
  if (!isValidProfileId(profileId)) return null;
  return db.prepare('SELECT * FROM profiles WHERE profile_id = ?').get(profileId) || null;
}

function profileJson(req, row) {
  const constitution_link = process.env.CONSTITUTION_LINK || DEFAULT_CONSTITUTION;
  const governance_link = process.env.GOVERNANCE_LINK || DEFAULT_GOVERNANCE;
  return {
    version: '0.5',
    profile_id: row.profile_id,
    handle: row.handle,
    manifesto_line: row.manifesto_line,
    badge: { type: 'early_builder', label: 'Early Builder' },
    created_at: row.created_at,
    revoked: Boolean(row.revoked),
    constitution_link,
    governance_link,
  };
}

v05.get('/profile/:profileId', (req, res) => {
  const row = getProfileRow(req.params.profileId);
  if (!row) {
    if (wantsHtml(req)) {
      res.status(404).type('html')
        .send(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not found</title></head><body><p>No profile exists with this ID. The QR code may be invalid or revoked.</p></body></html>'
        );
    } else {
      res.status(404).json({ error: 'not_found', message: 'Profile not found' });
    }
    return;
  }

  if (row.revoked) {
    if (wantsHtml(req)) {
      res.status(410).type('html')
        .send(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Revoked</title></head><body><p class="revoked-notice">⛔ This profile has been revoked</p></body></html>'
        );
    } else {
      res.status(410).json({ error: 'revoked', message: 'This profile has been revoked' });
    }
    return;
  }

  const body = profileJson(req, row);
  const servedAtIso = new Date().toISOString();
  if (wantsHtml(req)) {
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('X-Resolver-Version', '0.5');
    res.type('html').send(
      profilePageHtml(
        { ...body, revoked: false },
        {
          constitutionLink: body.constitution_link,
          governanceLink: body.governance_link,
          servedAtIso,
        }
      )
    );
  } else {
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('X-Resolver-Version', '0.5');
    res.json(body);
  }
});

v05.get('/qr/:filename', async (req, res) => {
  const m = String(req.params.filename || '').match(/^([1-9A-HJ-NP-Za-km-z]{20})\.png$/i);
  if (!m) {
    return res.status(400).type('text/plain').send('Invalid QR path');
  }
  const profileId = m[1];
  if (!isValidProfileId(profileId)) {
    return res.status(400).type('text/plain').send('Invalid profile id');
  }
  const row = getProfileRow(profileId);
  if (!row) return res.status(404).type('text/plain').send('Not found');
  if (row.revoked) return res.status(410).type('text/plain').send('Revoked');

  const size = Math.min(1000, Math.max(100, Number(req.query.size) || 300));
  const margin = Math.min(10, Math.max(1, Number(req.query.margin) || 4));
  const eccRaw = String(req.query.ecc || 'M').toUpperCase();
  const ecc = ['L', 'M', 'Q', 'H'].includes(eccRaw) ? eccRaw : 'M';

  try {
    const png = await QRCode.toBuffer(`hc://resolve/${profileId}`, {
      type: 'png',
      width: size,
      margin,
      errorCorrectionLevel: ecc,
    });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(png);
  } catch (e) {
    console.error(e);
    res.status(500).type('text/plain').send('QR generation failed');
  }
});

v05.post('/revoke', (req, res) => {
  const { profile_id: profileId, revocation_secret: secret } = req.body || {};
  if (!profileId || !secret) {
    return res.status(400).json({ error: 'bad_request', message: 'profile_id and revocation_secret are required' });
  }
  if (!isValidProfileId(profileId)) {
    return res.status(400).json({ error: 'invalid_profile_id', message: 'Invalid profile_id' });
  }

  const row = db.prepare('SELECT * FROM profiles WHERE profile_id = ?').get(profileId);
  if (!row) {
    return res.status(404).json({ error: 'not_found', message: 'Profile not found' });
  }
  if (row.revoked) {
    return res.status(410).json({ error: 'revoked', message: 'Profile already revoked' });
  }

  const expected = row.revocation_secret_hash;
  const candidate = crypto.createHash('sha256').update(String(secret), 'utf8').digest('hex');
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({
      error: 'invalid_secret',
      message: 'Revocation failed. Check your secret and try again.',
    });
  }

  const now = Math.floor(Date.now() / 1000);
  db.prepare('UPDATE profiles SET revoked = 1, revoked_at = ? WHERE profile_id = ?').run(now, profileId);

  return res.json({
    success: true,
    message: 'Profile revoked. QR codes will return 410 Gone within 1 hour.',
  });
});

app.use(BASE_PATH, v05);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'server_error', message: 'Internal error' });
});

app.listen(PORT, () => {
  console.log(`Humanity Commons resolver v0.5 listening on http://127.0.0.1:${PORT}`);
  console.log(`API base: http://127.0.0.1:${PORT}${BASE_PATH}`);
});
