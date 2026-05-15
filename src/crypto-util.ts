export async function sha256HexUtf8(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomBytesBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64;
}

/** Constant-time compare of two SHA-256 hex digests (64 lowercase hex chars). */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const n = 64;
  let diff = (a.length ^ n) | (b.length ^ n);
  for (let i = 0; i < n; i++) {
    const ca = i < a.length ? a.charCodeAt(i) | 32 : 0;
    const cb = i < b.length ? b.charCodeAt(i) | 32 : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}
