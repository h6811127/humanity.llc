import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  HABIT_UPDATE_TARGET,
  STORAGE_KEY,
  buildPilotSummaryPayload,
  defaultLoopRecord,
  habitLoopClosed,
  loopProgressHeadline,
  loopUpdateProgress,
  recordLostItemRelayUpdate,
  setLoopMilestone,
} from "../../site/js/lost-item-relay-loop-scorecard.mjs";

describe("lost-item-relay-loop-scorecard", () => {
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

  it("uses update target of 1 for return message pilots", () => {
    expect(HABIT_UPDATE_TARGET).toBe(1);
    expect(loopUpdateProgress(defaultLoopRecord()).target).toBe(1);
  });

  it("records manifesto updates", () => {
    recordLostItemRelayUpdate("p1", "2026-05-27T12:00:00.000Z");
    expect(store[STORAGE_KEY]).toBeTruthy();
    const parsed = JSON.parse(store[STORAGE_KEY]);
    expect(parsed.p1.updateCount).toBe(1);
  });

  it("habitLoopClosed requires update and both milestones", () => {
    expect(
      habitLoopClosed({
        updateCount: 1,
        lastUpdatedAt: null,
        milestones: { printed: true, second_device_scan: true },
      })
    ).toBe(true);
    expect(
      habitLoopClosed({
        updateCount: 0,
        lastUpdatedAt: null,
        milestones: { printed: true, second_device_scan: true },
      })
    ).toBe(false);
  });

  it("loopProgressHeadline uses return message copy", () => {
    expect(loopProgressHeadline(defaultLoopRecord())).toMatch(/return message update/);
    expect(
      loopProgressHeadline({
        updateCount: 1,
        lastUpdatedAt: null,
        milestones: { printed: true, second_device_scan: true },
      })
    ).toMatch(/closed on this device/);
  });

  it("buildPilotSummaryPayload uses lost-item summary kind", () => {
    setLoopMilestone("p1", "printed", true);
    recordLostItemRelayUpdate("p1");
    const payload = buildPilotSummaryPayload("p1", "keys_relay", null);
    expect(payload.kind).toBe("humanity_lost_item_relay_pilot_summary_v1");
    expect(payload.handle).toBe("keys_relay");
  });
});
