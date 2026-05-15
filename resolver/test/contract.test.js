const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bs58 = require('bs58').default;

const {
  handleIssue,
  manifestoIssue,
  sanitizeManifesto,
  isValidPublicKeyBase58,
  isValidProfileId,
  generateProfileIdCandidate,
  generateProfileId,
  buildQrPayload,
  parseQrPayload,
  PROFILE_ID_LENGTH,
} = require('../lib/index');

describe('handleIssue', () => {
  it('accepts valid handles', () => {
    assert.equal(handleIssue('abc'), null);
    assert.equal(handleIssue('a_b_c_1'), null);
    assert.equal(handleIssue('z' + '0'.repeat(31)), null);
  });

  it('rejects bad format', () => {
    assert.equal(handleIssue(''), 'format');
    assert.equal(handleIssue('ab'), 'format');
    assert.equal(handleIssue('1abc'), 'format');
    assert.equal(handleIssue('ABCD'), 'format');
    assert.equal(handleIssue('a'.repeat(33)), 'format');
    assert.equal(handleIssue(null), 'format');
  });

  it('rejects reserved handles', () => {
    assert.equal(handleIssue('admin'), 'reserved');
    assert.equal(handleIssue('api'), 'reserved');
    assert.equal(handleIssue('null'), 'reserved');
  });
});

describe('manifestoIssue + sanitizeManifesto', () => {
  it('accepts 1–280 chars after trim and tag strip', () => {
    assert.equal(manifestoIssue('Hello'), null);
    assert.equal(manifestoIssue(' ' + 'x'.repeat(280)), null);
    assert.equal(sanitizeManifesto('<p>Hi</p>'), 'Hi');
  });

  it('rejects empty and too long', () => {
    assert.equal(manifestoIssue(''), 'empty');
    assert.equal(manifestoIssue('   '), 'empty');
    assert.equal(manifestoIssue('x'.repeat(281)), 'too_long');
    assert.equal(manifestoIssue(null), 'empty');
  });
});

describe('isValidPublicKeyBase58', () => {
  it('accepts 32-byte keys as base58', () => {
    const pk = crypto.randomBytes(32);
    const encoded = bs58.encode(pk);
    assert.equal(isValidPublicKeyBase58(encoded), true);
  });

  it('rejects wrong length after decode', () => {
    assert.equal(isValidPublicKeyBase58(bs58.encode(crypto.randomBytes(31))), false);
    assert.equal(isValidPublicKeyBase58(bs58.encode(crypto.randomBytes(33))), false);
  });

  it('rejects invalid base58', () => {
    assert.equal(isValidPublicKeyBase58('!!!'), false);
    assert.equal(isValidPublicKeyBase58(''), false);
  });
});

describe('isValidProfileId', () => {
  it('requires exactly 20 base58 chars', () => {
    assert.equal(isValidProfileId('1'.repeat(20)), true);
    assert.equal(isValidProfileId('0'.repeat(20)), false);
    assert.equal(isValidProfileId('O'.repeat(20)), false);
    assert.equal(isValidProfileId('l'.repeat(20)), false);
    assert.equal(isValidProfileId('1'.repeat(19)), false);
    assert.equal(isValidProfileId('1'.repeat(21)), false);
  });
});

describe('generateProfileIdCandidate', () => {
  it('returns a valid unique-looking id', () => {
    const a = generateProfileIdCandidate();
    const b = generateProfileIdCandidate();
    assert.equal(a.length, PROFILE_ID_LENGTH);
    assert.equal(isValidProfileId(a), true);
    assert.notEqual(a, b);
  });
});

describe('generateProfileId (collision handling)', () => {
  it('retries when isTaken returns true', () => {
    let n = 0;
    const id = generateProfileId(() => {
      n++;
      return n < 3;
    });
    assert.equal(isValidProfileId(id), true);
    assert.ok(n >= 3);
  });
});

describe('buildQrPayload / parseQrPayload', () => {
  const id = '7'.repeat(20);

  it('round-trips canonical payload', () => {
    const payload = buildQrPayload(id);
    assert.equal(payload, `hc://resolve/${id}`);
    assert.deepEqual(parseQrPayload(payload), { profileId: id });
  });

  it('accepts case-insensitive scheme/host', () => {
    assert.deepEqual(parseQrPayload(`HC://RESOLVE/${id}`), { profileId: id });
  });

  it('trims surrounding whitespace before parsing', () => {
    assert.deepEqual(parseQrPayload(` \t hc://resolve/${id} \n`), { profileId: id });
  });

  it('accepts percent-encoded ASCII profile_id (RFC 3986)', () => {
    const encoded = [...id].map((c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`).join('');
    assert.deepEqual(parseQrPayload(`hc://resolve/${encoded}`), { profileId: id });
  });

  it('rejects malformed percent-encoding', () => {
    assert.equal(parseQrPayload(`hc://resolve/${id}%`), null);
    assert.equal(parseQrPayload(`hc://resolve/%ZZ`), null);
  });

  it('rejects decoded smuggling of reserved delimiters', () => {
    assert.equal(parseQrPayload(`hc://resolve/${encodeURIComponent(`${id}?x`)}`), null);
  });

  it('rejects prohibited URL parts (Technical Standards §2.3)', () => {
    assert.equal(parseQrPayload(`hc://resolve/${id}?utm=1`), null);
    assert.equal(parseQrPayload(`hc://resolve/${id}#x`), null);
  });

  it('throws buildQrPayload on bad id', () => {
    assert.throws(() => buildQrPayload('bad'), /invalid_profile_id/);
  });

  it('buildQrPayload trims profile_id', () => {
    assert.equal(buildQrPayload(`  ${id}  `), `hc://resolve/${id}`);
  });
});
