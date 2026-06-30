import { describe, expect, it } from "vitest";

import {
  assertDualGateCabinetHtmlOpen,
  assertDualGateCabinetSatisfied,
  assertWitnessEdgeSatisfied,
  assertUnlockEdgeSatisfied,
  CR_UNLOCK_EDGE_ID,
  CR_WITNESS_EDGE_ID,
  evaluateDualGateSpineOpen,
} from "../scripts/ws-object-graph-prod-smoke-core.mjs";

describe("ws-object-graph-dual-gate-spine-core", () => {
  const openStatus = {
    scan: {
      relationships: [
        { edge_id: CR_WITNESS_EDGE_ID, kind: "witnesses", satisfied: true },
        { edge_id: CR_UNLOCK_EDGE_ID, kind: "unlocks", satisfied: true },
      ],
    },
  };

  const openHtml = `
    <div id="scan-object-graph-heading">How this place connects</div>
    <div class="scan-object-graph-row">
      <span class="scan-object-graph-status">Live</span>
    </div>
    <div class="scan-object-graph-row">
      <span class="scan-object-graph-status">Live</span>
    </div>
  `;

  it("assertDualGateCabinetSatisfied requires both edges live", () => {
    expect(assertWitnessEdgeSatisfied(openStatus)).toEqual({ ok: true });
    expect(assertUnlockEdgeSatisfied(openStatus)).toEqual({ ok: true });
    expect(assertDualGateCabinetSatisfied(openStatus)).toEqual({ ok: true });
  });

  it("assertDualGateCabinetHtmlOpen requires two Live graph rows", () => {
    expect(assertDualGateCabinetHtmlOpen(openHtml)).toEqual({ ok: true });
    expect(assertDualGateCabinetHtmlOpen('<span class="scan-object-graph-status">Missing</span>')).toEqual({
      ok: false,
      message: expect.stringContaining("graph heading missing"),
    });
  });

  it("evaluateDualGateSpineOpen bundles D3 checks", () => {
    const rows = evaluateDualGateSpineOpen(openStatus, openHtml);
    expect(rows.every((row) => row.ok)).toBe(true);
    expect(rows.map((row) => row.step)).toContain("D3 dual-gate cabinet HTML");
  });
});
