import { describe, expect, it } from "vitest";

import { shouldHubSearchApplyVisibility } from "../../site/js/device-hub-search-core.mjs";

describe("shouldHubSearchApplyVisibility (since-visit item 10)", () => {
  it("skips hub-card-status-alert elements", () => {
    const alert = {
      classList: {
        contains: (name: string) => name === "hub-card-status-alert",
      },
    };
    expect(shouldHubSearchApplyVisibility(alert)).toBe(false);
  });

  it("applies visibility to normal searchable rows", () => {
    const row = {
      classList: {
        contains: () => false,
      },
    };
    expect(shouldHubSearchApplyVisibility(row)).toBe(true);
  });

  it("applies visibility when classList is missing", () => {
    expect(shouldHubSearchApplyVisibility({})).toBe(true);
  });
});
