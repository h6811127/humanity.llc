const crypto = require('crypto');
const {
  handleIssue,
  manifestoIssue,
  sanitizeManifesto,
  isValidPublicKeyBase58,
} = require('./validation');
const { generateProfileId } = require('./profile-id');

/** Tech Spec v0.5 §8.1 (and aligned server messages). */
const MSG = {
  handleFormat:
    'Handle must be 3-32 characters: lowercase letters, numbers, underscore. Must start with a letter.',
  handleReserved: 'This handle is reserved. Please choose another.',
  manifestoEmpty: 'Manifesto line must be 1-280 characters of plain text.',
  manifestoLong: 'Manifesto line cannot exceed 280 characters.',
  publicKey:
    'public_key must be a valid Ed25519 public key in base58 (32 bytes when decoded; typically ~44 characters).',
  handleTaken: 'This handle is already in use. Please choose another.',
};

/**
 * Tech Spec v0.5 §4.2 POST /profiles + §3.4 revocation secret (hash only in DB).
 * @param {import('better-sqlite3').Database} db
 * @param {(req: import('express').Request) => string} publicBaseUrl
 */
function postProfilesHandler(db, publicBaseUrl) {
  return (req, res) => {
    res.set('X-Resolver-Version', '0.5');
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
      return res.status(400).json({ error: 'invalid_public_key', message: MSG.publicKey });
    }

    const manifesto_line = sanitizeManifesto(manifestoRaw);
    const now = Math.floor(Date.now() / 1000);
    const existsStmt = db.prepare('SELECT 1 FROM profiles WHERE profile_id = ?');
    let profile_id;
    try {
      profile_id = generateProfileId((id) => Boolean(existsStmt.get(id)));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'server_error', message: 'Database error' });
    }

    const revocationSecret = crypto.randomBytes(16).toString('base64url');
    const revocation_secret_hash = crypto
      .createHash('sha256')
      .update(revocationSecret, 'utf8')
      .digest('hex');

    const base = publicBaseUrl(req).replace(/\/$/, '');

    try {
      db.prepare(
        `INSERT INTO profiles (
          profile_id, handle, manifesto_line, public_key,
          created_at, updated_at, revoked, revocation_secret_hash
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
      ).run(profile_id, handle, manifesto_line, publicKey, now, now, revocation_secret_hash);
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'handle_taken', message: MSG.handleTaken });
      }
      console.error(e);
      return res.status(500).json({ error: 'server_error', message: 'Database error' });
    }

    return res.status(201).json({
      success: true,
      profile_id,
      handle,
      manifesto_line,
      qr_code_url: `${base}/.well-known/hc/v0.5/qr/${profile_id}.png`,
      profile_url: `${base}/.well-known/hc/v0.5/profile/${profile_id}`,
      revocation_secret: revocationSecret,
      created_at: now,
    });
  };
}

module.exports = { postProfilesHandler, MSG };
