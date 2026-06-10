import { describe, expect, it } from "vitest";

import {
  buildPublicNetworkCardModel,
  buildPublicNetworkVisionCardModel,
  countSeasonPlaces,
  filterPublicNetworkCards,
  formatPublicNetworkStateHero,
  formatPublicNetworkStatsLine,
  listedPublicNetworkRows,
  publicNetworkPreviewArtForSeason,
  publicNetworkVisionCardModels,
  publicNetworkWindowStatusLabel,
  publicNetworksEmptyMessage,
  PUBLIC_NETWORK_ABOUT_NETWORK_CTA,
  PUBLIC_NETWORK_OPEN_BOARD_CTA,
  renderPublicNetworkCard,
  renderPublicNetworkResults,
} from "../../site/js/public-networks-portal-core.mjs";

const cedarIndexRow = {
  season_id: "cr_season_01_wake",
  title: "Wake the city · Signal War",
  city: "Cedar Rapids, Iowa",
  rules_path: "/play/cedar-rapids/",
  public_listing: {
    listed: true,
    title: "Wake the city",
    summary: "Weekend live-object game across Cedar Rapids.",
    region: "Cedar Rapids, Iowa",
    category: "city_games",
  },
};

const templateRow = {
  season_id: "example_city_season_01",
  title: "Wake the grid",
  city: "Example City (template)",
  rules_path: "/play/example-city/",
  public_listing: { listed: false, category: "city_games" },
};

