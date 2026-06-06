import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildMapNodeCardSlotsHtml,
  buildNodeCardCopy,
  defaultRoleNodeCardCopy,
  mergeNodeCardCopy,
  MYSTERY_NODE_CARD_SCAN,
  nodeCardCopyIsPublicSafe,
  ROLE_NODE_CARD_COPY,
  resolveNodeCardOverride,
} from "../../site/js/city-game-map-node-card-core.mjs";
import { buildMapBoardInnerHtml, formatMysteryNodeCopy } from "../../site/js/city-game-map-board-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("city-game-map-node-card-core", () => {
  it("maps roles to public-safe card copy", () => {
    for (const [role, copy] of Object.entries(ROLE_NODE_CARD_COPY)) {
      expect(copy.what?.length).toBeGreaterThan(8);
      expect(copy.scan?.length).toBeGreaterThan(8);
      expect(nodeCardCopyIsPublicSafe(copy.what)).toBe(true);
      expect(nodeCardCopyIsPublicSafe(copy.scan)).toBe(true);
      expect(copy.what?.toLowerCase()).not.toMatch(/your |you visited/);
      expect(defaultRoleNodeCardCopy(role).what).toBe(copy.what);
    }
  });

  it("override copy wins when provided", () => {
    const customSeason = {
      ...season,
      map_board: {
        ...(season.map_board ?? {}),
        node_card_overrides: {
          node_04: {
            what: "Custom lantern drop for the city.",
            scan: "Scan adds one shared signal for everyone.",
          },
        },
      },
    };
    const copy = buildNodeCardCopy("temp_drop", customSeason, { nodeId: "node_04" });
    expect(copy.what).toBe("Custom lantern drop for the city.");
    expect(copy.scan).toBe("Scan adds one shared signal for everyone.");
    expect(resolveNodeCardOverride(customSeason, "node_04")?.what).toBe(
      "Custom lantern drop for the city."
    );
  });

  it("rejects forbidden personal or surveillance language", () => {
    expect(() =>
      mergeNodeCardCopy(
        { what: "ok", scan: "ok" },
        { scan: "Shows your progress and scan count" }
      )
    ).toThrow(/public board policy/i);
    expect(nodeCardCopyIsPublicSafe("City progress for everyone")).toBe(true);
    expect(nodeCardCopyIsPublicSafe("your progress")).toBe(false);
  });

  it("mystery rows keep fog copy minimal", () => {
    const mystery = formatMysteryNodeCopy("node_01", "relay_gate", season);
    const copy = buildNodeCardCopy("relay_gate", season, {
      nodeId: "node_01",
      why: mystery.consequence,
      mysteryTitle: mystery.title,
    });
    expect(copy.what).toBe("");
    expect(copy.scan).toBe(MYSTERY_NODE_CARD_SCAN);
    expect(copy.why).toBe(mystery.consequence);
    const html = buildMapNodeCardSlotsHtml(copy);
    expect(html).not.toContain("data-node-card-what");
    expect(html).toContain("data-node-card-scan");
  });

  it("buildMapNodeCardSlotsHtml renders what and scan slots", () => {
    const html = buildMapNodeCardSlotsHtml({
      what: "Clue drop — signals here count toward shared city progress.",
      why: "Adds to shared city count",
      scan: "Scan can add one signal; the board updates for the whole city.",
    });
    expect(html).toContain("data-node-card-what");
    expect(html).toContain("data-node-card-scan");
    expect(html).toContain("Clue drop");
    expect(html).toContain("whole city");
  });

  it("board shell renders card slots for node_04", () => {
    const html = buildMapBoardInnerHtml(season);
    expect(html).toContain('data-node-id="node_04"');
    expect(html).toContain("data-node-card-what");
    expect(html).toContain("data-node-card-why");
    expect(html).toContain("data-node-card-scan");
    expect(html).toContain("Clue drop — signals here count toward shared city progress.");
    expect(html).toContain("Scan can add one signal; the board updates for the whole city.");
  });
});
