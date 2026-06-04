import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  custodyC1PreflightPassed,
  runCustodyC1PreflightChecks,
} from "../scripts/custody-c1-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("custody-c1-preflight-core", () => {
  it("passes on repository with C1 modules wired", () => {
    const checks = runCustodyC1PreflightChecks(root);
    expect(custodyC1PreflightPassed(checks)).toBe(true);
  });
});
