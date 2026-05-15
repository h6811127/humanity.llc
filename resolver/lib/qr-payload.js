const { QR_PAYLOAD_MAX_LENGTH, QR_SCHEME, QR_HOST } = require('./constants');
const { isValidProfileId } = require('./validation');

const CANON_PREFIX = `${QR_SCHEME}://${QR_HOST}/`;

/**
 * Build canonical QR payload: hc://resolve/{profile_id}
 * Technical Standards §2.1; Tech Spec §4.5.
 * @param {string} profileId
 * @returns {string}
 */
function buildQrPayload(profileId) {
  if (typeof profileId !== 'string') {
    throw new Error('invalid_profile_id');
  }
  const id = profileId.trim();
  if (!isValidProfileId(id)) {
    throw new Error('invalid_profile_id');
  }
  const s = `${CANON_PREFIX}${id}`;
  if (s.length > QR_PAYLOAD_MAX_LENGTH) {
    throw new Error('qr_payload_too_long');
  }
  return s;
}

/**
 * Parse a QR payload string. Trims whitespace, decodes percent-encoding in the profile_id
 * segment (RFC 3986), then validates. Rejects query strings, fragments, and non-canonical forms.
 * Scheme and host are matched case-insensitively; profile_id is case-sensitive (base58).
 * @param {string} raw
 * @returns {{ profileId: string } | null}
 */
function parseQrPayload(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > QR_PAYLOAD_MAX_LENGTH) return null;
  if (trimmed.includes('?') || trimmed.includes('&') || trimmed.includes('#')) return null;
  if (trimmed.length < CANON_PREFIX.length + 1) return null;

  for (let i = 0; i < CANON_PREFIX.length; i++) {
    if (trimmed[i].toLowerCase() !== CANON_PREFIX[i]) return null;
  }

  let encodedSuffix = trimmed.slice(CANON_PREFIX.length);
  let profileId;
  try {
    profileId = decodeURIComponent(encodedSuffix);
  } catch {
    return null;
  }

  if (!profileId) return null;
  if (/[/?#&]/.test(profileId)) return null;
  if (!isValidProfileId(profileId)) return null;
  return { profileId };
}

module.exports = {
  buildQrPayload,
  parseQrPayload,
};
