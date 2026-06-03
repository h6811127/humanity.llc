import { describe, expect, it } from "vitest";

import {
  WS_REV_R4_SIGNOFF_PENDING,
  applyHostedTierPricingWsRevR4Pass,
  applyPaidTierWsRevR4Pass,
  hostedRevM4SignOffSummaryLines,
  resolveHostedRevM4SignOffResult,
} from "../scripts/hosted-rev-m4-sign-off-core.mjs";

const PRICING_FIXTURE = `
| G8 | Payment provider | Stripe pending approval | Ops |
| G10 | Org plan \`hosted_org_v1\` | Defer post–Commons Pass | Product |

${WS_REV_R4_SIGNOFF_PENDING}

**Engineering status (2026-05-27):** E1–E6 code complete in staging.

| 2026-05-27 | **G0 signed** |
`;

const PAID_FIXTURE = `
**Open (WS-REV):** Stripe products/prices, checkout return URLs, \`/created/\` upgrade panels, M4 pricing sign-off ([\`HOSTED_TIER_PRICING_AND_SLA.md\`](HOSTED_TIER_PRICING_AND_SLA.md)).
`;

describe("hostedRevM4SignOff", () => {
  it("resolves pass/fail", () => {
    expect(resolveHostedRevM4SignOffResult({ pass: true, fail: false })).toBe("pass");
    expect(() => resolveHostedRevM4SignOffResult({ pass: true, fail: true })).toThrow();
  });

  it("applyHostedTierPricingWsRevR4Pass replaces pending marker", () => {
    const after = applyHostedTierPricingWsRevR4Pass(PRICING_FIXTURE, {
      dateIso: "2026-06-03",
    });
    expect(after).toContain("WS-REV R4 governance sign-off **recorded**");
    expect(after).not.toContain(WS_REV_R4_SIGNOFF_PENDING);
    expect(after).toContain("G11");
    expect(after).toContain("hosted_game_season_v1");
  });

  it("applyPaidTierWsRevR4Pass updates open line", () => {
    const after = applyPaidTierWsRevR4Pass(PAID_FIXTURE);
    expect(after).toContain("WS-REV shipped (repo)");
    expect(after).not.toContain("**Open (WS-REV):** Stripe products");
  });

  it("summary lines mention preflight", () => {
    const lines = hostedRevM4SignOffSummaryLines({
      dateIso: "2026-06-03",
      result: "pass",
    });
    expect(lines.join("\n")).toContain("hosted:rev:m4:preflight");
  });
});
