import { describe, expect, it } from "vitest";

import {
  applyLaunchChecklistE5Pass,
  assessProductionSmokePreflight,
  LAUNCH_CHECKLIST_E5_PENDING,
  parseProductionSmokeSignOffArgs,
  resolveProductionSmokeSignOffResult,
  selectProductionSmokeNodes,
} from "../scripts/city-game-smoke-production-core.mjs";

function prodSeed(nodeCount: number) {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    node_id: `node_${String(i + 1).padStart(2, "0")}`,
    scan_url: `https://humanity.llc/c/GcP3?q=qr_${i}`,
    public_label: `Node ${i + 1}`,
  }));
  nodes[0]!.node_id = "node_01";
  nodes[3]!.node_id = "node_04";
  nodes[6]!.node_id = "node_07";
  return { profile_id: "GcP3Ee17yGqMHdidhEVMYBzq", nodes };
}

describe("city-game-smoke-production-core", () => {
  it("selects spot nodes by default", () => {
    const spot = selectProductionSmokeNodes({ productionSeed: prodSeed(15), checkAll: false });
    expect(spot.map((n) => n.node_id)).toEqual(["node_01", "node_04", "node_07"]);
  });

  it("assesses preflight ready with full production seed", () => {
    const c4 = assessProductionSmokePreflight({ productionSeed: prodSeed(15) });
    expect(c4.ready).toBe(true);
    expect(c4.nodeCount).toBe(15);
    expect(c4.spotCount).toBe(3);
  });

  it("blocks when production seed missing", () => {
    const c4 = assessProductionSmokePreflight({ productionSeed: null });
    expect(c4.ready).toBe(false);
    expect(c4.issues[0]).toContain("production-seed");
  });

  it("applies launch checklist E5 pass marker", () => {
    const out = applyLaunchChecklistE5Pass(`before\n${LAUNCH_CHECKLIST_E5_PENDING}\nafter`, {
      dateIso: "2026-06-08",
      nodes: "node_01, node_04, node_07",
    });
    expect(out).toContain("☑ **2026-06-08**");
    expect(out).not.toContain(LAUNCH_CHECKLIST_E5_PENDING);
  });

  it("parses production smoke sign-off args", () => {
    const parsed = parseProductionSmokeSignOffArgs(["--pass", "--apply", "--nodes", "3"]);
    expect(parsed.pass).toBe(true);
    expect(resolveProductionSmokeSignOffResult(parsed)).toBe("pass");
  });
});
