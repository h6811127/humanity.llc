/**
 * P0-2 sync auto-save policy (R3).
 * @see docs/SAFARI_KEYS_CUSTODY.md
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  applySyncAutoSaveResult,
  shouldSyncAutoSaveBeforeCreateNavigate,
  shouldSyncAutoSaveOnCreatedLoad,
} from "../../site/js/created-device-save-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("created-device-save-core", () => {
  it("requires signing keys and auto-save for sync save on /created/ load", () => {
    expect(
      shouldSyncAutoSaveOnCreatedLoad({
        autoSaveEnabled: true,
        hasSigningKeys: true,
      })
    ).toBe(true);
    expect(
      shouldSyncAutoSaveOnCreatedLoad({
        autoSaveEnabled: false,
        hasSigningKeys: true,
      })
    ).toBe(false);
    expect(
      shouldSyncAutoSaveOnCreatedLoad({
        autoSaveEnabled: true,
        hasSigningKeys: false,
      })
    ).toBe(false);
  });

  it("requires signing session before create navigation save", () => {
    expect(
      shouldSyncAutoSaveBeforeCreateNavigate({
        autoSaveEnabled: true,
        session: {
          profile_id: "abc",
          owner_private_key_b58: "priv",
        },
      })
    ).toBe(true);
    expect(
      shouldSyncAutoSaveBeforeCreateNavigate({
        autoSaveEnabled: true,
        session: { profile_id: "abc" },
      })
    ).toBe(false);
    expect(
      shouldSyncAutoSaveBeforeCreateNavigate({
        autoSaveEnabled: false,
        session: {
          profile_id: "abc",
          owner_private_key_b58: "priv",
        },
      })
    ).toBe(false);
  });

  it("marks or clears auto-save failure from save result", () => {
    const calls = { failed: [] as string[], cleared: [] as string[] };
    applySyncAutoSaveResult(
      { profile_id: "pid1" },
      { error: "Quota exceeded" },
      {
        markFailed: (id) => calls.failed.push(id),
        clearFailed: (id) => calls.cleared.push(id),
      }
    );
    expect(calls.failed).toEqual(["pid1"]);
    applySyncAutoSaveResult(
      { profile_id: "pid1" },
      { ok: true },
      {
        markFailed: (id) => calls.failed.push(id),
        clearFailed: (id) => calls.cleared.push(id),
      }
    );
    expect(calls.cleared).toEqual(["pid1"]);
  });
});

describe("create-card P0-2 wiring", () => {
  it("sync-saves to wallet before navigating to /created/", () => {
    const src = readFileSync(join(root, "site/js/create-card.mjs"), "utf8");
    expect(src).toContain("shouldSyncAutoSaveBeforeCreateNavigate");
    expect(src).toContain("saveSessionToWalletWithCustody");
    expect(src).toMatch(/saveSessionToWalletWithCustody\([\s\S]*location\.replace/);
    expect(src).not.toContain("queueMicrotask");
  });

  it("pre-navigate autosave uses full_keys so WebAuthn does not block redirect", () => {
    const src = readFileSync(join(root, "site/js/create-card.mjs"), "utf8");
    expect(src).toContain("autosave:before-navigate:start");
    expect(src).toMatch(
      /shouldSyncAutoSaveBeforeCreateNavigate[\s\S]*saveSessionToWalletWithCustody\([\s\S]*custodyMode:\s*CUSTODY_MODE_FULL_KEYS/
    );
    expect(src).not.toMatch(
      /shouldSyncAutoSaveBeforeCreateNavigate[\s\S]*custodyMode:\s*session\.custody_mode/
    );
  });

  it("created-device-save does not defer auto-save to microtask", () => {
    const src = readFileSync(join(root, "site/js/created-device-save.mjs"), "utf8");
    expect(src).toContain("shouldSyncAutoSaveOnCreatedLoad");
    expect(src).not.toContain("queueMicrotask");
  });
});
