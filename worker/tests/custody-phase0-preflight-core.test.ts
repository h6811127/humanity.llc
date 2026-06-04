/**
 * @see docs/CUSTODY_PHASE0_RUNBOOK.md
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  custodyPhase0PreflightPassed,
  runCustodyPhase0PreflightChecks,
} from "../scripts/custody-phase0-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("custody-phase0-preflight-core", () => {
  it("passes engineering C0 checks on repo", () => {
    const checks = runCustodyPhase0PreflightChecks(root);
    for (const check of checks) {
      expect(check.ok, `${check.id}: ${check.detail}`).toBe(true);
    }
    expect(custodyPhase0PreflightPassed(checks)).toBe(true);
  });
});
