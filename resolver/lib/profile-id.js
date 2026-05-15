const crypto = require('crypto');
const bs58 = require('bs58').default;

const PROFILE_ID_LENGTH = 20;

/**
 * Cryptographically random profile_id: 20 base58 chars (Tech Spec v0.5 §3.3, Appendix C).
 */
function generateProfileId(db) {
  const exists = db.prepare('SELECT 1 FROM profiles WHERE profile_id = ?');
  for (let attempt = 0; attempt < 64; attempt++) {
    const id = bs58.encode(crypto.randomBytes(16)).slice(0, PROFILE_ID_LENGTH);
    if (id.length !== PROFILE_ID_LENGTH) continue;
    if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(id)) continue;
    if (!exists.get(id)) return id;
  }
  throw new Error('profile_id_generation_exhausted');
}

module.exports = { generateProfileId };
