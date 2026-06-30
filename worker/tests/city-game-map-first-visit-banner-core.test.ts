import { describe, expect, it, vi } from "vitest";

import {
  buildMapFirstVisitBannerHtml,
  mapFirstVisitStorageKey,
  resolveMapFirstVisitRulesHref,
  shouldShowMapFirstVisitBanner,
} from "../../site/js/city-game-map-first-visit-banner-core.mjs";
import { PUBLIC_NETWORK_RULES_PROVE_CTA } from "../../site/js/public-networks-portal-core.mjs";

describe("city-game-map-first-visit-banner-core", () => {
  const season = {
    season_id: "cr_season_01_wake",
    rules_path: "/play/cedar-rapids/",
  };

  it("builds banner html with rules prove link", () => {
    const html = buildMapFirstVisitBannerHtml("/play/cedar-rapids/#rules-prove-title");
    expect(html).toContain("city-game-map-first-visit-banner");
    expect(html).toContain("Shared signed state on real stickers");
    expect(html).toContain(PUBLIC_NETWORK_RULES_PROVE_CTA);
    expect(html).toContain('href="/play/cedar-rapids/#rules-prove-title"');
    expect(html).toContain('id="city-game-map-first-visit-dismiss"');
  });

  it("resolves rules prove href from season", () => {
    expect(resolveMapFirstVisitRulesHref(season)).toBe("/play/cedar-rapids/#rules-prove-title");
  });

  it("uses per-season session storage keys", () => {
    expect(mapFirstVisitStorageKey("cr_season_01_wake")).toBe(
      "hc_city_game_map_intro_dismissed:cr_season_01_wake"
    );
  });

  it("shouldShowMapFirstVisitBanner respects dismiss flag", () => {
    const storage = {
      getItem: vi.fn(() => "1"),
      setItem: vi.fn(),
    };
    expect(shouldShowMapFirstVisitBanner(storage, "cr_season_01_wake")).toBe(false);
    storage.getItem.mockReturnValue(null);
    expect(shouldShowMapFirstVisitBanner(storage, "cr_season_01_wake")).toBe(true);
  });
});
