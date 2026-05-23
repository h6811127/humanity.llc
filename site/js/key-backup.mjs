/**
 * Encrypted owner key backup (M5.5.1) — browser only, never uploaded by default.
 * Crypto parity: worker/src/crypto/key-backup.ts (tests).
 * @see docs/M5_5_OWNER_KEY_PORTABILITY.md
 */
import { decodeBase58, encodeBase58 } from "./hc-sign.mjs";

export const BACKUP_TYPE = "humanity_card_key_backup";
export const BACKUP_VERSION = "1.0";
export const MIN_PASSPHRASE_LENGTH = 12;
export const PBKDF2_ITERATIONS = 310_000;

function bytesToB58(bytes) {
  return encodeBase58(bytes);
}

function b58ToBytes(str) {
  return decodeBase58(str);
}

function assertPassphrase(passphrase) {
  if (typeof passphrase !== "string" || passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(
      `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`
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
  assertPassphrase(passphrase);
  if (!profileId || !publicKeyBase58 || !privateKeyBase58) {
    throw new Error("Missing profile or key material.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveAesKey(passphrase, salt);
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
  assertPassphrase(passphrase);

  const salt = b58ToBytes(backup.kdf.salt_b58);
  const iv = b58ToBytes(backup.cipher.iv_b58);
  const ciphertext = b58ToBytes(backup.cipher.ciphertext_b58);
  const aesKey = await deriveAesKey(passphrase, salt);

  let plain;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      ciphertext
    );
  } catch {
    throw new Error("Wrong passphrase or corrupted backup file.");
  }

  const privateKeyBase58 = bytesToB58(new Uint8Array(plain));
  if (backup.public_key && privateKeyBase58.length < 40) {
    throw new Error("Decrypted key looks invalid.");
  }

  return {
    profileId: backup.profile_id,
    publicKeyBase58: backup.public_key,
    privateKeyBase58,
  };
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
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }
  validateBackupShape(parsed);
  return parsed;
}
