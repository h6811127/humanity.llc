import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  auditPlayerFlowScanOnboardingHtml,
  PLAYER_FLOW_SCAN_ONBOARDING_AFTER_OPEN_REL,
  PLAYER_FLOW_SCAN_ONBOARDING_FORBIDDEN,
  PLAYER_FLOW_SCAN_ONBOARDING_REQUIRED,
} from "../../site/js/public-network-player-flow-scan-onboarding-contract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("public network player flow scan onboarding (PD-5)", () => {
  const html = readFileSync(join(root, PLAYER_FLOW_SCAN_ONBOARDING_AFTER_OPEN_REL), "utf8");

  for (const snippet of PLAYER_FLOW_SCAN_ONBOARDING_REQUIRED) {
    it(`requires: ${snippet.slice(0, 48)}`, () => {
      expect(html).toContain(snippet);
    });
  }

  for (const snippet of PLAYER_FLOW_SCAN_ONBOARDING_FORBIDDEN) {
    it(`forbids: ${snippet}`, () => {
      expect(html).not.toContain(snippet);
    });
  }

  it("passes audit helper", () => {
    const audit = auditPlayerFlowScanOnboardingHtml(html);
    expect(audit.ok).toBe(true);
    expect(audit.issues).toEqual([]);
  });
});
