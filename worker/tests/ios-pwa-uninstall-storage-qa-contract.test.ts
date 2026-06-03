import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { detectPwaSessionMismatch } from "../../site/js/device-pwa-session-mismatch-core.mjs";
import {
  IOS_PWA_NEVER_REMOVE_ICON_WITHOUT_BACKUP,
  PWA_INSTALL_IOS_DETAIL,
  SAFARI_ITP_NOTICE_DETAIL_STANDALONE,
  HUB_STEWARD_VOUCH_GUIDANCE_DETAIL,
} from "../../site/js/device-ownership-copy-core.mjs";
import {
  IOS_PWA_SAFE_REFRESH_AFFORDANCES,
  IOS_PWA_UNINSTALL_STORAGE_LOSS_MANUAL_STEPS,
  IOS_PWA_UNINSTALL_STORAGE_LOSS_QA_ID,
  IOS_PWA_UNINSTALL_STORAGE_LOSS_SUMMARY,
} from "../../site/js/ios-pwa-uninstall-storage-qa-contract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * QA contract — iOS PWA uninstall deletes app storage (hc_wallet).
 * Full uninstall flow is manual-only (P1-PWA-U); CI documents invariants + product copy.
 */
describe("ios-pwa-uninstall-storage QA contract (P1-PWA-U)", () => {
  it("exports manual QA checklist id and steps", () => {
    expect(IOS_PWA_UNINSTALL_STORAGE_LOSS_QA_ID).toBe("P1-PWA-U");
    expect(IOS_PWA_UNINSTALL_STORAGE_LOSS_SUMMARY.toLowerCase()).toContain("delete");
    expect(IOS_PWA_UNINSTALL_STORAGE_LOSS_MANUAL_STEPS.length).toBeGreaterThanOrEqual(5);
    expect(IOS_PWA_SAFE_REFRESH_AFFORDANCES).toContain("pull-to-refresh");
  });

  it("product copy warns never remove Home Screen icon without backup", () => {
    for (const line of [
      IOS_PWA_NEVER_REMOVE_ICON_WITHOUT_BACKUP,
      PWA_INSTALL_IOS_DETAIL,
      SAFARI_ITP_NOTICE_DETAIL_STANDALONE,
      HUB_STEWARD_VOUCH_GUIDANCE_DETAIL,
    ]) {
      expect(line.toLowerCase()).toMatch(/never remove|do not remove|pull down/);
    }
  });

  it("detectPwaSessionMismatch models empty Safari wallet after PWA signing", () => {
    const mismatch = detectPwaSessionMismatch({
      standalone: false,
      hasTabSigningKeys: false,
      walletSigningKeyCount: 0,
      lastSigningShellMode: "standalone",
      isIosWebKit: true,
    });
    expect(mismatch?.iosEmptyWalletAfterPwa).toBe(true);
  });

  it("PWA_INSTALL.md documents iPhone custody and P1-PWA-U", () => {
    const doc = readFileSync(join(root, "docs/PWA_INSTALL.md"), "utf8");
    expect(doc).toContain("iPhone home screen custody");
    expect(doc).toContain("Never remove the Home Screen icon");
    expect(doc).toContain("P1-PWA-U");
    expect(doc).not.toMatch(
      /PWA and in-browser tabs on the same origin share `localStorage`/i
    );
  });
});
