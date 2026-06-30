import { describe, expect, it } from "vitest";

import {
  applyDualGateWalkSignOffPass,
  DUAL_GATE_WALK_SIGNOFF_PASS,
  DUAL_GATE_WALK_SIGNOFF_PENDING,
  resolveDualGateWalkSignOffResult,
} from "../scripts/ws-object-graph-dual-gate-walk-sign-off-core.mjs";

describe("ws-object-graph-dual-gate-walk-sign-off-core", () => {
  it("resolveDualGateWalkSignOffResult requires pass or fail", () => {
    expect(() => resolveDualGateWalkSignOffResult({ pass: false, fail: false })).toThrow(
      /pass or --fail/
    );
    expect(resolveDualGateWalkSignOffResult({ pass: true, fail: false })).toBe("pass");
  });

  it("applyDualGateWalkSignOffPass updates launch checklist row", () => {
    const doc = `## Final launch checklist\n\n${DUAL_GATE_WALK_SIGNOFF_PENDING}\n`;
    const next = applyDualGateWalkSignOffPass(doc, {
      dateIso: "2026-06-23",
      operator: "Spencer",
    });
    expect(next).toContain(DUAL_GATE_WALK_SIGNOFF_PASS.slice(0, 40));
    expect(next).toContain("2026-06-23");
    expect(next).toContain("Spencer");
    expect(next).toContain("## OG-2 human walk sign-off");
  });

  it("applyDualGateWalkSignOffPass marks live scan smoke checklist", () => {
    const doc = `## Final launch checklist

- [ ] Live scan smoke: cabinet pending → library → cabinet live
${DUAL_GATE_WALK_SIGNOFF_PENDING}
`;
    const next = applyDualGateWalkSignOffPass(doc, {
      dateIso: "2026-06-29",
      operator: "Spencer",
      note: "D1 browser",
    });
    expect(next).toContain(
      "- [x] Live scan smoke: D1 browser contribute · D2 operator --quorum · D3 graph Live · 2026-06-29 · Spencer"
    );
    expect(next).not.toContain("cabinet pending");
  });
});