describe("public-networks-portal-core", () => {
  it("lists only public_listing.listed rows", () => {
    const listed = listedPublicNetworkRows([cedarIndexRow, templateRow]);
    expect(listed).toHaveLength(1);
    expect(listed[0].season_id).toBe("cr_season_01_wake");
  });

  it("builds Cedar Rapids card with board open href and live status when window open", () => {
    const card = buildPublicNetworkCardModel(cedarIndexRow, {
      status: "active",
      window: {
        starts_at: "2020-01-01T00:00:00-05:00",
        ends_at: "2099-01-01T00:00:00-05:00",
      },
    });
    expect(card.name).toBe("Wake the city");
    expect(card.place).toBe("Cedar Rapids, Iowa");
    expect(card.openHref).toBe("/play/cedar-rapids/map/");
    expect(card.rulesHref).toBe("/play/cedar-rapids/");
    expect(card.statusLabel).toBe("Live now");
    expect(card.category).toBe("city_games");
  });

  it("filters by search query and category chips", () => {
    const cards = [
      buildPublicNetworkCardModel(cedarIndexRow, {
        window: { starts_at: null, ends_at: null },
      }),
    ];
    expect(filterPublicNetworkCards(cards, { query: "cedar" })).toHaveLength(1);
    expect(filterPublicNetworkCards(cards, { query: "denver" })).toHaveLength(0);
    expect(filterPublicNetworkCards(cards, { category: "city_games" })).toHaveLength(1);
    expect(filterPublicNetworkCards(cards, { category: "markets" })).toHaveLength(0);
  });

  it("labels pre-window seasons with board-open copy", () => {
    expect(publicNetworkWindowStatusLabel("before")).toBe("Play opens soon · board open now");
    const card = buildPublicNetworkCardModel(cedarIndexRow, {
      window: {
        starts_at: "2099-06-06T18:00:00-05:00",
        ends_at: "2099-09-01T22:00:00-05:00",
      },
    });
    expect(card.statusLabel).toBe("Play opens soon · board open now");
  });

  it("renders Open board CTA on live Cedar Rapids card", () => {
    const card = buildPublicNetworkCardModel(cedarIndexRow, {
      window: { starts_at: null, ends_at: null },
    });
    const html = renderPublicNetworkCard(card);
    expect(html).toContain(PUBLIC_NETWORK_OPEN_BOARD_CTA);
    expect(html).toContain(PUBLIC_NETWORK_ABOUT_NETWORK_CTA);
    expect(html).toContain('href="/play/cedar-rapids/"');
    expect(html).toContain('href="/play/cedar-rapids/map/"');
    expect(html).toContain('data-network-live="true"');
    expect(html).toContain("Wake the city");
    expect(html).toContain("City game");
    expect(html).toContain("Weekend live-object game across Cedar Rapids.");
    expect(html).toContain("public-networks-card--rich");
    expect(html).toContain("public-networks-card--state-first");
  });

  it("formats state hero from status and stats", () => {
    expect(
      formatPublicNetworkStateHero({ statusLabel: "Live now", statsLine: "40 places · 40 live objects" })
    ).toBe("Live now · 40 places · 40 live objects");
    expect(formatPublicNetworkStateHero({ statusLabel: "Coming soon", statsLine: "" })).toBe(
      "Coming soon"
    );
  });

  it("state-first card DOM order: identity → state → actions → details", () => {
    const card = buildPublicNetworkCardModel(cedarIndexRow, {
      window: {
        starts_at: "2020-01-01T00:00:00-05:00",
        ends_at: "2099-01-01T00:00:00-05:00",
      },
      nodes: [{ node_id: "a" }, { node_id: "b" }],
    });
    const html = renderPublicNetworkCard(card);
    const entity = html.indexOf('data-state-first="entity"');
    const state = html.indexOf('data-state-first="current-state"');
    const actions = html.indexOf('data-state-first="actions"');
    const details = html.indexOf('data-state-first="details"');
    expect(entity).toBeGreaterThan(-1);
    expect(state).toBeGreaterThan(entity);
    expect(actions).toBeGreaterThan(state);
    expect(details).toBeGreaterThan(actions);
    expect(html.indexOf("Live now · 2 places")).toBeLessThan(html.indexOf(PUBLIC_NETWORK_OPEN_BOARD_CTA));
    expect(html.indexOf(PUBLIC_NETWORK_OPEN_BOARD_CTA)).toBeLessThan(
      html.indexOf("Weekend live-object game across Cedar Rapids.")
    );
    expect(html).not.toContain("public-networks-card__head");
    expect(html).not.toContain('class="public-networks-card__stats"');
  });

  it("counts places and renders stats plus board preview art for listed seasons", () => {
    const seasonConfig = {
      window: {
        starts_at: "2020-01-01T00:00:00-05:00",
        ends_at: "2099-01-01T00:00:00-05:00",
      },
      nodes: [{ node_id: "a" }, { node_id: "b" }, { node_id: "c" }],
    };
    expect(countSeasonPlaces(seasonConfig)).toBe(3);
    expect(formatPublicNetworkStatsLine({ placeCount: 3, objectCount: 3 })).toBe(
      "3 places · 3 live objects"
    );
    expect(publicNetworkPreviewArtForSeason("cr_season_01_wake")).toMatch(
      /cedar-rapids-board-open/
    );
    const card = buildPublicNetworkCardModel(cedarIndexRow, seasonConfig);
    expect(card.statsLine).toBe("3 places · 3 live objects");
    const html = renderPublicNetworkCard(card);
    expect(html).toContain("Live now · 3 places · 3 live objects");
    expect(html).toContain('data-state-first="current-state"');
    expect(html).toContain("public-networks-card__preview");
    expect(html).toContain("cedar-rapids-board-open.png");
  });

  it("vision cards render schematic preview without stats row", () => {
    const vision = publicNetworkVisionCardModels();
    expect(vision.length).toBeGreaterThanOrEqual(2);
    for (const card of vision) {
      expect(card.isLive).toBe(false);
      const html = renderPublicNetworkCard(card);
      expect(html).toContain('data-network-live="false"');
      expect(html).toContain("public-networks-card--vision");
      expect(html).toContain("public-networks-card__schematic");
      expect(html).not.toContain('class="public-networks-card__stats"');
      expect(html).not.toContain('href="/play/');
      expect(html).not.toContain("Live now");
      expect(html).toMatch(/Prototype|Coming soon/);
      expect(html).toContain('data-state-first="current-state"');
      const state = html.indexOf('data-state-first="current-state"');
      const actions = html.indexOf('data-state-first="actions"');
      const details = html.indexOf('data-state-first="details"');
      expect(state).toBeLessThan(actions);
      expect(actions).toBeLessThan(details);
    }
  });

  it("filters vision cards by category without treating them as live", () => {
    const live = buildPublicNetworkCardModel(cedarIndexRow, {
      window: { starts_at: null, ends_at: null },
    });
    const cards = [live, ...publicNetworkVisionCardModels()];
    const markets = filterPublicNetworkCards(cards, { category: "markets" });
    expect(markets).toHaveLength(1);
    expect(markets[0].isLive).toBe(false);
    expect(markets[0].name).toMatch(/market/i);
  });

  it("buildPublicNetworkVisionCardModel marks prototype vs coming soon", () => {
    const prototype = buildPublicNetworkVisionCardModel({
      id: "test_proto",
      name: "Test market",
      place: "Prototype",
      category: "markets",
      summary: "Summary",
      availability: "prototype",
    });
    expect(prototype.statusLabel).toBe("Prototype");
    const soon = buildPublicNetworkVisionCardModel({
      id: "test_soon",
      name: "Test event",
      place: "Soon",
      category: "events",
      summary: "Summary",
      availability: "coming_soon",
    });
    expect(soon.statusLabel).toBe("Coming soon");
  });

  it("returns category-aware empty messages", () => {
    expect(publicNetworksEmptyMessage({ hasListed: false })).toMatch(/No public networks listed yet/);
    expect(publicNetworksEmptyMessage({ hasListed: true, category: "markets" })).toMatch(
      /Markets/
    );
    expect(publicNetworksEmptyMessage({ hasListed: true, query: "foo" })).toMatch(/match that search/);
  });

  it("renderPublicNetworkResults returns empty string for no cards", () => {
    expect(renderPublicNetworkResults([])).toBe("");
  });
});
