import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("device hub wallet summary hydration", () => {
  const src = readFileSync(join(root, "site/js/device-hub-ui.mjs"), "utf8");

  it("renders collapsed saved rows from wallet summary metadata", () => {
    expect(src).toContain("loadWalletSummary().rows");
    expect(src).toContain('savedList.dataset.walletRowsMode = fullRows ? "full" : "summary"');
    expect(src).toContain("COLLAPSED_SAVED_ROW_PREVIEW_LIMIT");
  });

  it("hydrates full wallet rows when the hub opens", () => {
    expect(src).toContain('savedList?.dataset.walletRowsMode === "summary"');
    expect(src).toContain("renderSavedRows();");
    expect(src).toContain("fetchAndApplyNetworkChips();");
  });
});
