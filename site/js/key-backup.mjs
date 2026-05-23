/**
 * Encrypted owner key backup (M5.5.1) — browser only, never uploaded by default.
 * Crypto parity: worker/src/crypto/key-backup.ts (tests).
 * @see docs/M5_5_OWNER_KEY_PORTABILITY.md
 */
import * as ed from "https://esm.sh/@noble/ed25519@2.3.0";
import { decodeBase58, encodeBase58 } from "./hc-sign.mjs";

export const BACKUP_TYPE = "humanity_card_key_backup";
export const BACKUP_VERSION = "1.0";
export const MIN_PASSPHRASE_LENGTH = 12;
export const PBKDF2_ITERATIONS = 310_000;

/** Trim + normalize (password managers / iOS sometimes add odd spaces). */
export function normalizePassphrase(passphrase) {
  if (typeof passphrase !== "string") return "";
  return passphrase.normalize("NFKC").trim();
}

function bytesToB58(bytes) {
  return encodeBase58(bytes);
}

function b58ToBytes(str) {
  return decodeBase58(str);
}

function assertPassphrase(passphrase) {
  const p = normalizePassphrase(passphrase);
  if (p.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(
      `PASSPHRASE_TOO_SHORT:${p.length}`
    );
  }
  return p;
}

async function verifyDecryptedKey(privateKeyBase58, expectedPublicKeyBase58) {
  const privateKey = b58ToBytes(privateKeyBase58);
  if (privateKey.length !== 32) {
    throw new Error(
      "This backup file does not contain a valid signing key. Re-download from /created/ after create."
    );
  }
  const derivedPub = encodeBase58(await ed.getPublicKeyAsync(privateKey));
  if (derivedPub !== expectedPublicKeyBase58) {
    throw new Error(
      "Backup opened but the key does not match this card. Check the file and profile link."
    );
  }
}

async function deriveAesKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * @param {{ profileId: string, publicKeyBase58: string, privateKeyBase58: string, passphrase: string }} opts
 */
export async function createEncryptedBackup({
  profileId,
  publicKeyBase58,
  privateKeyBase58,
  passphrase,
}) {
  const pass = assertPassphrase(passphrase);
  if (!profileId || !publicKeyBase58 || !privateKeyBase58) {
    throw new Error("Missing profile or key material.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveAesKey(pass, salt);
  const plaintext = b58ToBytes(privateKeyBase58);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    plaintext
  );

  return {
    type: BACKUP_TYPE,
    version: BACKUP_VERSION,
    created_at: new Date().toISOString(),
    profile_id: profileId,
    public_key: publicKeyBase58,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: PBKDF2_ITERATIONS,
      salt_b58: bytesToB58(salt),
    },
    cipher: {
      name: "AES-GCM",
      iv_b58: bytesToB58(iv),
      ciphertext_b58: bytesToB58(new Uint8Array(ciphertext)),
    },
  };
}

function validateBackupShape(backup) {
  if (!backup || typeof backup !== "object") {
    throw new Error("Invalid backup file.");
  }
  if (backup.type !== BACKUP_TYPE) {
    throw new Error("Not a Humanity Card key backup file.");
  }
  if (backup.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${backup.version}`);
  }
  if (!backup.profile_id || !backup.public_key || !backup.kdf || !backup.cipher) {
    throw new Error("Backup file is missing required fields.");
  }
}

/**
 * @returns {{ profileId: string, publicKeyBase58: string, privateKeyBase58: string }}
 */
export async function decryptBackup(backup, passphrase) {
  validateBackupShape(backup);
  const pass = assertPassphrase(passphrase);

  const salt = b58ToBytes(backup.kdf.salt_b58);
  const iv = b58ToBytes(backup.cipher.iv_b58);
  const ciphertext = b58ToBytes(backup.cipher.ciphertext_b58);
  const aesKey = await deriveAesKey(pass, salt);

  let plain;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      ciphertext
    );
  } catch {
    throw new Error(
      "Wrong passphrase. Type it by hand or re-pick the saved entry in your password manager (iPhone Passwords / Android)."
    );
  }

  const privateKeyBase58 = bytesToB58(new Uint8Array(plain));
  await verifyDecryptedKey(privateKeyBase58, backup.public_key);

  return {
    profileId: backup.profile_id,
    publicKeyBase58: backup.public_key,
    privateKeyBase58,
  };
}

/** User-facing message for import validation errors. */
export function importErrorMessage(err) {
  const msg = err?.message || String(err);
  if (msg.startsWith("PASSPHRASE_TOO_SHORT:")) {
    const n = msg.split(":")[1] || "0";
    return `Passphrase is only ${n} characters (need ${MIN_PASSPHRASE_LENGTH}+). Tap the passphrase field and enter it manually if autofill left it empty.`;
  }
  return msg;
}

export function backupFilename(profileId) {
  const short = String(profileId).slice(0, 8);
  return `humanity-card-${short}.hcbackup.json`;
}

export function downloadBackupFile(backup) {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFilename(backup.profile_id);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function readBackupFile(file) {
  const text = (await file.text()).replace(/^\uFEFF/, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }
  validateBackupShape(parsed);
  return parsed;
}
