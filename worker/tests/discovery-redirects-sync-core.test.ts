import { describe, expect, it } from "vitest";

import {
  buildDiscoverPinRedirectLines,
  discoverPinRedirectsInSync,
  discoveryRegionsFromPinIndexes,
  renderDiscoverPinRedirectBlock,
  syncDiscoverPinRedirectsInFile,
  DISCOVER_PIN_SPLAT_BEGIN,
  DISCOVER_PIN_SPLAT_END,
} from "../../site/js/discovery-redirects-sync-core.mjs";

describe("discovery-redirects-sync-core", () => {
  it("builds one splat rewrite per region", () => {
    expect(buildDiscoverPinRedirectLines(["cedar-rapids-iowa", "example-city"])).toEqual([
      "/discover/cedar-rapids-iowa/pin/*  /discover/pin/  200",
      "/discover/example-city/pin/*  /discover/pin/  200",
    ]);
  });

  it("syncs redirect block between markers", () => {
    const before = `/shop/products/*  /shop/product-detail/  200
${DISCOVER_PIN_SPLAT_BEGIN}
/discover/old-region/pin/*  /discover/pin/  200
${DISCOVER_PIN_SPLAT_END}
`;
    const after = syncDiscoverPinRedirectsInFile(before, ["cedar-rapids-iowa"]);
    expect(after).toContain("/discover/cedar-rapids-iowa/pin/*  /discover/pin/  200");
    expect(after).not.toContain("old-region");
    expect(discoverPinRedirectsInSync(after, ["cedar-rapids-iowa"])).toBe(true);
  });

  it("collects regions from pin index metadata", () => {
    expect(
      discoveryRegionsFromPinIndexes([
        { region: "cedar-rapids-iowa", filename: "discovery-cedar-rapids-iowa.json" },
        { filename: "discovery-example-city.json" },
      ])
    ).toEqual(["cedar-rapids-iowa", "example-city"]);
  });

  it("renders a complete marked block", () => {
    const block = renderDiscoverPinRedirectBlock(["cedar-rapids-iowa"]);
    expect(block).toContain(DISCOVER_PIN_SPLAT_BEGIN);
    expect(block).toContain(DISCOVER_PIN_SPLAT_END);
  });
});
