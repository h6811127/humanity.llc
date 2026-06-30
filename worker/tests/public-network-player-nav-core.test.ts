import { describe, expect, it } from "vitest";

import {
  buildDiscoverRegionPlayerFootnoteHtml,
  buildMapPagePlayerFootnoteHtml,
  buildPlayerFlowCatalogBreadcrumbHtml,
  buildPlayerFlowMapBreadcrumbHtml,
  buildPlayerFlowRulesBreadcrumbHtml,
  buildRulesPagePlayerFootnoteHtml,
  renderPlayerFlowBreadcrumb,
  resolveSeasonDiscoveryBrowseHref,
} from "../../site/js/public-network-player-nav-core.mjs";

describe("public-network-player-nav-core", () => {
  it("renders map breadcrumb with catalog hop", () => {
    const html = buildPlayerFlowMapBreadcrumbHtml("Wake the city");
    expect(html).toContain('class="player-flow-breadcrumb"');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/play/season/"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Wake the city board");
  });

  it("renders rules breadcrumb", () => {
    const html = buildPlayerFlowRulesBreadcrumbHtml("Wake the city");
    expect(html).toContain("Wake the city");
    expect(html).not.toContain("board");
  });

  it("renders catalog breadcrumb", () => {
    const html = buildPlayerFlowCatalogBreadcrumbHtml();
    expect(html).toContain('aria-current="page">Public networks</span>');
  });

  it("builds discover region player footnote with aligned CTAs", () => {
    const html = buildDiscoverRegionPlayerFootnoteHtml({
      boardHref: "/play/cedar-rapids/map/",
      rulesPath: "/play/cedar-rapids/",
    });
    expect(html).toContain('href="/play/cedar-rapids/map/"');
    expect(html).toContain("Open board");
    expect(html).toContain('href="/play/cedar-rapids/#rules-prove-title"');
    expect(html).toContain("What a scan proves");
    expect(html).toContain('href="/play/season/"');
    expect(html).toContain("All public networks");
  });

  it("builds map page footnote with discover browse when season has region", () => {
    const html = buildMapPagePlayerFootnoteHtml(
      {
        city: "Cedar Rapids, Iowa",
        public_listing: { region: "Cedar Rapids, Iowa" },
      },
      "/play/cedar-rapids/"
    );
    expect(html).toContain('href="/discover/cedar-rapids-iowa/"');
    expect(html).toContain("Browse places near me");
    expect(html).toContain("#rules-start-title");
    expect(html).toContain('href="/play/season/"');
  });

  it("builds rules page footnote with board, prove, discover, and catalog", () => {
    const html = buildRulesPagePlayerFootnoteHtml(
      {
        city: "Cedar Rapids, Iowa",
        public_listing: { region: "Cedar Rapids, Iowa" },
      },
      {
        boardPath: "/play/cedar-rapids/map/",
        rulesPath: "/play/cedar-rapids/",
        teachingPath: "/play/cedar-rapids/teaching/",
        debriefPath: "/play/cedar-rapids/debrief/",
      }
    );
    expect(html).toContain("city-game-rules-player-footnote");
    expect(html).toContain('href="/play/cedar-rapids/map/">Open board</a>');
    expect(html).toContain("#rules-prove-title");
    expect(html).toContain('href="/discover/cedar-rapids-iowa/"');
    expect(html).toContain("LO-4 teaching kit");
  });

  it("resolveSeasonDiscoveryBrowseHref returns null without region", () => {
    expect(resolveSeasonDiscoveryBrowseHref({ city: "" })).toBeNull();
  });

  it("renderPlayerFlowBreadcrumb escapes html", () => {
    const html = renderPlayerFlowBreadcrumb([
      { href: '/play/"x"/', label: 'Wake & city' },
      { label: "Current", current: true },
    ]);
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");
  });
});
