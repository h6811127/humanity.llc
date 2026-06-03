import { describe, expect, it } from "vitest";

import {
  applyInstallQaPhysicalPass,
  applyLaunchChecklistP2Pass,
  assessInstallQaEngineeringReady,
  INSTALL_QA_PHYSICAL_PENDING,
  INSTALL_QA_LAUNCH_P2_PENDING,
  installQaDocHasEngineeringPreflightPass,
  missingSpotNodes,
  resolveInstallQaSignOffResult,
} from "../scripts/city-game-install-qa-core.mjs";

const INSTALL_QA_SAMPLE = `| Engineering preflight (\`verify:city-game\`) | ☑ Pass | 2026-06-02 |
| Local proof gate (\`city-game:proof-local\`) | ☑ Pass | 2026-06-02 |
${INSTALL_QA_PHYSICAL_PENDING}`;

describe("city-game-install-qa-core", () => {
  it("detects engineering preflight markers", () => {
    expect(installQaDocHasEngineeringPreflightPass(INSTALL_QA_SAMPLE)).toBe(true);
    expect(installQaDocHasEngineeringPreflightPass("| Engineering preflight | ☐ |")).toBe(false);
  });

  it("assesses ready when local seed has 15 nodes", () => {
    const nodes = Array.from({ length: 15 }, (_, i) => ({
      node_id: `node_${String(i + 1).padStart(2, "0")}`,
      scan_url: "https://humanity.llc/c/x?q=qr",
    }));
    nodes[0]!.node_id = "node_01";
    nodes[3]!.node_id = "node_04";
    nodes[6]!.node_id = "node_07";
    const result = assessInstallQaEngineeringReady({
      installQaDoc: INSTALL_QA_SAMPLE,
      localSeed: { nodes },
      productionSeed: null,
    });
    expect(result.ready).toBe(true);
    expect(result.localSeedReady).toBe(true);
  });

  it("flags missing spot nodes in local seed", () => {
    const result = assessInstallQaEngineeringReady({
      installQaDoc: INSTALL_QA_SAMPLE,
      localSeed: {
        nodes: [{ node_id: "node_99", scan_url: "https://humanity.llc/c/x?q=qr" }],
      },
    });
    expect(result.ready).toBe(false);
    expect(missingSpotNodes([{ node_id: "node_01" }])).toContain("node_04");
  });

  it("applyInstallQaPhysicalPass updates sign-off table", () => {
    const out = applyInstallQaPhysicalPass(INSTALL_QA_SAMPLE, {
      dateIso: "2026-06-03",
      phones: "3",
      nodes: "15",
    });
    expect(out).toContain("☑ Pass (3 phones · 15 nodes)");
  });

  it("applyLaunchChecklistP2Pass updates launch checklist", () => {
    const out = applyLaunchChecklistP2Pass(
      `| P1 | comprehension | ☑ |\n${INSTALL_QA_LAUNCH_P2_PENDING}`,
      { dateIso: "2026-06-03" }
    );
    expect(out).toContain("P2");
    expect(out).toContain("☑ **2026-06-03**");
  });

  it("resolveInstallQaSignOffResult requires one sign-off mode", () => {
    expect(() =>
      resolveInstallQaSignOffResult({ pass: false, fail: false, scenarioPass: false })
    ).toThrow();
    expect(resolveInstallQaSignOffResult({ pass: true, fail: false, scenarioPass: false })).toBe(
      "pass"
    );
    expect(
      resolveInstallQaSignOffResult({ pass: false, fail: false, scenarioPass: true })
    ).toBe("scenario-pass");
  });
});
