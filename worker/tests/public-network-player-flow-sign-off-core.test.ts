import { describe, expect, it } from "vitest";

import {
  applyInstallQaPlayerFlowPass,
  parsePlayerFlowSignOffArgs,
  PLAYER_FLOW_INSTALL_QA_PENDING,
  playerFlowHumanSignedOff,
  resolvePlayerFlowSignOffResult,
} from "../scripts/public-network-player-flow-sign-off-core.mjs";

describe("public-network-player-flow-sign-off-core", () => {
  it("parses sign-off args", () => {
    const parsed = parsePlayerFlowSignOffArgs([
      "--pass",
      "--apply",
      "--strangers",
      "3",
      "--pass-count",
      "3",
      "--date",
      "2026-06-29",
    ]);
    expect(parsed.pass).toBe(true);
    expect(parsed.apply).toBe(true);
    expect(parsed.strangers).toBe("3");
    expect(parsed.passCount).toBe("3");
    expect(parsed.dateIso).toBe("2026-06-29");
    expect(resolvePlayerFlowSignOffResult(parsed)).toBe("pass");
  });

  it("applies install QA player flow pass marker", () => {
    const content = `## Sign-off

| Gate | Status | Date |
|------|--------|------|
${PLAYER_FLOW_INSTALL_QA_PENDING}
`;
    const out = applyInstallQaPlayerFlowPass(content, {
      dateIso: "2026-06-29",
      strangers: "3",
      passCount: "3",
    });
    expect(out).toContain("| Player flow shell (≥3 strangers, PD-1–PD-5) | ☑ Pass | 2026-06-29 |");
    expect(playerFlowHumanSignedOff(out)).toBe(true);
  });
});
