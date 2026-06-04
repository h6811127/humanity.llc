/**
 * @see docs/CUSTODY_PHASE0_RUNBOOK.md
 */
import { describe, expect, it } from "vitest";

import {
  buildCustodyPhase0KitHtml,
  resolveCustodyPhase0KitUrls,
} from "../scripts/custody-phase0-comprehension-kit-core.mjs";
import {
  applyCustodyPhase0RunbookPass,
  custodyPhase0SignOffSummaryLines,
  parseCustodyPhase0SignOffArgs,
  resolveCustodyPhase0SignOffResult,
} from "../scripts/custody-phase0-sign-off-core.mjs";
import { CUSTODY_PHASE0_RUNBOOK_RESULT_PENDING } from "../scripts/custody-phase0-comprehension-kit-core.mjs";

describe("custody-phase0-comprehension-kit-core", () => {
  it("builds kit html with scorecard and create link", () => {
    const html = buildCustodyPhase0KitHtml({
      createUrl: "http://127.0.0.1:8788/create/",
      origin: "http://127.0.0.1:8788",
    });
    expect(html).toContain("C0-A");
    expect(html).toContain("Scan with this app");
    expect(html).toContain("http://127.0.0.1:8788/create/");
    expect(html).toContain("Drop taxonomy");
  });

  it("resolves local and production kit urls", () => {
    expect(resolveCustodyPhase0KitUrls({ production: true }).createUrl).toBe(
      "https://humanity.llc/create/"
    );
    expect(resolveCustodyPhase0KitUrls({ host: "192.168.1.5:8788" }).createUrl).toContain(
      "192.168.1.5:8788/create/"
    );
  });
});

describe("custody-phase0-sign-off-core", () => {
  it("parses pass args and summarizes", () => {
    const parsed = parseCustodyPhase0SignOffArgs([
      "--pass",
      "--testers",
      "5",
      "--pass-count",
      "5",
      "--drops",
      "4:Safari",
    ]);
    expect(resolveCustodyPhase0SignOffResult(parsed)).toBe("pass");
    const lines = custodyPhase0SignOffSummaryLines({ ...parsed, result: "pass" });
    expect(lines.join("\n")).toMatch(/PASS/);
    expect(lines.join("\n")).toContain("4:Safari");
  });

  it("applies pass markers to runbook stub", () => {
    const stub = `# Runbook\n\n**Status:** Active — **C0 in progress** (no wrap crypto)\n\n${CUSTODY_PHASE0_RUNBOOK_RESULT_PENDING}\n\n| C0-5 | Nontechnical comprehension study (≥5 testers) | Human | § Scorecard · **G-C0** |\n| C0-6 | Funnel drop log — top 3 reasons documented | Human | § Funnel template · **G-C0** |\n\n| 2026-06-03 | C0 started — runbook + setup UX + preflight before C1 wrap crypto |\n`;
    const out = applyCustodyPhase0RunbookPass(stub, {
      dateIso: "2026-06-04",
      testers: "5",
      passCount: "5",
      drops: "4:Safari",
      decision: "proceed-c1",
    });
    expect(out).toContain("C0 passed");
    expect(out).toContain("☑ Pass");
    expect(out).toContain("4:Safari");
  });
});
