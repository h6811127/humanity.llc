import { describe, expect, it } from "vitest";

import {
  PARTICIPANT_PINS_COPY,
  PARTICIPANT_PINS_MAX,
  PARTICIPANT_PINS_STORAGE_KEY,
  buildPinnedBoardsHtml,
  isPinnableBoardUrl,
  isPinned,
  loadPins,
  pinBoard,
  unpinBoard,
} from "../../site/js/participant-pin-core.mjs";

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

describe("participant pin (L3 slice #3 — board URL bookmark, cap 20)", () => {
  it("accepts only safe board URLs (site-relative or http(s))", () => {
    expect(isPinnableBoardUrl("/play/cedar-rapids/map/")).toBe(true);
    expect(isPinnableBoardUrl("https://humanity.llc/play/cedar-rapids/map/")).toBe(true);
    expect(isPinnableBoardUrl("")).toBe(false);
    expect(isPinnableBoardUrl("javascript:alert(1)")).toBe(false);
    expect(isPinnableBoardUrl("//evil.example/x")).toBe(false);
    expect(isPinnableBoardUrl("data:text/html,x")).toBe(false);
    expect(isPinnableBoardUrl("/".repeat(501))).toBe(false);
  });

  it("pins and lists a board, never uploading", () => {
    const store = new FakeStorage();
    expect(loadPins(store)).toEqual([]);
    const res = pinBoard(
      { board_url: "/play/cedar-rapids/map/", title: "Wake the city board", season_id: "cr_season_01_wake" },
      loadPins(store),
      store
    );
    expect(res.ok).toBe(true);
    expect(isPinned("/play/cedar-rapids/map/", res.entries)).toBe(true);
    const persisted = loadPins(store);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].board_url).toBe("/play/cedar-rapids/map/");
    // Only the participant key is written; nothing else.
    expect(store.map.has(PARTICIPANT_PINS_STORAGE_KEY)).toBe(true);
    expect(Array.from(store.map.keys())).toEqual([PARTICIPANT_PINS_STORAGE_KEY]);
  });

  it("rejects duplicate pins", () => {
    const store = new FakeStorage();
    pinBoard({ board_url: "/play/cedar-rapids/map/" }, loadPins(store), store);
    const dup = pinBoard({ board_url: "/play/cedar-rapids/map/" }, loadPins(store), store);
    expect(dup.ok).toBe(false);
    expect(dup.error).toContain("already pinned");
  });

  it("rejects unsafe or missing board URLs", () => {
    const bad = pinBoard({ board_url: "javascript:alert(1)" }, [], new FakeStorage());
    expect(bad.ok).toBe(false);
    expect(bad.error).toContain("http(s)");
    const missing = pinBoard({ board_url: "" }, [], new FakeStorage());
    expect(missing.ok).toBe(false);
  });

  it("rejects beyond the cap of 20", () => {
    const store = new FakeStorage();
    let entries = [];
    for (let i = 0; i < PARTICIPANT_PINS_MAX; i += 1) {
      entries = pinBoard({ board_url: `/play/x-${i}/map/` }, entries, store).entries;
    }
    const over = pinBoard({ board_url: "/play/x-20/map/" }, entries, store);
    expect(over.ok).toBe(false);
    expect(over.error).toContain(`up to ${PARTICIPANT_PINS_MAX}`);
  });

  it("unpins a board", () => {
    const store = new FakeStorage();
    pinBoard({ board_url: "/play/cedar-rapids/map/" }, loadPins(store), store);
    const res = unpinBoard("/play/cedar-rapids/map/", loadPins(store), store);
    expect(res.ok).toBe(true);
    expect(res.entries).toEqual([]);
    expect(loadPins(store)).toEqual([]);
  });

  it("builds an empty pins shelf with honest disclosure", () => {
    const html = buildPinnedBoardsHtml([]);
    expect(html).toContain(PARTICIPANT_PINS_COPY.heading);
    expect(html).toContain("stored only in this browser");
    expect(html).toContain("Nothing is uploaded");
    expect(html.toLowerCase()).not.toContain("your progress");
    expect(html.toLowerCase()).not.toContain("scanned you");
  });

  it("builds a pins list with open + unpin, and escapes content", () => {
    const html = buildPinnedBoardsHtml([
      { board_url: "/play/cedar-rapids/map/", title: "Wake the city board" },
    ]);
    expect(html).toContain("Wake the city board");
    expect(html).toContain('href="/play/cedar-rapids/map/"');
    expect(html).toContain("Unpin");

    const dirty = buildPinnedBoardsHtml([
      { board_url: '"/><script>alert(1)</script>', title: "<b>x</b>" },
    ]);
    expect(dirty).not.toContain("<script>");
    expect(dirty).not.toContain("<b>x</b>");
  });
});