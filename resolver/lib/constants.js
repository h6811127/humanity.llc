/**
 * Shared constants for Humanity Commons resolver v0.5 contract.
 * Aligns with docs/Technical Standards v0.5.md (§2–3, §5.4–5.5) and
 * docs/Tech Spec v0.5 🏁.md (§3–4, Appendix A).
 */

/** Bitcoin-style base58 alphabet (no 0, O, I, l). */
const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** Profile IDs are exactly this many characters (Technical Standards §3.1). */
const PROFILE_ID_LENGTH = 20;

/** QR payload must not exceed this length (Technical Standards §2.2). */
const QR_PAYLOAD_MAX_LENGTH = 120;

const QR_SCHEME = 'hc';
const QR_HOST = 'resolve';

/** Reserved handles: Tech Spec Appendix A + Technical Standards §5.5 (+ numeric/null-like). */
const RESERVED_HANDLES = [
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
].map((h) => h.toLowerCase());

module.exports = {
  BASE58_ALPHABET,
  PROFILE_ID_LENGTH,
  QR_PAYLOAD_MAX_LENGTH,
  QR_SCHEME,
  QR_HOST,
  RESERVED_HANDLES,
};
