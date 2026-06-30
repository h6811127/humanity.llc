import { describe, expect, it } from "vitest";

import {
  assessProdDualGatePagesDeploy,
  assessProdDualGateScanReadiness,
  assessProdDualGateScanReadinessPostWalk,
} from "../scripts/ws-object-graph-prod-walk-preflight-core.mjs";
import { buildDualGateWalkKitHtml } from "../scripts/ws-object-graph-dual-gate-walk-core.mjs";

describe("ws-object-graph-prod-walk-preflight-core", () => {
  it("assessProdDualGatePagesDeploy fails when walk 404", () => {
    const result = assessProdDualGatePagesDeploy({
      comprehensionStatus: 200,
      comprehensionHtml: '<a href="dual-gate-walk.html">walk</a>',
      walkStatus: 404,
      walkHtml: "",
      walkUrl: "https://humanity.llc/play/cedar-rapids/comprehension/dual-gate-walk.html",
    });
    expect(result.pagesLive).toBe(false);
    expect(result.issues.some((row) => row.includes("404"))).toBe(true);
  });

  it("assessProdDualGatePagesDeploy passes when comprehension links walk", () => {
    const walkHtml = buildDualGateWalkKitHtml({
      cabinetScan: "https://humanity.llc/c/test?q=qr_cab",
      libraryScan: "https://humanity.llc/c/test?q=qr_lib",
      riverScan: "https://humanity.llc/c/test?q=qr_river",
      production: true,
    });
    const result = assessProdDualGatePagesDeploy({
      comprehensionStatus: 200,
      comprehensionHtml: '<a href="dual-gate-walk.html">walk</a>',
      walkStatus: 200,
      walkHtml,
      walkUrl: "https://humanity.llc/play/cedar-rapids/comprehension/dual-gate-walk.html",
    });
    expect(result.pagesLive).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("assessProdDualGateScanReadiness requires contribute blocks", () => {
    const fail = assessProdDualGateScanReadiness({
      cabinetStatusOk: true,
      cabinetGraphRows: [{ step: "witness edge pending", ok: true, detail: "pass" }],
      libraryStatus: 200,
      libraryHasContribute: false,
      riverStatus: 200,
      riverHasContribute: true,
    });
    expect(fail.scansReady).toBe(false);
    expect(fail.issues).toContain("library scan missing contribute block (D1)");
  });

  it("assessProdDualGateScanReadinessPostWalk skips contribute blocks", () => {
    const pass = assessProdDualGateScanReadinessPostWalk({
      cabinetStatusOk: true,
      cabinetGraphRows: [{ step: "D3 witness edge satisfied", ok: true, detail: "pass" }],
      libraryStatus: 200,
      riverStatus: 200,
    });
    expect(pass.scansReady).toBe(true);
    expect(pass.issues).toEqual([]);
  });
});
