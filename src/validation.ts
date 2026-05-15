import bs58Import from 'bs58';

const bs58 = (bs58Import as { default?: typeof bs58Import }).default ?? bs58Import;

export const HANDLE_REGEX = /^[a-z][a-z0-9_]{2,31}$/;

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

export function handleIssue(handle: unknown): 'format' | 'reserved' | null {
  if (typeof handle !== 'string') return 'format';
  if (!HANDLE_REGEX.test(handle)) return 'format';
  if (RESERVED.has(handle.toLowerCase())) return 'reserved';
  return null;
}

export function sanitizeManifesto(line: unknown): string {
  if (typeof line !== 'string') return '';
  const stripped = line.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  return stripped.trim().slice(0, 280);
}

export function manifestoIssue(raw: unknown): 'empty' | 'too_long' | null {
  if (typeof raw !== 'string') return 'empty';
  if (raw.length > 280) return 'too_long';
  const t = raw.trim();
  if (t.length === 0) return 'empty';
  const s = sanitizeManifesto(raw);
  if (s.length < 1) return 'empty';
  if (s.length > 280) return 'too_long';
  return null;
}

export function isValidPublicKeyBase58(publicKey: unknown): boolean {
  if (typeof publicKey !== 'string' || publicKey.length < 40 || publicKey.length > 48) return false;
  try {
    const buf = bs58.decode(publicKey);
    return buf.length === 32;
  } catch {
    return false;
  }
}

export function isValidProfileId(id: unknown): boolean {
  return typeof id === 'string' && BASE58_PROFILE_ID.test(id);
}

export function encodeBase58(bytes: Uint8Array): string {
  return bs58.encode(bytes);
}
