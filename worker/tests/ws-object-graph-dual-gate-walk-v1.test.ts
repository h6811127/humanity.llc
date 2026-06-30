import { describe, expect, it } from "vitest";

import {
  DUAL_GATE_WALK_STEPS,
  buildDualGateWalkKitHtml,
  validateDualGateWalkKitHtml,
} from "../scripts/ws-object-graph-dual-gate-walk-core.mjs";
import { resolveProdCabinetSmokeUrls } from "../scripts/ws-object-graph-prod-smoke-core.mjs";

describe("ws-object-graph-dual-gate-walk-core", () => {
  it("builds walk HTML with D0–D3 steps", () => {
    const urls = resolveProdCabinetSmokeUrls();
    const html = buildDualGateWalkKitHtml({
      ...urls,
      siteCodes: { witness: "CR-WITNS-4P", quorum: "CR-LANTERN-7K" },
      production: true,
    });
    for (const step of DUAL_GATE_WALK_STEPS) {
      expect(html).toContain(`id="${step.id}"`);
    }
    expect(html).toContain(urls.cabinetScan);
    expect(validateDualGateWalkKitHtml(html, "dual-gate-walk.html").ok).toBe(true);
  });
});
