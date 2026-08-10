import { describe, expect, it } from "vitest";

import {
  BACKUP_TYPE,
  BACKUP_VERSION,
  parseBackupFileText,
} from "../../site/js/key-backup-file-core.mjs";

const VALID_BACKUP = {
  type: BACKUP_TYPE,
  version: BACKUP_VERSION,
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  public_key: "pub_test",
  kdf: { name: "PBKDF2" },
  cipher: { name: "AES-GCM" },
};

describe("key backup import (sad-path S4)", () => {
  it("rejects corrupt JSON backup files", () => {
    expect(() => parseBackupFileText("{not valid json")).toThrow(/not valid JSON/i);
    expect(() => parseBackupFileText('{"type":"wrong"}')).toThrow(
      /Not a Humanity Card key backup/i
    );
    expect(() => parseBackupFileText("{}")).toThrow(/Humanity Card key backup|missing required fields/i);
  });

  it("strips a leading UTF-8 BOM before JSON parse", () => {
    const parsed = parseBackupFileText(`\uFEFF${JSON.stringify(VALID_BACKUP)}`);
    expect(parsed.profile_id).toBe(VALID_BACKUP.profile_id);
    expect(parsed.version).toBe(BACKUP_VERSION);
  });

  it("rejects unsupported versions and incomplete shapes", () => {
    expect(() =>
      parseBackupFileText(JSON.stringify({ ...VALID_BACKUP, version: "2.0" }))
    ).toThrow(/Unsupported backup version: 2\.0/);
    expect(() =>
      parseBackupFileText(
        JSON.stringify({
          type: BACKUP_TYPE,
          version: BACKUP_VERSION,
          profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
        })
      )
    ).toThrow(/missing required fields/i);
  });
});
