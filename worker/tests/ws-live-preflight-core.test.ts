import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  assessWsLiveLo2FieldLaunch,
  assessWsLiveLo4ReferenceNetwork,
  assessWsLiveOrder1Layer1,
  assessWsLivePreflight,
  formatWsLivePreflightReport,
  wsLiveEngineeringReady,
} from "../scripts/ws-live-preflight-core.mjs";

const repoRoot = join(import.meta.dirname, "../..");

describe("ws-live-preflight-core", () => {
  it("assesses Order 1 layer 1 wiring on repo", () => {
    const order1 = assessWsLiveOrder1Layer1(repoRoot);
    expect(order1.engineeringMet).toBe(true);
    expect(order1.rows.find((r) => r.id === "L1-child-object-add-hub")?.met).toBe(true);
  });

  it("assesses LO-2 city game engineering rows", () => {
    const lo2 = assessWsLiveLo2FieldLaunch(repoRoot);
    expect(lo2.rows.find((r) => r.id === "LO-2-city-game-enabled")?.met).toBe(true);
    expect(lo2.rows.find((r) => r.id === "LO-2-pilot-nodes")?.met).toBe(true);
  });

  it("assesses LO-4 reference network engineering rows", () => {
    const lo4 = assessWsLiveLo4ReferenceNetwork(repoRoot);
    expect(lo4.engineeringMet).toBe(true);
    expect(lo4.rows.find((r) => r.id === "LO-4-kit-page")?.met).toBe(true);
    expect(lo4.rows.find((r) => r.id === "LO-4-reference-network-core")?.met).toBe(true);
    expect(lo4.rows.find((r) => r.id === "LO-4-rn-scorecard")?.met).toBe(true);
    expect(lo4.rows.find((r) => r.id === "LO-4-integrated-comprehension")?.human).toBe(true);
  });

  it("formats a non-empty preflight report", () => {
    const report = assessWsLivePreflight(repoRoot);
    const text = formatWsLivePreflightReport(report);
    expect(text).toContain("WS-LIVE preflight");
    expect(text).toContain("Five layers");
    expect(text).toContain("LO-1");
    expect(text).toContain("LO-4 reference network");
    expect(text).toContain("RN-1–RN-5");
  });

  it("engineering ready when LO-1 kit and LO-4 teaching package exist", () => {
    const kitPath = join(repoRoot, "site/dev/ws-live-lo1-comprehension.html");
    if (!existsSync(kitPath)) {
      expect(wsLiveEngineeringReady(assessWsLivePreflight(repoRoot))).toBe(false);
      return;
    }
    expect(wsLiveEngineeringReady(assessWsLivePreflight(repoRoot))).toBe(true);
  });
});
