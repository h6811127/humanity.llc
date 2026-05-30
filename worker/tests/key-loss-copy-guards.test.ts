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
  SETUP_SEATBELT_BLOCK_CONTINUE,
  VIEW_ONLY_CARD_TITLE,
  VIEW_ONLY_LIVE_TAB_LEAD,
  VIEW_ONLY_NO_SESSION_WALLET_EMPTY,
  VIEW_ONLY_NO_SESSION_WALLET_SAVED,
  VIEW_ONLY_RESTORE_LEAD_EMPTY,
  VIEW_ONLY_RESTORE_LEAD_SAVED,
} from "../../site/js/device-ownership-copy-core.mjs";
import { createdHeroTitleForMode } from "../../site/js/created-workspace.mjs";
import {
  viewOnlyNoSessionDetailHtml,
  viewOnlyRestoreLead,
} from "../../site/js/created-view-only-copy-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("key-loss copy guards", () => {
  it("K1/K5: view mode title and no-session detail match workspace + HTML", () => {
    expect(createdHeroTitleForMode("view")).toBe(VIEW_ONLY_CARD_TITLE);
    const html = readFileSync(join(root, "site/created/index.html"), "utf8");
    expect(html).toContain("Ownership not loaded in this tab");
    expect(html).toContain("created-view-restore-panel");
    expect(html).toMatch(/recovery code|encrypted backup/i);
    expect(html).not.toMatch(/Finish create in the tab where you clicked Create/i);
    expect(html).toContain("created-view-live-banner");
    expect(html).toContain("created-view-live-qr-tasks");
    expect(VIEW_ONLY_LIVE_TAB_LEAD).toMatch(/read-only|Read-only/i);
    expect(VIEW_ONLY_NO_SESSION_WALLET_EMPTY).toMatch(/recovery code|encrypted backup/i);
    expect(VIEW_ONLY_NO_SESSION_WALLET_SAVED).toMatch(/Open controls/i);
    expect(viewOnlyNoSessionDetailHtml(0)).toBe(VIEW_ONLY_NO_SESSION_WALLET_EMPTY);
    expect(viewOnlyNoSessionDetailHtml(1)).toBe(VIEW_ONLY_NO_SESSION_WALLET_SAVED);
    expect(viewOnlyRestoreLead(0)).toBe(VIEW_ONLY_RESTORE_LEAD_EMPTY);
    expect(viewOnlyRestoreLead(1)).toBe(VIEW_ONLY_RESTORE_LEAD_SAVED);
    expect(VIEW_ONLY_LIVE_TAB_LEAD).toMatch(/Restore ownership|Manage/i);
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

  it("K7: setup protect gate copy is plain language", () => {
    expect(SETUP_SEATBELT_BLOCK_CONTINUE).toMatch(/recovery code|encrypted backup/i);
    expect(SETUP_SEATBELT_BLOCK_CONTINUE).not.toMatch(/sessionStorage|private_key/i);
    const html = readFileSync(join(root, "site/created/index.html"), "utf8");
    expect(html).toContain('data-setup-step="protect"');
  });
});
