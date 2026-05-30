import { describe, expect, it } from "vitest";

import {
  P0B1_PROD_WEBKIT_SIGNOFF_PENDING,
  applySafariKeysDocP0b1ProdPass,
  cardDisabledSinceVisitSignOffSummaryLines,
  parseCardDisabledSinceVisitSignOffArgs,
  resolveCardDisabledSinceVisitSignOffResult,
} from "../scripts/card-disabled-since-visit-sign-off-core.mjs";
import { cardDisabledSinceVisitDeskGateHumanNextSteps } from "../scripts/card-disabled-since-visit-desk-gate-core.mjs";

describe("parseCardDisabledSinceVisitSignOffArgs (P0b-1)", () => {
  it("parses pass apply date and device", () => {
    expect(
      parseCardDisabledSinceVisitSignOffArgs([
        "--pass",
        "--apply",
        "--date",
        "2026-05-30",
        "--device",
        "iPhone Safari",
      ])
    ).toEqual({
      pass: true,
      fail: false,
      apply: true,
      dateIso: "2026-05-30",
      device: "iPhone Safari",
    });
  });
});

describe("resolveCardDisabledSinceVisitSignOffResult", () => {
  it("requires pass or fail", () => {
    expect(() => resolveCardDisabledSinceVisitSignOffResult({ pass: false, fail: false })).toThrow(
      /Specify --pass or --fail/
    );
  });
});

describe("applySafariKeysDocP0b1ProdPass", () => {
  it("replaces pending marker with passed status", () => {
    const before = `| **P0b-1** | Re-verify | R10 | **Step 1 shipped** — ${P0B1_PROD_WEBKIT_SIGNOFF_PENDING} |`;
    const after = applySafariKeysDocP0b1ProdPass(before, {
      dateIso: "2026-05-30",
      device: "iPhone Safari",
    });
    expect(after).toMatch(/prod WebKit sign-off \*\*passed\*\* \(2026-05-30 · iPhone Safari\)/);
  });
});

describe("cardDisabledSinceVisitDeskGateHumanNextSteps", () => {
  it("mentions sign-off command", () => {
    const text = cardDisabledSinceVisitDeskGateHumanNextSteps().join("\n");
    expect(text).toMatch(/card-disabled-since-visit:sign-off/);
    expect(cardDisabledSinceVisitSignOffSummaryLines({ dateIso: "2026-05-30", result: "pass" }).join(
      "\n"
    )).toMatch(/P0b-1/);
  });
});
