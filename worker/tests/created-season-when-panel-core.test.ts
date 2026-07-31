import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  readSeasonPublishDraft,
  writeSeasonPublishDraft,
} from "../../site/js/city-game-rules-publish-core.mjs";
import {
  persistSeasonWhenId,
  readSeasonWhenId,
  summarizeSeasonPublishDraftForWhenPanel,
} from "../../site/js/created-season-when-panel-core.mjs";

function stubSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  });
  return store;
}

beforeEach(() => {
  stubSessionStorage();
});

describe("created-season-when-panel-core", () => {
  it("persists the canonical season id for the active profile", () => {
    expect(persistSeasonWhenId("prof_when", " cr_season_01 ")).toBe("cr_season_01");
    expect(readSeasonWhenId("prof_when")).toBe("cr_season_01");
    expect(readSeasonWhenId("other_profile")).toBe("");
  });

  it("rejects invalid season ids without updating the remembered id", () => {
    persistSeasonWhenId("prof_when", "cr_season_01");

    expect(() => persistSeasonWhenId("prof_when", "Bad Season")).toThrow();
    expect(readSeasonWhenId("prof_when")).toBe("cr_season_01");
  });

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
