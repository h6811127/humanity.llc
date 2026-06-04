import { describe, expect, it } from "vitest";

import {
  buildDebriefOutcomeLines,
  resolveDebriefCopy,
} from "../../site/js/city-game-debrief-core.mjs";

describe("city-game-debrief-core (SW-14)", () => {
  it("resolves debrief copy and game-theory patterns from season JSON", () => {
    const copy = resolveDebriefCopy({
      debrief: {
        title: "Wake the city · debrief",
        game_theory_patterns: [
          {
            id: "public_goods",
            title: "Public goods",
            body: "Quorum nodes needed shared visits.",
          },
        ],
      },
    });
    expect(copy.title).toBe("Wake the city · debrief");
    expect(copy.patterns).toHaveLength(1);
    expect(copy.patterns[0]?.id).toBe("public_goods");
  });

  it("builds outcome lines from snapshot dual victory", () => {
    const lines = buildDebriefOutcomeLines(
      {
        signal_war: {
          dominant_faction: "blue",
          dual_victory: {
            network_leader: "red",
            network_majority_met: true,
            awakening_fragments_complete: true,
            finale_open: false,
          },
        },
      },
      {
        window: {
          starts_at: "2026-06-06T18:00:00-05:00",
          ends_at: "2026-09-01T22:00:00-05:00",
        },
      }
    );
    expect(lines.some((line) => line.includes("relay network majority"))).toBe(true);
    expect(lines.some((line) => line.includes("fragment lattice"))).toBe(true);
  });
});
