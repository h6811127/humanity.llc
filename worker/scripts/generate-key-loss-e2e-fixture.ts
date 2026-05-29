/**
 * Writes encrypted backup fixture for Playwright key-loss sad-path (K2).
 * Run: npm run e2e:generate-key-loss-fixture
 * @see docs/KEY_LOSS_SAD_PATH_MATRIX.md
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { encodeBase58 } from "../src/crypto/base58";
import { createEncryptedBackup } from "../src/crypto/key-backup";
import { getTestKeypair } from "../src/crypto/ed25519";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "e2e/fixtures");
const outPath = join(outDir, "key-loss-e2e.hcbackup.json");

export const KEY_LOSS_E2E_PROFILE_ID = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
export const KEY_LOSS_E2E_BACKUP_PASSPHRASE = "correct-horse-battery-staple";

async function main() {
  const { privateKey, publicKeyBase58 } = await getTestKeypair();
  const backup = await createEncryptedBackup({
    profileId: KEY_LOSS_E2E_PROFILE_ID,
    publicKeyBase58,
    privateKeyBase58: encodeBase58(privateKey),
    passphrase: KEY_LOSS_E2E_BACKUP_PASSPHRASE,
  });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(backup, null, 2));
  console.log(`Wrote ${outPath}`);
}

void main();
