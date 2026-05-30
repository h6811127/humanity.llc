/**
 * P0-7 view-only copy branches (R13).
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md
 */
import { describe, expect, it } from "vitest";

import {
  viewOnlyLiveTabLead,
  viewOnlyLiveTabRestoreLabel,
  viewOnlyLiveTabTitle,
  viewOnlyManageTabLead,
  viewOnlyNoSessionDetailHtml,
  viewOnlyRestoreLead,
  viewOnlyWalletBranch,
} from "../../site/js/created-view-only-copy-core.mjs";
import {
  OWNERSHIP_NOT_IN_TAB_PROMPT,
  RESTORE_CONTROL_IN_THIS_TAB,
  VIEW_ONLY_LIVE_TAB_LEAD,
} from "../../site/js/device-ownership-copy-core.mjs";

describe("created-view-only-copy-core", () => {
  it("branches on wallet signing row count", () => {
    expect(viewOnlyWalletBranch(0)).toBe("wallet_empty");
    expect(viewOnlyWalletBranch(1)).toBe("wallet_saved");
    expect(viewOnlyWalletBranch(3)).toBe("wallet_saved");
  });

  it("wallet empty copy points to backup import, not other tab", () => {
    const detail = viewOnlyNoSessionDetailHtml(0);
    expect(detail).toMatch(/recovery code|encrypted backup/i);
    expect(detail).not.toMatch(/Finish create|other tab|Save ownership on this device/i);
    expect(viewOnlyRestoreLead(0)).toMatch(/recovery code|encrypted backup/i);
    expect(viewOnlyManageTabLead(0)).toMatch(/restore ownership/i);
  });

  it("Live tab lead is read-only and points to restore or deploy tasks", () => {
    expect(viewOnlyLiveTabLead(0)).toBe(VIEW_ONLY_LIVE_TAB_LEAD);
    expect(VIEW_ONLY_LIVE_TAB_LEAD).toMatch(/read-only|Read-only/i);
    expect(VIEW_ONLY_LIVE_TAB_LEAD).toMatch(/Manage|restore/i);
  });

  it("Live tab banner uses P1-2 restore prompt when wallet saved (step 2)", () => {
    expect(viewOnlyLiveTabTitle(1)).toBe(OWNERSHIP_NOT_IN_TAB_PROMPT);
    expect(viewOnlyLiveTabLead(1)).toMatch(/saved on this device/i);
    expect(viewOnlyLiveTabRestoreLabel(1)).toBe(RESTORE_CONTROL_IN_THIS_TAB);
    expect(viewOnlyLiveTabTitle(0)).toBe("View only in this tab");
    expect(viewOnlyLiveTabRestoreLabel(0)).toBe("Restore ownership");
  });

  it("wallet saved copy points to Open controls / restore in this tab", () => {
    const detail = viewOnlyNoSessionDetailHtml(2);
    expect(detail).toMatch(/Open controls/i);
    expect(detail).toMatch(/My objects/i);
    expect(detail).not.toMatch(/Finish create|other tab/i);
    expect(viewOnlyRestoreLead(2)).toMatch(/saved on this device/i);
    expect(viewOnlyManageTabLead(2)).toMatch(/Open controls/i);
  });
});
