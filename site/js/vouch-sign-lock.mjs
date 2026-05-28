/**
 * Optional unlock gate before vouch signing (PIN or device WebAuthn).
 * @see docs/VOUCH_THREAT_MODEL.md (V-04) and docs/VOUCH_READY_KEYS_DESIGN.md
 */

export const VOUCH_SIGN_LOCKS_KEY = "hc_vouch_sign_locks";
const UNLOCK_SESSION_KEY = "hc_vouch_sign_unlocked";
const PBKDF2_ITERATIONS = 120_000;

/** @typedef {{ mode: "pin"; salt: string; hash: string; iterations: number }} PinLockRecord */
/** @typedef {{ mode: "webauthn"; credential_id: string }} WebAuthnLockRecord */
/** @typedef {PinLockRecord | WebAuthnLockRecord} SignLockRecord */

function loadLocksMap() {
  try {
    const raw = localStorage.getItem(VOUCH_SIGN_LOCKS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocksMap(map) {
  localStorage.setItem(VOUCH_SIGN_LOCKS_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event("hc-vouch-sign-lock-changed"));
}

function loadUnlockMap() {
  try {
    const raw = sessionStorage.getItem(UNLOCK_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveUnlockMap(map) {
  sessionStorage.setItem(UNLOCK_SESSION_KEY, JSON.stringify(map));
}

function rpId() {
  const host = typeof location !== "undefined" ? location.hostname : "humanity.llc";
  if (host === "localhost" || host === "127.0.0.1") return host;
  if (host.endsWith(".humanity.llc")) return "humanity.llc";
  return host;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return base64ToBytes(padded + pad);
}

function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function isWebAuthnUnlockAvailable() {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential === "function" &&
    typeof navigator?.credentials?.create === "function"
  );
}

/** @param {string} profileId */
export function getSignLock(profileId) {
  if (!profileId) return null;
  const record = loadLocksMap()[profileId];
  if (!record || typeof record !== "object") return null;
  if (record.mode === "pin" || record.mode === "webauthn") return record;
  return null;
}

/** @param {string} profileId */
export function isSignLockEnabled(profileId) {
  return !!getSignLock(profileId);
}

/** @param {string} profileId */
export function isSignUnlocked(profileId) {
  if (!profileId) return false;
  if (!isSignLockEnabled(profileId)) return true;
  return loadUnlockMap()[profileId] === "1";
}

/** @param {string} profileId */
export function markSignUnlocked(profileId) {
  if (!profileId) return;
  const map = loadUnlockMap();
  map[profileId] = "1";
  saveUnlockMap(map);
}

/** @param {string} [profileId] */
export function clearSignUnlock(profileId) {
  if (!profileId) {
    sessionStorage.removeItem(UNLOCK_SESSION_KEY);
    return;
  }
  const map = loadUnlockMap();
  delete map[profileId];
  saveUnlockMap(map);
}

/** @param {string} profileId */
export function clearSignLock(profileId) {
  if (!profileId) return;
  const map = loadLocksMap();
  delete map[profileId];
  saveLocksMap(map);
  clearSignUnlock(profileId);
}

async function hashPin(pin, saltBytes) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}

/**
 * @param {string} profileId
 * @param {string} pin
 */
export async function setPinSignLock(profileId, pin) {
  const cleaned = pin.trim();
  if (!profileId) return { error: "Missing profile id." };
  if (cleaned.length < 4 || cleaned.length > 32) {
    return { error: "PIN must be 4–32 characters." };
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await hashPin(cleaned, salt);
  const map = loadLocksMap();
  map[profileId] = {
    mode: "pin",
    salt: bytesToBase64(salt),
    hash,
    iterations: PBKDF2_ITERATIONS,
  };
  saveLocksMap(map);
  clearSignUnlock(profileId);
  return { ok: true };
}

/**
 * @param {string} profileId
 * @param {string} pin
 */
export async function verifyPinSignLock(profileId, pin) {
  const record = getSignLock(profileId);
  if (!record || record.mode !== "pin") {
    return { error: "No PIN lock is configured for this card." };
  }
  const attempt = await hashPin(pin.trim(), base64ToBytes(record.salt));
  if (attempt !== record.hash) {
    return { error: "Incorrect PIN." };
  }
  markSignUnlocked(profileId);
  return { ok: true };
}

/**
 * @param {string} profileId
 * @param {string} [label]
 */
export async function setWebAuthnSignLock(profileId, label = "Vouch signing") {
  if (!profileId) return { error: "Missing profile id." };
  if (!isWebAuthnUnlockAvailable()) {
    return { error: "Device unlock is not available in this browser." };
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = new TextEncoder().encode(profileId.slice(0, 64));
  const credential = /** @type {PublicKeyCredential | null} */ (
    await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Humanity Card", id: rpId() },
        user: {
          id: userId,
          name: profileId,
          displayName: label.slice(0, 64),
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        authenticatorSelection: {
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60_000,
      },
    })
  );

  if (!credential?.rawId) {
    return { error: "Device unlock was not created." };
  }

  const map = loadLocksMap();
  map[profileId] = {
    mode: "webauthn",
    credential_id: bytesToBase64Url(new Uint8Array(credential.rawId)),
  };
  saveLocksMap(map);
  clearSignUnlock(profileId);
  return { ok: true };
}

/** @param {string} profileId */
export async function verifyWebAuthnSignLock(profileId) {
  const record = getSignLock(profileId);
  if (!record || record.mode !== "webauthn") {
    return { error: "No device unlock is configured for this card." };
  }
  if (!isWebAuthnUnlockAvailable()) {
    return { error: "Device unlock is not available in this browser." };
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        {
          type: "public-key",
          id: base64UrlToBytes(record.credential_id),
        },
      ],
      userVerification: "required",
      timeout: 60_000,
    },
  });

  if (!assertion) {
    return { error: "Device unlock was cancelled." };
  }

  markSignUnlocked(profileId);
  return { ok: true };
}

/** @param {string} profileId */
export async function unlockSignLock(profileId) {
  const record = getSignLock(profileId);
  if (!record) return { ok: true };
  if (record.mode === "webauthn") return verifyWebAuthnSignLock(profileId);
  return { error: "PIN required." };
}
