import { describe, expect, it } from "vitest";

import {
  buildPublicNetworkBoardQuickLinks,
  renderPublicNetworkBoardQuickLinks,
} from "../../site/js/public-network-board-links-core.mjs";

describe("public-network-board-links-core", () => {
  it("builds Cedar Rapids board deep links with type filters", () => {
    const links = buildPublicNetworkBoardQuickLinks(
      "/play/cedar-rapids/map/",
      "cr_season_01_wake"
    );
    expect(links).toHaveLength(5);
    expect(links[0]).toEqual({
      label: "Faction relays",
      href: "/play/cedar-rapids/map/?type=relay_gate",
    });
    expect(links[3].href).toBe("/play/cedar-rapids/map/?type=relay_gate&district=newbo");
    expect(links[4].href).toBe("/play/cedar-rapids/map/?district=river_spine");
    expect(links[1].href).toBe("/play/cedar-rapids/map/?type=sanctuary");
    expect(links[2].href).toBe("/play/cedar-rapids/map/?type=hidden");
  });

  it("returns no links for unknown seasons", () => {
    expect(buildPublicNetworkBoardQuickLinks("/play/example/map/", "other")).toEqual([]);
  });

  it("renders board quick link row", () => {
    const html = renderPublicNetworkBoardQuickLinks(
      [{ label: "Faction relays", href: "/play/cedar-rapids/map/?type=relay_gate" }],
      (value) => value
    );
    expect(html).toContain("public-networks-card__board-links");
    expect(html).toContain("Faction relays");
    expect(html).toContain("?type=relay_gate");
  });
});
