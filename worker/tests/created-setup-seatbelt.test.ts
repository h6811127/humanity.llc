import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { rootHasChildObjectBackupSeatbelt } from "../../site/js/child-object-backup-gate-core.mjs";
import {
  SETUP_SEATBELT_BLOCK_CONTINUE,
  SETUP_SEATBELT_PANEL_LEAD,
} from "../../site/js/device-ownership-copy-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("setup protect step seatbelt (K7)", () => {
  it("uses rootHasChildObjectBackupSeatbelt markers", () => {
    expect(rootHasChildObjectBackupSeatbelt({ recovery_key_acknowledged: true })).toBe(true);
    expect(
      rootHasChildObjectBackupSeatbelt({ key_backup_exported_at: "2026-05-28T12:00:00.000Z" })
    ).toBe(true);
    expect(rootHasChildObjectBackupSeatbelt({})).toBe(false);
  });

  it("exposes seatbelt copy and protect panel markup", () => {
    expect(SETUP_SEATBELT_PANEL_LEAD).toMatch(/recovery path/i);
    expect(SETUP_SEATBELT_BLOCK_CONTINUE).toMatch(/recovery code|encrypted backup/i);
    const html = readFileSync(join(root, "site/created/index.html"), "utf8");
    expect(html).toMatch(/Five steps/i);
    expect(html).toContain('data-setup-panel="protect"');
    expect(html).toContain("created-setup-export-backup-form");
  });
});
