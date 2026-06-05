import { describe, expect, it } from "vitest";

import {
  buildBoardFilterSummaryHtml,
  formatBoardFilterCountLabel,
  formatBoardFilterSummaryScope,
  isBoardFilterActive,
} from "../../site/js/city-game-map-filter-summary-core.mjs";

describe("city-game-map-filter-summary-core", () => {
  it("detects when any board filter is narrowed", () => {
    expect(isBoardFilterActive("all", "all")).toBe(false);
    expect(isBoardFilterActive("newbo", "all")).toBe(true);
    expect(isBoardFilterActive("all", "relay_gate")).toBe(true);
    expect(isBoardFilterActive("river_spine", "relay_gate")).toBe(true);
  });

  it("formats viewing scope and place count copy", () => {
    expect(formatBoardFilterSummaryScope("NewBo", "Relay")).toBe("NewBo · Relay");
    expect(formatBoardFilterSummaryScope("All districts", "Relay")).toBe(
      "All districts · Relay"
    );
    expect(formatBoardFilterCountLabel(1)).toBe("1 place");
    expect(formatBoardFilterCountLabel(17)).toBe("17 places");
  });

  it("renders hidden summary shell with clear control", () => {
    const html = buildBoardFilterSummaryHtml();
    expect(html).toContain('id="city-game-map-filter-summary"');
    expect(html).toContain("Viewing:");
    expect(html).toContain("data-filter-summary-scope");
    expect(html).toContain("data-filter-summary-count");
    expect(html).toContain('data-filter-clear');
    expect(html).toContain("Clear filters");
    expect(html).toContain("hidden");
  });
});
