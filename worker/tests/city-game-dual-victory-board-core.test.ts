import { describe, expect, it } from "vitest";

import {
  buildDualVictoryPanelHtml,
  parseDualVictoryFromSnapshot,
  shouldShowDualVictoryPanel,
} from "../../site/js/city-game-dual-victory-board-core.mjs";

describe("city-game-dual-victory-board-core", () => {
  const snapshot = {
    signal_war: {
      dual_victory: {
        board_title: "How the season can end",
        board_intro: "Two paths.",
        paths: [
          {
            id: "network",
            title: "Signal War · relay majority",
            detail: "Red holds 2 of 4 relays.",
            status: "in_progress",
          },
          {
            id: "awakening",
            title: "Wake the city · cooperative awakening",
            detail: "2 / 3 fragments.",
            status: "in_progress",
          },
        ],
      },
    },
  };

  it("parses dual_victory block from snapshot", () => {
    expect(parseDualVictoryFromSnapshot(snapshot.signal_war)?.paths).toHaveLength(2);
  });

  it("renders path status chips without player-tracking copy", () => {
    const html = buildDualVictoryPanelHtml(
      parseDualVictoryFromSnapshot(snapshot.signal_war)
    );
    expect(html).toContain("city-game-dual-victory-path--in_progress");
    expect(html).toContain("In progress");
    expect(html.toLowerCase()).not.toMatch(/leaderboard|your score|heatmap/i);
  });

  it("shouldShowDualVictoryPanel when paths present", () => {
    expect(shouldShowDualVictoryPanel(snapshot)).toBe(true);
    expect(shouldShowDualVictoryPanel({})).toBe(false);
  });
});
