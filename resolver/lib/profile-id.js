const crypto = require('crypto');
const bs58 = require('bs58').default;
const { BASE58_ALPHABET, PROFILE_ID_LENGTH } = require('./constants');
const { isValidProfileId } = require('./validation');

/**
 * Encode bytes to base58 and trim to PROFILE_ID_LENGTH chars.
 * Only returns if every character is in BASE58_ALPHABET (excludes 0, O, I, l).
 */
function bytesToProfileIdFragment(bytes) {
  const encoded = bs58.encode(bytes);
  if (encoded.length < PROFILE_ID_LENGTH) return null;
  const slice = encoded.slice(0, PROFILE_ID_LENGTH);
  if (slice.length !== PROFILE_ID_LENGTH) return null;
  for (let i = 0; i < slice.length; i++) {
    if (!BASE58_ALPHABET.includes(slice[i])) return null;
  }
  return slice;
}

/**
 * Generate one cryptographically random profile_id candidate (Technical Standards §3.1).
 * Does not check uniqueness; caller should retry on collision.
 */
function generateProfileIdCandidate() {
  for (let attempt = 0; attempt < 128; attempt++) {
    const bytes = crypto.randomBytes(16);
    const id = bytesToProfileIdFragment(bytes);
    if (id && isValidProfileId(id)) return id;
  }
  throw new Error('profile_id_generation_exhausted');
}

/**
 * @param {(id: string) => boolean} isTaken - sync predicate, true if id exists in DB
 * @param {number} [maxAttempts=64]
 * @returns {string}
 */
function generateProfileId(isTaken, maxAttempts = 64) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = generateProfileIdCandidate();
    if (!isTaken(id)) return id;
  }
  throw new Error('profile_id_collision_exhausted');
}

module.exports = {
  generateProfileIdCandidate,
  generateProfileId,
  bytesToProfileIdFragment,
};
