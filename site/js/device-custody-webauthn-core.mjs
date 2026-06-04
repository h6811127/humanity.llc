/**
 * WebAuthn + PRF helpers for device_unlock (WS-CUSTODY C1).
 */

import { WRAPPED_OWNER_KEY_VERSION } from "./device-custody-mode-core.mjs";

export function resolveDeviceUnlockRpId(hostname) {
  const host = String(hostname ?? "humanity.llc");
  if (host === "localhost" || host === "127.0.0.1") return host;
  if (host.endsWith(".humanity.llc")) return "humanity.llc";
  return host;
}

export function deviceUnlockRpId() {
  const host = typeof location !== "undefined" ? location.hostname : "humanity.llc";
  return resolveDeviceUnlockRpId(host);
}

export function isDeviceUnlockWebAuthnAvailable() {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential === "function" &&
    typeof navigator?.credentials?.create === "function" &&
    typeof navigator?.credentials?.get === "function"
  );
}

/**
 * @param {string} profileId
 * @param {string} [label]
 */
export function buildDeviceUnlockUser(profileId, label = "Humanity Card") {
  return {
    id: new TextEncoder().encode(String(profileId).slice(0, 64)),
    name: profileId,
    displayName: String(label).slice(0, 64),
  };
}

/**
 * @param {string} profileId
 * @param {Uint8Array} prfSalt
 * @param {string} [label]
 */
export function buildDeviceUnlockCreateOptions(profileId, prfSalt, label) {
  return {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: "Humanity Card", id: deviceUnlockRpId() },
    user: buildDeviceUnlockUser(profileId, label),
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    authenticatorSelection: {
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60_000,
    extensions: {
      prf: {
        eval: {
          first: prfSalt,
        },
      },
    },
  };
}

/**
 * @param {string} credentialIdBase64Url
 * @param {Uint8Array} prfSalt
 */
export function buildDeviceUnlockGetOptions(credentialIdBase64Url, prfSalt) {
  return {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    timeout: 60_000,
    userVerification: "required",
    allowCredentials: [
      {
        type: "public-key",
        id: base64UrlToBytes(credentialIdBase64Url),
      },
    ],
    extensions: {
      prf: {
        eval: {
          first: prfSalt,
        },
      },
    },
  };
}

export function bytesToBase64Url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * @param {PublicKeyCredential} credential
 * @param {Uint8Array} prfSalt
 */
export function wrappedOwnerKeyFromCreateCredential(credential, prfSalt) {
  const ext = credential.getClientExtensionResults?.();
  const prfBytes = ext?.prf?.results?.first;
  if (!(prfBytes instanceof ArrayBuffer) && !(prfBytes instanceof Uint8Array)) {
    return { error: "Device unlock requires passkey PRF support in this browser." };
  }
  const raw = prfBytes instanceof Uint8Array ? prfBytes : new Uint8Array(prfBytes);
  if (raw.byteLength < 32) {
    return { error: "Device unlock PRF output was too short." };
  }
  return {
    ok: true,
    prfSalt,
    credentialId: bytesToBase64Url(new Uint8Array(credential.rawId)),
    prfKeyBytes: raw.slice(0, 32),
    version: WRAPPED_OWNER_KEY_VERSION,
  };
}

/**
 * @param {PublicKeyCredential} credential
 * @param {Uint8Array} prfSalt
 */
export function prfKeyBytesFromGetCredential(credential, prfSalt) {
  void prfSalt;
  const ext = credential.getClientExtensionResults?.();
  const prfBytes = ext?.prf?.results?.first;
  if (!(prfBytes instanceof ArrayBuffer) && !(prfBytes instanceof Uint8Array)) {
    return { error: "Unlock failed — passkey PRF not available." };
  }
  const raw = prfBytes instanceof Uint8Array ? prfBytes : new Uint8Array(prfBytes);
  if (raw.byteLength < 32) {
    return { error: "Unlock failed — invalid PRF output." };
  }
  return { ok: true, prfKeyBytes: raw.slice(0, 32) };
}

/**
 * @param {import("./device-custody-mode-core.mjs").WrappedOwnerKeyV1} wrap
 */
export function parseWrappedOwnerKey(wrap) {
  if (!wrap || typeof wrap !== "object") return null;
  if (wrap.version !== WRAPPED_OWNER_KEY_VERSION) return null;
  if (typeof wrap.credential_id !== "string" || !wrap.credential_id.trim()) return null;
  if (typeof wrap.prf_salt !== "string" || !wrap.prf_salt.trim()) return null;
  if (typeof wrap.iv !== "string" || !wrap.iv.trim()) return null;
  if (typeof wrap.ciphertext !== "string" || !wrap.ciphertext.trim()) return null;
  return wrap;
}
