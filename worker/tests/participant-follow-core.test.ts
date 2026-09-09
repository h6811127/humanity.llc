import { describe, expect, it } from "vitest";

import {
  FOLLOW_SHELF_COPY,
  PARTICIPANT_FOLLOW_MAX,
  PARTICIPANT_FOLLOWS_STORAGE_KEY,
  buildFollowShelfHtml,
  followableSeasonsFromIndex,
  followSeason,
  isFollowed,
  loadFollows,
  unfollowSeason,
} from "../../site/js/participant-follow-core.mjs";

/** Minimal in-memory Storage so the core never depends on a real browser localStorage. */
class FakeStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
}

const index = {
  seasons: [
    {
      season_id: "cr_season_01_wake",
      title: "Wake the city · Signal War",
      city: "Cedar Rapids, Iowa",
      rules_path: "/play/cedar-rapids/",
      json_url: "/data/city-game-cr-season-01.json",
      public_listing: { title: "Wake the city", listed: true },
    },
    {
      season_id: "example_city_season_01",
      title: "Wake the grid",
      rules_path: "/play/example-city/",
      json_url: "/data/city-game-example-season-01.json",
      public_listing: { listed: false, title: null },
    },
  ],
};

describe("participant follow (L3 slice #1 — device-local season follow)", () => {
  it("parses followable seasons strictly (never a malformed id)", () => {
    const rows = followableSeasonsFromIndex(index);
    expect(rows).toHaveLength(2);
    expect(rows[0].season_id).toBe("cr_season_01_wake");
    // A row with no season_id is skipped entirely.
    const dirty = followableSeasonsFromIndex({
      seasons: [
        { season_id: "", title: "x" },
        { season_id: "ok", title: "y" },
        { season_id: null, title: "z" },
      ],
    });
    expect(dirty.map((r) => r.season_id)).toEqual(["ok"]);
  });

  it("follows and lists a season, never uploading", () => {
    const store = new FakeStorage();
    const rows = followableSeasonsFromIndex(index);
    const row = rows[0];

    expect(loadFollows(store)).toEqual([]);
    const res = followSeason(row, loadFollows(store), store);
    expect(res.ok).toBe(true);
    expect(isFollowed(row.season_id, res.entries)).toBe(true);

    const persisted = loadFollows(store);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].season_id).toBe("cr_season_01_wake");
    expect(persisted[0].title).toBe("Wake the city · Signal War");
    expect(persisted[0].rules_path).toBe("/play/cedar-rapids/");
    // Follow is stored under the device-local key and nothing else is written.
    expect(store.map.has("hc_participant_follows")).toBe(true);
  });

  it("rejects a duplicate follow", () => {
    const store = new FakeStorage();
    const row = followableSeasonsFromIndex(index)[0];
    followSeason(row, loadFollows(store), store);
    const dup = followSeason(row, loadFollows(store), store);
    expect(dup.ok).toBe(false);
    expect(dup.error).toContain("already followed");
  });

  it("rejects follow beyond the max and without a season id", () => {
    const store = new FakeStorage();
    const rows = followableSeasonsFromIndex(index);
    let entries = [];
    for (let i = 0; i < PARTICIPANT_FOLLOW_MAX; i += 1) {
      entries = followSeason({ ...rows[0], season_id: `season_${i}` }, entries, store).entries;
    }
    const over = followSeason({ ...rows[0], season_id: "season_x" }, entries, store);
    expect(over.ok).toBe(false);
    expect(over.error).toContain(`up to ${PARTICIPANT_FOLLOW_MAX}`);

    const missing = followSeason({ ...rows[0], season_id: "" }, entries, store);
    expect(missing.ok).toBe(false);
    expect(missing.error).toContain("Season id is required");
  });

  it("unfollows a season (Tier B confirm, no sign)", () => {
    const store = new FakeStorage();
    const row = followableSeasonsFromIndex(index)[0];
    followSeason(row, loadFollows(store), store);
    const res = unfollowSeason(row.season_id, loadFollows(store), store);
    expect(res.ok).toBe(true);
    expect(res.entries).toEqual([]);
    expect(loadFollows(store)).toEqual([]);
  });

  it("builds an empty shelf that discloses what the device remembers", () => {
    const html = buildFollowShelfHtml([]);
    expect(html).toContain("My networks");
    expect(html).toContain(FOLLOW_SHELF_COPY.empty);
    // Charter: explicitly states local storage and no upload.
    expect(html).toContain("stored only on this device");
    // Watching without scan analytics: "check" copy, never "scanned you" / gamification.
    expect(html).toContain("check its public board");
    expect(html.toLowerCase()).not.toContain("scanned you");
  });

  it("builds a shelf list with the 'check' (not 'scanned') framing", () => {
    const entry = {
      season_id: "cr_season_01_wake",
      title: "Wake the city",
      rules_path: "/play/cedar-rapids/",
      followed_at: new Date().toISOString(),
    };
    const html = buildFollowShelfHtml([entry]);
    expect(html).toContain("Wake the city");
    expect(html).toContain('/play/cedar-rapids/"');
    expect(html.toLowerCase()).not.toContain("your progress");
    expect(html.toLowerCase()).not.toContain("scanned you");
    expect(html).toContain("checks its public board");
  });
});