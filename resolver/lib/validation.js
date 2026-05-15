const bs58 = require('bs58').default;
const { BASE58_ALPHABET, PROFILE_ID_LENGTH, RESERVED_HANDLES } = require('./constants');

const HANDLE_REGEX = /^[a-z][a-z0-9_]{2,31}$/;
const RESERVED = new Set(RESERVED_HANDLES);

/** Profile id: 20 chars, each in base58 alphabet (opaque identifier string). */
const PROFILE_ID_STRING = new RegExp(
  `^[1-9A-HJ-NP-Za-km-z]{${PROFILE_ID_LENGTH}}$`
);

function isValidHandle(handle) {
  return handleIssue(handle) === null;
}

/** @returns {'format' | 'reserved' | null} */
function handleIssue(handle) {
  if (typeof handle !== 'string') return 'format';
  if (!HANDLE_REGEX.test(handle)) return 'format';
  if (RESERVED.has(handle.toLowerCase())) return 'reserved';
  return null;
}

function sanitizeManifesto(line) {
  if (typeof line !== 'string') return '';
  const stripped = line.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  return stripped.trim().slice(0, 280);
}

/** @returns {'empty' | 'too_long' | null} */
function manifestoIssue(raw) {
  if (typeof raw !== 'string') return 'empty';
  if (raw.length > 4096) return 'too_long';
  const stripped = raw.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  const t = stripped.trim();
  if (t.length < 1) return 'empty';
  if (t.length > 280) return 'too_long';
  return null;
}

function isValidManifesto(line) {
  return manifestoIssue(line) === null;
}

/**
 * Ed25519 public key: 32 bytes when base58-decoded (RFC 8032; Technical Standards §4.1).
 * Encoding on the wire is base58 (Technical Standards §4.3; Tech Spec §4.2).
 */
function isValidPublicKeyBase58(publicKey) {
  if (typeof publicKey !== 'string' || publicKey.length < 40 || publicKey.length > 48) {
    return false;
  }
  try {
    const buf = bs58.decode(publicKey);
    return buf.length === 32;
  } catch {
    return false;
  }
}

function isValidProfileId(id) {
  if (typeof id !== 'string' || id.length !== PROFILE_ID_LENGTH) return false;
  if (!PROFILE_ID_STRING.test(id)) return false;
  for (let i = 0; i < id.length; i++) {
    if (!BASE58_ALPHABET.includes(id[i])) return false;
  }
  return true;
}

module.exports = {
  HANDLE_REGEX,
  RESERVED,
  isValidHandle,
  handleIssue,
  manifestoIssue,
  sanitizeManifesto,
  isValidManifesto,
  isValidPublicKeyBase58,
  isValidProfileId,
};
