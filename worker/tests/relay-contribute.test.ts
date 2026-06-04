import { describe, expect, it } from "vitest";

import {
  applyRelayCaptureLocally,
  applyRelayDecayIfExpired,
} from "../src/city-game/relay-contribute";
import { normalizeGameMeta } from "../src/city-game/game-meta";

function relayDoc(overrides: Record<string, unknown> = {}) {
  return {
    public_state: "Bridge relay",
    object_streams: [
      { id: "territory", class: "place", label: "Controller", value: "Unclaimed" },
      { id: "relay", class: "route", label: "Relay status", value: "Open" },
    ],
    game_meta: normalizeGameMeta({
      held_by_faction: null,
      held_until: null,
      overharvest_limit: null,
      ...overrides,
    }),
  };
}

describe("relay-contribute (SW-03 / SW-05)", () => {
  it("captures a neutral relay for a faction", () => {
    const now = new Date("2026-06-07T12:00:00.000Z");
    const result = applyRelayCaptureLocally(relayDoc(), {
      faction: "red",
      now,
      decayHours: 24,
      action: "capture",
    });
    expect(result.meta.held_by_faction).toBe("red");
    expect(result.meta.held_until).toBe("2026-06-08T12:00:00.000Z");
    expect(result.doc.public_state).toContain("Red team");
  });

  it("reinforces only when faction already holds", () => {
    const now = new Date("2026-06-07T12:00:00.000Z");
    const held = relayDoc({
      held_by_faction: "blue",
      held_until: "2026-06-07T18:00:00.000Z",
    });
    expect(() =>
      applyRelayCaptureLocally(held, {
        faction: "red",
        now,
        decayHours: 24,
        action: "reinforce",
      })
    ).toThrow("REINFORCE_FACTION_MISMATCH");

    const reinforced = applyRelayCaptureLocally(held, {
      faction: "blue",
      now,
      decayHours: 24,
      action: "reinforce",
    });
    expect(reinforced.meta.held_by_faction).toBe("blue");
    expect(reinforced.meta.held_until).toBe("2026-06-08T12:00:00.000Z");
  });

  it("decays expired holds to neutral", () => {
    const now = new Date("2026-06-08T13:00:00.000Z");
    const doc = relayDoc({
      held_by_faction: "green",
      held_until: "2026-06-08T12:00:00.000Z",
    });
    const decayed = applyRelayDecayIfExpired(doc, now);
    expect(decayed.decayed).toBe(true);
    expect(decayed.meta.held_by_faction).toBe("neutral");
    expect(decayed.meta.held_until).toBeNull();
  });

  it("blocks capture while shield_generator hold is active", () => {
    const now = new Date("2026-06-07T12:00:00.000Z");
    const shielded = relayDoc({
      held_by_faction: "blue",
      held_until: "2026-06-08T12:00:00.000Z",
      artifact_id: "shield_generator",
    });
    expect(() =>
      applyRelayCaptureLocally(shielded, {
        faction: "red",
        now,
        decayHours: 24,
        action: "capture",
      })
    ).toThrow("RELAY_SHIELDED");
  });

  it("compromises relay when overharvest limit reached", () => {
    const now = new Date("2026-06-07T12:00:00.000Z");
    const result = applyRelayCaptureLocally(
      relayDoc({ overharvest_limit: 2, overharvest_count: 1 }),
      {
        faction: "yellow",
        now,
        decayHours: 24,
        action: "capture",
      }
    );
    expect(result.meta.overharvest_count).toBe(2);
    expect(result.meta.compromised).toBe(true);
    expect(result.overharvestTriggered).toBe(true);
  });
});
