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

  it("does not shadow existing hubExpanded render variable", () => {
    expect(src).toContain("function hubIsExpanded()");
    expect(src).not.toContain("function hubExpanded()");
  });

  it("keeps large expanded hubs on summary rows until an action hydrates one entry", () => {
    expect(src).toContain("return !isLargeWallet(summary.count, getStewardEntitlementsPolicy())");
    expect(src).toContain("walletEntryForActionButton");
    expect(src).toContain('data-profile-id="${escapeHtml(entry.profile_id ?? "")}"');
  });

  it("windows very large summary rows and exposes incremental rendering", () => {
    expect(src).toContain("LARGE_HUB_SUMMARY_ROW_INITIAL_LIMIT");
    expect(src).toContain("visibleSummaryRowWindow");
    expect(src).toContain("hub-show-more-summary");
    expect(src).toContain("expandSummaryRowLimitForVisible");
    expect(src).toContain("bindHubSummaryViewportSentinel");
    expect(src).toContain("ensureHubSummaryViewportScrollLoader");
    expect(src).toContain("resetExpandedSummaryRowWindow");
    expect(src).toContain("scheduleInitialSummaryViewportSync");
    expect(src).toContain("viewportSync: true");
  });
});
