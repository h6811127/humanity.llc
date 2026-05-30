import { describe, expect, it } from "vitest";

import {
  THANKS_ACTIVATION_CTA_HREF,
  THANKS_ACTIVATION_CTA_LABEL,
  THANKS_ACTIVATION_HEADLINE,
  shouldShowThanksActivation,
  thanksActivationArriveSequenceMs,
} from "../../site/js/shop-thanks-activation-core.mjs";

describe("shouldShowThanksActivation", () => {
  it("shows activation only for Tier 1 complete mint", () => {
    expect(shouldShowThanksActivation({ status: "complete" }, true)).toBe(true);
    expect(shouldShowThanksActivation({ status: "complete" }, false)).toBe(false);
    expect(shouldShowThanksActivation({ status: "pending" }, true)).toBe(false);
    expect(shouldShowThanksActivation(null, true)).toBe(false);
  });
});

describe("thanksActivationArriveSequenceMs", () => {
  it("includes forming, stagger, and settle windows", () => {
    expect(thanksActivationArriveSequenceMs(4)).toBeGreaterThan(500);
  });
});

describe("copy constants", () => {
  it("exposes headline and CTA for mint complete handoff", () => {
    expect(THANKS_ACTIVATION_HEADLINE).toBe("Your print QR is live");
    expect(THANKS_ACTIVATION_CTA_LABEL).toBe("Update what scanners see");
    expect(THANKS_ACTIVATION_CTA_HREF).toBe("/created/#update-status");
  });
});
