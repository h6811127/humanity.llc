/**
 * Key-loss copy guards (P1 sad-path audit).
 *
 * @see docs/KEY_LOSS_SAD_PATH_MATRIX.md
 * @see docs/PRODUCT_LANGUAGE_STRATEGY.md § Errors and sad paths
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  BACKUP_WRONG_PASSPHRASE,
  OWNERSHIP_NOT_LOADED_TAB,
  VIEW_ONLY_CARD_TITLE,
  VIEW_ONLY_NO_SESSION_DETAIL,
} from "../../site/js/device-ownership-copy-core.mjs";
import { createdHeroTitleForMode } from "../../site/js/created-workspace.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("key-loss copy guards", () => {
  it("K1/K5: view mode title and no-session detail match workspace + HTML", () => {
    expect(createdHeroTitleForMode("view")).toBe(VIEW_ONLY_CARD_TITLE);
    const html = readFileSync(join(root, "site/created/index.html"), "utf8");
    expect(html).toContain("Ownership not loaded in this tab");
    expect(html).toContain("created-view-restore-panel");
    expect(VIEW_ONLY_NO_SESSION_DETAIL).toMatch(/Restore ownership/i);
    expect(VIEW_ONLY_NO_SESSION_DETAIL).toMatch(/recovery code|encrypted backup/i);
  });

  it("K2: wrong passphrase copy is plain language", () => {
    expect(BACKUP_WRONG_PASSPHRASE).toMatch(/Wrong passphrase/i);
    expect(BACKUP_WRONG_PASSPHRASE).toMatch(/password manager/i);
    expect(BACKUP_WRONG_PASSPHRASE).not.toMatch(/INVALID_|decrypt failed/i);
  });

  it("K6: ownership-not-loaded string is plain language", () => {
    expect(OWNERSHIP_NOT_LOADED_TAB).toMatch(/Ownership not loaded/i);
    expect(OWNERSHIP_NOT_LOADED_TAB).not.toMatch(/sessionStorage|private_key/i);
  });
});
