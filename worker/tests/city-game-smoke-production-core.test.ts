import { describe, expect, it } from "vitest";

import {
  applyLaunchChecklistE5Pass,
  assessProductionSmokePreflight,
  isSeasonPlayOpenForSmoke,
  launchChecklistE5Signed,
  LAUNCH_CHECKLIST_E5_PENDING,
  parseProductionSmokeSignOffArgs,
  resolveProductionSmokeSignOffResult,
  selectProductionSmokeNodes,
  spotExpectationsForProductionProbe,
  productionSmokeExpectationsForNode,
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
    const checklist = `| E1 | verify | ☑ **2026-06-02** |
${LAUNCH_CHECKLIST_E5_PENDING}
| P1 | comprehension | ☐ |`;
    const out = applyLaunchChecklistE5Pass(checklist, {
      dateIso: "2026-06-08",
      nodes: "node_01, node_04, node_07",
    });
    expect(out).toContain("☑ **2026-06-08**");
    expect(out).not.toContain(LAUNCH_CHECKLIST_E5_PENDING);
  });

  it("does not skip E5 when other checklist rows are signed", () => {
    const checklist = `| E4 | deploy | ☑ **2026-06-03** |
${LAUNCH_CHECKLIST_E5_PENDING}`;
    const out = applyLaunchChecklistE5Pass(checklist, { dateIso: "2026-06-03" });
    expect(out).toContain("| E5 |");
    expect(out).toContain("☑ **2026-06-03**");
  });

  it("launchChecklistE5Signed reads E5 row only", () => {
    const unsigned = `| E4 | deploy | ☑ |
${LAUNCH_CHECKLIST_E5_PENDING}`;
    const signed = applyLaunchChecklistE5Pass(unsigned, { dateIso: "2026-06-03" });
    expect(launchChecklistE5Signed(unsigned)).toBe(false);
    expect(launchChecklistE5Signed(signed)).toBe(true);
  });

  it("parses production smoke sign-off args", () => {
    const parsed = parseProductionSmokeSignOffArgs(["--pass", "--apply", "--nodes", "3"]);
    expect(parsed.pass).toBe(true);
    expect(resolveProductionSmokeSignOffResult(parsed)).toBe("pass");
  });

  it("treats pre-window season as dormant for production probe", () => {
    const season = {
      window: {
        starts_at: "2099-06-06T18:00:00-05:00",
        ends_at: "2099-06-08T22:00:00-05:00",
      },
    };
    expect(isSeasonPlayOpenForSmoke(season, new Date("2026-06-03T12:00:00Z"))).toBe(false);
    expect(spotExpectationsForProductionProbe(season, new Date("2026-06-03T12:00:00Z"))).toEqual({
      node_01: { expectDormant: true },
      node_04: { expectDormant: true },
      node_07: { expectDormant: true },
    });
  });

  it("uses onboarding / contribute layout when season window is open", () => {
    const season = {
      window: {
        starts_at: "2020-06-06T18:00:00-05:00",
        ends_at: "2099-06-08T22:00:00-05:00",
      },
    };
    expect(isSeasonPlayOpenForSmoke(season, new Date("2026-06-03T12:00:00Z"))).toBe(true);
    expect(spotExpectationsForProductionProbe(season, new Date("2026-06-03T12:00:00Z")).node_04).toEqual({
      requireOnboarding: true,
      requireContributeBlock: true,
    });
  });

  it("expects dormant for any node when season window is pre-launch (--all)", () => {
    const season = {
      window: {
        starts_at: "2099-06-06T18:00:00-05:00",
        ends_at: "2099-06-08T22:00:00-05:00",
      },
    };
    const now = new Date("2026-06-03T12:00:00Z");
    expect(productionSmokeExpectationsForNode(season, "node_16", now)).toEqual({
      expectDormant: true,
    });
    expect(productionSmokeExpectationsForNode(season, "node_02", now)).toEqual({
      expectDormant: true,
    });
  });
});
