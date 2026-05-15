const bs58 = require('bs58').default;

const HANDLE_REGEX = /^[a-z][a-z0-9_]{2,31}$/;

const RESERVED = new Set(
  [
    'admin',
    'administrator',
    'host',
    'resolver',
    'system',
    'test',
    'example',
    'support',
    'help',
    'info',
    'root',
    'api',
    'www',
    'hc',
    'hc://',
    'humanity',
    'commons',
    'profile',
    'profiles',
    'qr',
    'resolve',
    'revoked',
    'suspended',
    'null',
    'undefined',
    'false',
    'true',
    '0',
    '1',
  ].map((h) => h.toLowerCase())
);

const BASE58_PROFILE_ID = /^[1-9A-HJ-NP-Za-km-z]{20}$/;

function isValidHandle(handle) {
  if (!HANDLE_REGEX.test(handle)) return false;
  return !RESERVED.has(handle.toLowerCase());
}

/** @returns {'format' | 'reserved' | null} */
function handleIssue(handle) {
  if (typeof handle !== 'string') return 'format';
  if (!HANDLE_REGEX.test(handle)) return 'format';
  if (RESERVED.has(handle.toLowerCase())) return 'reserved';
  return null;
}

/** @returns {'empty' | 'too_long' | null} */
function manifestoIssue(raw) {
  if (typeof raw !== 'string') return 'empty';
  if (raw.length > 280) return 'too_long';
  const t = raw.trim();
  if (t.length === 0) return 'empty';
  const s = sanitizeManifesto(raw);
  if (s.length < 1) return 'empty';
  if (s.length > 280) return 'too_long';
  return null;
}

function sanitizeManifesto(line) {
  if (typeof line !== 'string') return '';
  const stripped = line.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  return stripped.trim().slice(0, 280);
}

function isValidManifesto(line) {
  return manifestoIssue(line) === null;
}

/** Ed25519 public key: 32 bytes, base58-encoded (typically ~43–44 chars). */
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
  return typeof id === 'string' && BASE58_PROFILE_ID.test(id);
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
