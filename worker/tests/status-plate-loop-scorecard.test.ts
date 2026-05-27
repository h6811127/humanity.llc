import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  HABIT_UPDATE_TARGET,
  STORAGE_KEY,
  defaultLoopRecord,
  formatLastUpdated,
  getLoopRecord,
  loopProgressHeadline,
  loopUpdateProgress,
  recordStatusPlateUpdate,
  setLoopMilestone,
} from "../../site/js/status-plate-loop-scorecard.mjs";

describe("status-plate-loop-scorecard", () => {
  /** @type {Record<string, string>} */
  let store;

  beforeEach(() => {
    store = {};
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
      },
    });
  });

  afterEach(() => {
    // @ts-expect-error restore
    delete globalThis.localStorage;
  });

  it("starts empty for unknown profile", () => {
    expect(getLoopRecord("p1")).toEqual(defaultLoopRecord());
  });

  it("records manifesto updates with incrementing count", () => {
    recordStatusPlateUpdate("p1", "2026-05-27T12:00:00.000Z");
    const row = getLoopRecord("p1");
    expect(row?.updateCount).toBe(1);
    expect(row?.lastUpdatedAt).toBe("2026-05-27T12:00:00.000Z");
    recordStatusPlateUpdate("p1", "2026-05-28T12:00:00.000Z");
    expect(getLoopRecord("p1")?.updateCount).toBe(2);
  });

  it("tracks manual milestones", () => {
    setLoopMilestone("p1", "printed", true);
    setLoopMilestone("p1", "second_device_scan", true);
    expect(getLoopRecord("p1")?.milestones).toEqual({
      printed: true,
      second_device_scan: true,
    });
    setLoopMilestone("p1", "printed", false);
    expect(getLoopRecord("p1")?.milestones.printed).toBeUndefined();
  });

  it("persists under STORAGE_KEY", () => {
    recordStatusPlateUpdate("p1");
    expect(store[STORAGE_KEY]).toBeTruthy();
    const parsed = JSON.parse(store[STORAGE_KEY]);
    expect(parsed.p1.updateCount).toBe(1);
  });

  it("loopUpdateProgress reflects habit target", () => {
    expect(HABIT_UPDATE_TARGET).toBe(2);
    expect(loopUpdateProgress(defaultLoopRecord()).met).toBe(false);
    expect(loopUpdateProgress({ updateCount: 2, lastUpdatedAt: null, milestones: {} }).met).toBe(
      true
    );
  });

  it("loopProgressHeadline changes with count", () => {
    expect(loopProgressHeadline(defaultLoopRecord())).toMatch(/Publish 2 status updates/);
    expect(
      loopProgressHeadline({ updateCount: 1, lastUpdatedAt: null, milestones: {} })
    ).toMatch(/1 of 2/);
    expect(
      loopProgressHeadline({ updateCount: 2, lastUpdatedAt: null, milestones: {} })
    ).toMatch(/on track/);
  });

  it("formatLastUpdated returns localized string", () => {
    const s = formatLastUpdated({
      updateCount: 1,
      lastUpdatedAt: "2026-05-27T12:00:00.000Z",
      milestones: {},
    });
    expect(s).toBeTruthy();
  });
});
