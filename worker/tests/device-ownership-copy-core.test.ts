import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  BACKUP_INVALID_OWNERSHIP,
  DEFAULT_ATTESTATION_ELIGIBILITY_ALERT,
  DEFAULT_FOR_ATTESTATION_ON_SCAN,
  DEVELOPER_EXPORT_SUBTITLE,
  EXPORT_FOR_DEVELOPERS,
  FOUNDING_BUY_DOES_NOT_VERIFY,
  FOUNDING_STICKER_NO_CALENDAR_EXPIRY,
  IMPORT_OWNERSHIP_LOADED_TAB,
  LIVE_CONTROL_ASK_LABEL,
  LIVE_CONTROL_PROOF_EXPIRED_STATUS,
  LIVE_CONTROL_REQUEST_EXPIRED_STATUS,
  LIVE_CONTROL_SCANNER_LEAD,
  LIVE_CONTROL_SUCCESS_COPY,
  SCAN_LIMITS_DISCLOSURE_TITLE,
  LOAD_CONTROL_IN_TAB_FIRST,
  OWNERSHIP_NOT_LOADED_TAB,
  SET_DEFAULT_FOR_ATTESTATION,
  TAKE_CONTROL_HERE,
  UNLOCK_CONTROL_FIRST,
  VOUCH_EXPLAINER_INITIAL_COPY,
  inboxAriaManagingInOtherTab,
  inboxAriaOrphanManagingOtherTab,
  inboxAriaOwnershipNotSaved,
  otherTabSwitchConfirmMessage,
  savedObjectsAttestationNudge,
} from "../../site/js/device-ownership-copy-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("device-ownership-copy-core", () => {
  it("exports Layer 2 custody strings without signing-key jargon", () => {
    for (const line of [
      OWNERSHIP_NOT_LOADED_TAB,
      LOAD_CONTROL_IN_TAB_FIRST,
      IMPORT_OWNERSHIP_LOADED_TAB,
      UNLOCK_CONTROL_FIRST,
      BACKUP_INVALID_OWNERSHIP,
      DEFAULT_FOR_ATTESTATION_ON_SCAN,
      SET_DEFAULT_FOR_ATTESTATION,
      TAKE_CONTROL_HERE,
    ]) {
      expect(line.toLowerCase()).not.toContain("signing key");
      expect(line.toLowerCase()).not.toMatch(/\bed25519\b/);
    }
  });

  it("formats cross-tab switch confirm in ownership terms", () => {
    const msg = otherTabSwitchConfirmMessage("aaaaaaaaaaaa", "bbbbbbbbbbbb");
    expect(msg).toContain("control active");
    expect(msg).toContain("aaaaaaaaaaaa");
    expect(msg).toContain("bbbbbbbbbbbb");
    expect(msg).not.toContain("signing keys");
  });

  it("formats saved-objects attestation nudge", () => {
    expect(savedObjectsAttestationNudge(3)).toBe(
      "3 saved objects · pick one for scan auto-load"
    );
  });

  it("exports developer export and attestation menu strings", () => {
    expect(EXPORT_FOR_DEVELOPERS).toBe("Export for developers");
    expect(DEVELOPER_EXPORT_SUBTITLE).toContain("Public key");
    expect(DEFAULT_ATTESTATION_ELIGIBILITY_ALERT).toContain("default for attestation");
  });
  it("formats inbox aria helpers in ownership terms", () => {
    expect(inboxAriaManagingInOtherTab(1, "Demo")).toBe("managing in 1 other tab (Demo)");
    expect(inboxAriaManagingInOtherTab(2)).toBe("managing in 2 other tabs");
    expect(inboxAriaOwnershipNotSaved("This tab")).toBe(
      "ownership not saved on device (This tab)"
    );
    expect(inboxAriaOrphanManagingOtherTab("Demo")).toBe(
      "still managing in another tab (Demo)"
    );
  });

  it("exports scan comprehension strings without signing-key jargon", () => {
    for (const line of [
      LIVE_CONTROL_SCANNER_LEAD,
      LIVE_CONTROL_SUCCESS_COPY,
      LIVE_CONTROL_ASK_LABEL,
      LIVE_CONTROL_REQUEST_EXPIRED_STATUS,
      LIVE_CONTROL_PROOF_EXPIRED_STATUS,
      SCAN_LIMITS_DISCLOSURE_TITLE,
      FOUNDING_BUY_DOES_NOT_VERIFY,
      FOUNDING_STICKER_NO_CALENDAR_EXPIRY,
      VOUCH_EXPLAINER_INITIAL_COPY,
    ]) {
      expect(line.toLowerCase()).not.toContain("signing key");
      expect(line.toLowerCase()).not.toContain("private key");
    }
    expect(LIVE_CONTROL_SCANNER_LEAD).toContain("control");
    expect(LIVE_CONTROL_SUCCESS_COPY).toContain("does not prove legal identity");
  });
});

describe("D7 default UI modules avoid Layer 1 hero copy", () => {
  const modules = [
    "site/js/vouch-issue.mjs",
    "site/js/device-steward-session.mjs",
    "site/js/device-hub-import.mjs",
    "site/js/vouch-revoke.mjs",
    "site/js/device-dot-state-core.mjs",
    "site/js/device-hub-keys-custody-core.mjs",
    "worker/src/resolver/scan-html.ts",
  ];

  for (const rel of modules) {
    it(`${rel} has no Ed25519 signing-key explainer in user strings`, () => {
      const src = readFileSync(join(root, rel), "utf8");
      expect(src).not.toContain("Ed25519 signing key in this tab");
      expect(src).not.toContain("Load signing keys in this tab first");
      expect(src).not.toContain("Unlock your signing key above first");
      expect(src).not.toContain("Imported and loaded signing keys in this tab");
    });
  }
});
