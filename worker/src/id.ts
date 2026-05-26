import { BASE58_ALPHABET, PROFILE_ID_LENGTH_NEW } from "./crypto/constants";

export function randomBase58(length: number): string {
  const alphabet = BASE58_ALPHABET;
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

/** 24-char profile_id per Technical Standards §4.2. */
export function generateProfileId(): string {
  return randomBase58(PROFILE_ID_LENGTH_NEW);
}

/** qr_ + 16 base58 chars. */
export function generateQrId(): string {
  return `qr_${randomBase58(16)}`;
}

/** lc_ + opaque base58 challenge id for short-lived live control proof. */
export function generateLiveControlChallengeId(): string {
  return `lc_${randomBase58(18)}`;
}

/** Opaque scanner session reference; not a user identifier. */
export function generateVerifierSessionId(): string {
  return `vs_${randomBase58(18)}`;
}

export function generateStewardPushConnectionId(): string {
  return `conn_${randomBase58(16)}`;
}
