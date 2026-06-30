import { describe, expect, it } from "vitest";

import {
  CR_UNLOCK_EDGE_LABEL,
  CR_UNLOCK_EDGE_ID,
  CR_WITNESS_EDGE_ID,
  CR_WITNESS_EDGE_LABEL,
  assertDualGateCabinetHtml,
  assertDualGateCabinetStatus,
  assertLegacyVouchFallback,
  assertUnlockEdgePending,
  assertWitnessEdgePending,
  assertWitnessGraphHtml,
  statusHasActiveEdge,
} from "../scripts/ws-object-graph-prod-smoke-core.mjs";

describe("ws-object-graph-prod-smoke-core", () => {
  const dualStatus = {
    scan: {
      relationships: [
        {
          edge_id: CR_WITNESS_EDGE_ID,
          kind: "witnesses",
          satisfied: false,
        },
        {
          edge_id: CR_UNLOCK_EDGE_ID,
          kind: "unlocks",
          satisfied: false,
        },
      ],
    },
  };

  const dualHtml = `<section class="scan-object-graph" id="scan-object-graph-heading">
  <h2 id="scan-object-graph-heading">How this place connects</h2>
  <p>Before you can open this</p>
  <li class="scan-object-graph-row"><span class="scan-object-graph-status">Missing</span></li>
  <p class="scan-object-graph-label">${CR_WITNESS_EDGE_LABEL}</p>
  <li class="scan-object-graph-row"><span class="scan-object-graph-status">Missing</span></li>
  <p class="scan-object-graph-label">${CR_UNLOCK_EDGE_LABEL}</p>
  <p>Not yet open — visit Library witness first</p>
</section>`;

  it("asserts witness edge pending on status JSON", () => {
    expect(assertWitnessEdgePending(dualStatus)).toEqual({ ok: true });
    expect(assertWitnessEdgePending({ scan: { relationships: [] } }).ok).toBe(false);
  });

  it("asserts unlock edge pending on status JSON", () => {
    expect(assertUnlockEdgePending(dualStatus)).toEqual({ ok: true });
    expect(assertUnlockEdgePending({ scan: { relationships: [] } }).ok).toBe(false);
  });

  it("asserts dual-gate cabinet status", () => {
    expect(assertDualGateCabinetStatus(dualStatus)).toEqual({ ok: true });
  });

  it("asserts dual-gate cabinet HTML", () => {
    expect(assertDualGateCabinetHtml(dualHtml)).toEqual({ ok: true });
    expect(
      assertDualGateCabinetHtml(
        dualHtml.replace(CR_UNLOCK_EDGE_LABEL, "")
      ).ok
    ).toBe(false);
  });

  it("asserts witness-only graph HTML", () => {
    expect(assertWitnessGraphHtml(dualHtml)).toEqual({ ok: true });
  });

  it("asserts legacy vouch fallback after revoke", () => {
    expect(
      assertLegacyVouchFallback(
        { scan: {} },
        '<p>Vouch pending from node_10</p>'
      )
    ).toEqual({ ok: true });
  });

  it("detects active edge in status", () => {
    expect(statusHasActiveEdge(dualStatus, CR_WITNESS_EDGE_ID)).toBe(true);
    expect(statusHasActiveEdge(dualStatus, "edge_missing")).toBe(false);
  });
});
