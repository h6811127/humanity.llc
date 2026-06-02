import { describe, expect, it } from "vitest";

import { normalizeGameMeta } from "../src/city-game/game-meta";
import { resolveGameVouchGate, witnessVouchesForNode } from "../src/city-game/vouch-graph";

describe("vouch-graph", () => {
  it("resolves satisfied and pending witnesses", () => {
    const gate = resolveGameVouchGate(
      "node_07",
      normalizeGameMeta({ vouch_requires: ["node_10"] }),
      {
        node_10: normalizeGameMeta({ vouch_active_for: ["node_07"] }),
      }
    );
    expect(gate?.met).toBe(true);
    expect(gate?.satisfied).toEqual(["node_10"]);
    expect(gate?.pending).toEqual([]);
  });

  it("marks pending when witness has not vouched yet", () => {
    const gate = resolveGameVouchGate(
      "node_07",
      normalizeGameMeta({ vouch_requires: ["node_10"] }),
      {
        node_10: normalizeGameMeta({ vouch_active_for: [] }),
      }
    );
    expect(gate?.met).toBe(false);
    expect(gate?.pending).toEqual(["node_10"]);
  });

  it("returns null when node has no vouch requirements", () => {
    expect(
      resolveGameVouchGate("node_04", normalizeGameMeta({ vouch_requires: [] }), {})
    ).toBeNull();
  });

  it("witnessVouchesForNode checks vouch_active_for", () => {
    expect(
      witnessVouchesForNode(
        normalizeGameMeta({ vouch_active_for: ["node_07"] }),
        "node_07"
      )
    ).toBe(true);
    expect(
      witnessVouchesForNode(normalizeGameMeta({ vouch_active_for: [] }), "node_07")
    ).toBe(false);
  });
});
