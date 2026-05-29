import { describe, expect, it } from "vitest";

import {
  pickWalletEntryForRestoreInTab,
  restoreInTabPlan,
} from "../../site/js/device-ownership-restore-in-tab-core.mjs";

describe("restoreInTabPlan", () => {
  it("opens sole saved card directly", () => {
    expect(restoreInTabPlan(1)).toBe("open_card");
  });

  it("scrolls saved list when multiple signing rows", () => {
    expect(restoreInTabPlan(2)).toBe("scroll_list");
    expect(restoreInTabPlan(0)).toBe("scroll_list");
  });
});

describe("pickWalletEntryForRestoreInTab", () => {
  const entries = [
    { profile_id: "a", owner_private_key_b58: "k1" },
    { profile_id: "b", owner_private_key_b58: "k2" },
  ];

  it("prefers default vouch profile when set", () => {
    expect(pickWalletEntryForRestoreInTab(entries, "b")?.profile_id).toBe("b");
  });

  it("falls back to first signing row", () => {
    expect(pickWalletEntryForRestoreInTab(entries, null)?.profile_id).toBe("a");
  });
});
