import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  PUBLIC_NETWORKS_CATALOG_LABEL,
  PUBLIC_NETWORKS_CATALOG_PATH,
  PUBLIC_NETWORK_RULES_PROVE_CTA,
} from "../../site/js/public-networks-portal-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const flowPages = {
  home: join(root, "site/index.html"),
  catalog: join(root, "site/play/season/index.html"),
  rules: join(root, "site/play/cedar-rapids/index.html"),
  map: join(root, "site/play/cedar-rapids/map/index.html"),
  discoverRegion: join(root, "site/discover/cedar-rapids-iowa/index.html"),
  discoverHub: join(root, "site/discover/index.html"),
  comprehension: join(root, "site/play/cedar-rapids/comprehension/index.html"),
  playerFlowFieldWalk: join(
    root,
    "site/play/cedar-rapids/comprehension/player-flow-field-walk.html"
  ),
};

function readPage(path) {
  return readFileSync(path, "utf8");
}

describe("public network player flow pages (shell regression)", () => {
  const home = readPage(flowPages.home);
  const catalog = readPage(flowPages.catalog);
  const rules = readPage(flowPages.rules);
  const map = readPage(flowPages.map);
  const discoverRegion = readPage(flowPages.discoverRegion);
  const discoverHub = readPage(flowPages.discoverHub);

  it("homepage links catalog and rules prove anchor", () => {
    expect(home).toContain('href="/play/season/"');
    expect(home).toContain("See all listed public networks");
    expect(home).toContain('href="/play/cedar-rapids/#rules-prove-title"');
    expect(home).toContain(PUBLIC_NETWORK_RULES_PROVE_CTA);
    expect(home).toContain("public-networks-portal.mjs?v=10");
  });

  it("catalog page links home and hydrates portal", () => {
    expect(catalog).toContain("player-flow-breadcrumb");
    expect(catalog).toContain('href="/"');
    expect(catalog).toContain("Home dashboard");
    expect(catalog).toContain("public-networks-portal.mjs?v=10");
    expect(catalog).toContain("not live networks");
  });

  it("rules page links catalog and board", () => {
    expect(rules).toContain("player-flow-breadcrumb");
    expect(rules).toContain('href="/play/season/">Public networks</a>');
    expect(rules).toContain(PUBLIC_NETWORKS_CATALOG_LABEL);
    expect(rules).toContain('href="/play/cedar-rapids/map/">Open public state board</a>');
    expect(rules).toContain('id="rules-prove-title"');
    expect(rules).toContain("city-game-rules-player-footnote");
    expect(rules).toContain('href="/discover/cedar-rapids-iowa/"');
    expect(rules).toContain("Home dashboard");
    expect(rules).toContain("player-flow-field-walk.html");
  });

  it("map page shell wires player flow chrome outside board root", () => {
    expect(map).toContain("player-flow-breadcrumb");
    expect(map).toContain("Wake the city board");
    expect(map).toContain('id="city-game-map-first-visit-mount"');
    expect(map).toContain('id="city-game-map-root"');
    expect(map).toContain("city-game-map-page.mjs?v=5");
    expect(map).toContain('href="/play/cedar-rapids/#rules-start-title"');
    expect(map).toContain('href="/play/cedar-rapids/#rules-privacy-title"');
    expect(map).toContain(`href="${PUBLIC_NETWORKS_CATALOG_PATH}"`);
    expect(map).toContain(PUBLIC_NETWORKS_CATALOG_LABEL);
    expect(map).toContain('href="/discover/cedar-rapids-iowa/"');
    expect(map).toContain("Browse places near me");
  });

  it("discover region page round-trips to board and catalog", () => {
    expect(discoverRegion).toContain("player-flow-breadcrumb");
    expect(discoverRegion).toContain("discovery-region-player-footnote");
    expect(discoverRegion).toContain('href="/play/cedar-rapids/map/">Open board</a>');
    expect(discoverRegion).toContain('href="/play/cedar-rapids/#rules-prove-title"');
    expect(discoverRegion).toContain(`href="${PUBLIC_NETWORKS_CATALOG_PATH}"`);
  });

  it("discover hub links catalog and home", () => {
    expect(discoverHub).toContain(`href="${PUBLIC_NETWORKS_CATALOG_PATH}"`);
    expect(discoverHub).toContain("Home dashboard");
  });

  it("comprehension hub links player flow field walk", () => {
    const comprehension = readPage(flowPages.comprehension);
    expect(comprehension).toContain("GT comprehension");
    expect(comprehension).toContain("player-flow-field-walk.html");
    expect(comprehension).toContain("PD-1–PD-5");
  });

  it("player flow field walk kit exposes shell path CTAs", () => {
    const fieldWalk = readPage(flowPages.playerFlowFieldWalk);
    expect(fieldWalk).toContain("PD-1");
    expect(fieldWalk).toContain("PD-5");
    expect(fieldWalk).toContain(PUBLIC_NETWORK_RULES_PROVE_CTA);
    expect(fieldWalk).toContain("/play/cedar-rapids/map/");
    expect(fieldWalk).toContain("/play/season/");
  });
});
