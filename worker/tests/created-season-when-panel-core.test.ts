import { describe, expect, it } from "vitest";

import {
  readSeasonPublishDraft,
  writeSeasonPublishDraft,
} from "../../site/js/city-game-rules-publish-core.mjs";
import { summarizeSeasonPublishDraftForWhenPanel } from "../../site/js/created-season-when-panel-core.mjs";

describe("created-season-when-panel-core", () => {
  it("summarizes publish draft window and unlock edges for When panel", () => {
    const storage = {
      /** @type {Record<string, string>} */
      data: {},
      getItem(key) {
        return this.data[key] ?? null;
      },
      setItem(key, value) {
        this.data[key] = value;
      },
    };

    writeSeasonPublishDraft(storage, "prof_when", "my_season_01", {
      status: "planned",
      window: {
        starts_at: "2026-07-04T18:00:00.000Z",
        ends_at: "2026-07-06T23:59:00.000Z",
      },
      unlock_edges: [{ from: "node_01", to: "node_02" }],
    });

    const summary = summarizeSeasonPublishDraftForWhenPanel(
      storage,
      "prof_when",
      "my_season_01"
    );
    expect(summary).toMatch(/Status: planned/);
    expect(summary).toMatch(/unlock edge/);
    expect(summary).toMatch(/Rules page/);

    expect(readSeasonPublishDraft(storage, "prof_when", "my_season_01")?.status).toBe(
      "planned"
    );
  });
});
