const crypto = require('crypto');
const { isValidProfileId } = require('./validation');

/** Tech Spec v0.5 §4.6 + §8.1 */
const MSG = {
  missing: 'profile_id and revocation_secret are required',
  invalidSecret: 'Revocation failed. Check your secret and try again.',
  notFound: 'Profile not found',
  alreadyRevoked: 'Profile already revoked',
  revokedOk: 'Profile revoked. QR codes will return 410 Gone within 1 hour.',
};

/**
 * Tech Spec v0.5 §4.6 POST /revoke (MVP secret; §3.4 SHA-256 hash in DB).
 * @param {import('better-sqlite3').Database} db
 */
function postRevokeHandler(db) {
  return (req, res) => {
    res.set('X-Resolver-Version', '0.5');
    const { profile_id: profileId, revocation_secret: secret } = req.body || {};

    if (profileId == null || profileId === '' || secret == null || secret === '') {
      return res.status(400).json({ error: 'bad_request', message: MSG.missing });
    }

    if (!isValidProfileId(profileId)) {
      return res.status(404).json({ error: 'not_found', message: MSG.notFound });
    }

    const row = db.prepare('SELECT * FROM profiles WHERE profile_id = ?').get(profileId);
    if (!row) {
      return res.status(404).json({ error: 'not_found', message: MSG.notFound });
    }

    if (row.revoked) {
      return res.status(410).json({ error: 'revoked', message: MSG.alreadyRevoked });
    }

    const expected = row.revocation_secret_hash;
    if (!expected || typeof expected !== 'string') {
      console.error('postRevoke: missing revocation_secret_hash for', profileId);
      return res.status(500).json({ error: 'server_error', message: 'Database error' });
    }

    const candidate = crypto.createHash('sha256').update(String(secret), 'utf8').digest('hex');
    const a = Buffer.from(candidate, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: 'invalid_secret', message: MSG.invalidSecret });
    }

    const now = Math.floor(Date.now() / 1000);
    db.prepare('UPDATE profiles SET revoked = 1, revoked_at = ? WHERE profile_id = ?').run(now, profileId);

    return res.json({
      success: true,
      message: MSG.revokedOk,
    });
  };
}

module.exports = { postRevokeHandler, MSG };
