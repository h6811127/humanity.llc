import { describe, expect, it } from "vitest";

import {
  shouldOfferThanksMint,
  thanksMintButtonLabel,
  thanksMintLeadCopy,
  thanksMintResultMessage,
} from "../../site/js/shop-thanks-mint-core.mjs";

describe("shop-thanks-mint-core", () => {
  it("offers mint only for Tier 1 pending personalized orders", () => {
    expect(
      shouldOfferThanksMint(
        {
          status: "pending",
          planned_items: [{ planned_qr_id: "qr_a", print_artifact_id: "pa_b" }],
        },
        true
      )
    ).toBe(true);
    expect(shouldOfferThanksMint({ status: "pending", planned_items: [] }, true)).toBe(false);
    expect(
      shouldOfferThanksMint(
        {
          status: "pending",
          planned_items: [{ planned_qr_id: "qr_a", print_artifact_id: "pa_b" }],
        },
        false
      )
    ).toBe(false);
    expect(shouldOfferThanksMint({ status: "complete" }, true)).toBe(false);
  });

  it("returns lead copy for missing vs present signing session", () => {
    expect(thanksMintLeadCopy(true)).toContain("Sign below");
    expect(thanksMintLeadCopy(false)).toContain("/created/");
  });

  it("maps mint button phases", () => {
    expect(thanksMintButtonLabel("idle")).toContain("Sign");
    expect(thanksMintButtonLabel("signing")).toBe("Signing…");
    expect(thanksMintButtonLabel("complete")).toContain("active");
  });

  it("prefers server message in result copy", () => {
    expect(thanksMintResultMessage({ message: "Custom note" })).toBe("Custom note");
    expect(thanksMintResultMessage({ mint_status: "complete" })).toContain("active");
  });
});
