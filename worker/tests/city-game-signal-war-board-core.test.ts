import { describe, expect, it } from "vitest";

import {
  buildFactionTotalsHtml,
  buildSignalWarBoardLines,
  parseFactionNetworkPoints,
  shouldShowSignalWarBoard,
} from "../../site/js/city-game-signal-war-board-core.mjs";

describe("city-game-signal-war-board-core (SW-07)", () => {
  it("builds four-faction totals with leader highlight", () => {
    const html = buildFactionTotalsHtml(
      { red: 10, blue: 6, green: 0, yellow: 0 },
      "red"
    );
    expect(html).toContain('data-faction="red"');
    expect(html).toContain("city-game-map-faction-total--leader");
    expect(html).toContain(">10<");
    expect(html).toContain(">0<");
  });

  it("parses faction network points from snapshot block", () => {
    expect(
      parseFactionNetworkPoints({
        faction_network_points: { red: 4, blue: 2, green: 1, yellow: 0 },
      })
    ).toEqual({ red: 4, blue: 2, green: 1, yellow: 0 });
  });

  it("merges dual victory and summary lines without duplicates", () => {
    const lines = buildSignalWarBoardLines({
      signal_war: {
        dual_victory: {
          summary_lines: ["Wake the city · 2 / 3 district fragments on the public lattice"],
        },
        summary_lines: [
          "Wake the city · 2 / 3 district fragments on the public lattice",
          "Red · 10 network pts",
        ],
      },
    });
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/Red · 10 network pts/);
  });

  it("shows board when faction totals exist even with zero holds", () => {
    expect(
      shouldShowSignalWarBoard({
        signal_war: {
          faction_network_points: { red: 0, blue: 0, green: 0, yellow: 0 },
          summary_lines: ["Signal War · relays unclaimed on the public board"],
        },
      })
    ).toBe(true);
  });
});
