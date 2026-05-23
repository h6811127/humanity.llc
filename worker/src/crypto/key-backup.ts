/**
 * Encrypted owner key backup (M5.5) — shared logic for tests; keep in sync with site/js/key-backup.mjs.
 */
import { decodeBase58, encodeBase58 } from "./base58";

export const BACKUP_TYPE = "humanity_card_key_backup";
export const BACKUP_VERSION = "1.0";
export const MIN_PASSPHRASE_LENGTH = 12;
export const PBKDF2_ITERATIONS = 310_000;

export interface KeyBackupFile {
  type: string;
  version: string;
  created_at: string;
  profile_id: string;
  public_key: string;
  kdf: {
    name: string;
    hash: string;
    iterations: number;
    salt_b58: string;
  };
  cipher: {
    name: string;
    iv_b58: string;
    ciphertext_b58: string;
  };
}

function assertPassphrase(passphrase: string): void {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(
      `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`
    );
  }
}

async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
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

function validateBackupShape(backup: KeyBackupFile): void {
  if (backup.type !== BACKUP_TYPE) {
    throw new Error("Not a Humanity Card key backup file.");
  }
  if (backup.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${backup.version}`);
  }
}

export async function createEncryptedBackup(params: {
  profileId: string;
  publicKeyBase58: string;
  privateKeyBase58: string;
  passphrase: string;
}): Promise<KeyBackupFile> {
  assertPassphrase(params.passphrase);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveAesKey(params.passphrase, salt);
  const plaintext = decodeBase58(params.privateKeyBase58);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    plaintext
  );
  return {
    type: BACKUP_TYPE,
    version: BACKUP_VERSION,
    created_at: new Date().toISOString(),
    profile_id: params.profileId,
    public_key: params.publicKeyBase58,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: PBKDF2_ITERATIONS,
      salt_b58: encodeBase58(salt),
    },
    cipher: {
      name: "AES-GCM",
      iv_b58: encodeBase58(iv),
      ciphertext_b58: encodeBase58(new Uint8Array(ciphertext)),
    },
  };
}

export async function decryptBackup(
  backup: KeyBackupFile,
  passphrase: string
): Promise<{
  profileId: string;
  publicKeyBase58: string;
  privateKeyBase58: string;
}> {
  validateBackupShape(backup);
  assertPassphrase(passphrase);
  const salt = decodeBase58(backup.kdf.salt_b58);
  const iv = decodeBase58(backup.cipher.iv_b58);
  const ciphertext = decodeBase58(backup.cipher.ciphertext_b58);
  const aesKey = await deriveAesKey(passphrase, salt);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      ciphertext
    );
  } catch {
    throw new Error("Wrong passphrase or corrupted backup file.");
  }
  return {
    profileId: backup.profile_id,
    publicKeyBase58: backup.public_key,
    privateKeyBase58: encodeBase58(new Uint8Array(plain)),
  };
}
