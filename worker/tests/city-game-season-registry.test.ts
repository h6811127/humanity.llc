import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  SEASON_OBJECT_IDS,
  buildAllGameNodeTemplates,
  buildGameNodeMintTemplate,
} from "../scripts/city-game-node-defaults.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);
const rulesHtml = readFileSync(
  join(root, "site/play/cedar-rapids/index.html"),
  "utf8"
);

describe("city game season registry", () => {
  it("lists 15 nodes with stable object_ids", () => {
    expect(season.nodes).toHaveLength(15);
    for (const row of season.nodes) {
      expect(row.object_id).toMatch(/^obj_cr_node_/);
      expect(SEASON_OBJECT_IDS[row.node_id]).toBe(row.object_id);
    }
  });

  it("builds mint templates for every registry row", () => {
    const templates = buildAllGameNodeTemplates(season.nodes, season.season_id);
    expect(templates).toHaveLength(15);
    for (const t of templates) {
      expect(t.node_role).toBeTruthy();
      expect(t.object_streams).toHaveLength(4);
      expect(t.game_meta).toBeTruthy();
    }
  });

  it("includes coordination unlock edges through finale", () => {
    const targets = season.unlock_edges.map((e: { to: string }) => e.to);
    expect(targets).toContain("node_07");
    expect(targets).toContain("node_13");
  });

  it("prototype nodes keep detailed overrides", () => {
    const river = buildGameNodeMintTemplate(
      season.nodes.find((n: { node_id: string }) => n.node_id === "node_04"),
      season.season_id
    );
    expect(river.game_meta.collective_target).toBe(20);
    expect(river.public_state).toContain("Seed clue");
  });
});

describe("play rules page draft", () => {
  it("includes city state board boot with season id", () => {
    expect(rulesHtml).toContain('id="city-game-map-root"');
    expect(rulesHtml).toContain('data-season-id="cr_season_01_wake"');
    expect(rulesHtml).toContain("city-game-play-page.mjs");
    expect(rulesHtml).not.toMatch(/city-game-map-board\.mjs[^"]*"\s*>\s*<script[^>]*city-game-play-page/);
  });

  it("states what scans prove and do not prove", () => {
    expect(rulesHtml).toContain("What a scan proves");
    expect(rulesHtml).toContain("What a scan does not prove");
    expect(rulesHtml).toContain("No leaderboard");
  });

  it("forbids scoreboard mechanics in plain language", () => {
    const body = rulesHtml.toLowerCase();
    expect(body).toContain("no leaderboard");
    expect(body).toContain("no scan tracking");
    expect(body).not.toMatch(/\byour rank\b/);
    expect(body).not.toMatch(/\bexperience points\b/);
  });
});
