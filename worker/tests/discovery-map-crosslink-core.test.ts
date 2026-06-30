import { describe, expect, it } from "vitest";

import {
  DISCOVERY_MAP_BROWSE_NEAR_ME_CTA,
  renderDiscoveryMapBrowseLink,
  renderDiscoveryMapCrosslinkStrip,
  renderDiscoveryPinBookmarkLink,
} from "../../site/js/discovery-map-crosslink-core.mjs";
import { escapeDiscoveryHtml } from "../../site/js/discovery-region-browse-core.mjs";

describe("discovery-map-crosslink-core", () => {
  it("renders browse link for cedar rapids region", () => {
    const html = renderDiscoveryMapBrowseLink("cedar-rapids-iowa", escapeDiscoveryHtml);
    expect(html).toContain("/discover/cedar-rapids-iowa/");
    expect(html).toContain(DISCOVERY_MAP_BROWSE_NEAR_ME_CTA);
  });

  it("renders pin bookmark link", () => {
    const html = renderDiscoveryPinBookmarkLink(
      "cedar-rapids-iowa",
      "pin_cedar-rapids-iowa_node_04",
      escapeDiscoveryHtml
    );
    expect(html).toContain("/discover/cedar-rapids-iowa/pin/pin_cedar-rapids-iowa_node_04/");
    expect(html).toContain("Discovery pin");
  });

  it("renders crosslink strip with near-me honesty line", () => {
    const html = renderDiscoveryMapCrosslinkStrip("cedar-rapids-iowa", escapeDiscoveryHtml);
    expect(html).toContain("near-me sort on your device");
    expect(html).toContain("scans are not tracked");
  });
});
