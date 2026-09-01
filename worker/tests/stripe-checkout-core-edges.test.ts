import { describe, expect, it } from "vitest";

import {
  HOSTED_GAME_SEASON_PLAN_ID,
  HOSTED_STEWARD_PLAN_ID,
} from "../src/steward/billing-lifecycle";
import {
  buildCheckoutCancelUrl,
  buildCheckoutReturnUrl,
  buildStripeCheckoutSessionForm,
  isValidCheckoutSiteOrigin,
  normalizeCheckoutReturnPath,
  parseStripeCheckoutSessionResponse,
  stripeHostedCheckoutMetadata,
} from "../src/steward/stripe-checkout-core";

const ACCOUNT = "acc_TestHostedSteward1";

describe("isValidCheckoutSiteOrigin lookalikes", () => {
  it("allows production, localhost, and Pages preview hosts", () => {
    expect(isValidCheckoutSiteOrigin("https://humanity.llc")).toBe(true);
    expect(isValidCheckoutSiteOrigin("https://app.humanity.llc")).toBe(true);
    expect(isValidCheckoutSiteOrigin("http://localhost:8788")).toBe(true);
    expect(isValidCheckoutSiteOrigin("http://127.0.0.1")).toBe(true);
    expect(isValidCheckoutSiteOrigin("https://preview.pages.dev")).toBe(true);
  });

  it("denies lookalike hosts, exact pages.dev, and non-http schemes", () => {
    expect(isValidCheckoutSiteOrigin("https://humanity.llc.evil.com")).toBe(false);
    expect(isValidCheckoutSiteOrigin("https://evilhumanity.llc")).toBe(false);
    expect(isValidCheckoutSiteOrigin("https://pages.dev")).toBe(false);
    expect(isValidCheckoutSiteOrigin("https://example.com")).toBe(false);
    expect(isValidCheckoutSiteOrigin("javascript:alert(1)")).toBe(false);
    expect(isValidCheckoutSiteOrigin("not-a-url")).toBe(false);
    expect(isValidCheckoutSiteOrigin("")).toBe(false);
  });
});

describe("checkout return path and cancel URL", () => {
  it("collapses open-redirect and query-bearing paths to /", () => {
    expect(normalizeCheckoutReturnPath(undefined)).toBe("/");
    expect(normalizeCheckoutReturnPath("")).toBe("/");
    expect(normalizeCheckoutReturnPath("/")).toBe("/");
    expect(normalizeCheckoutReturnPath("created/")).toBe("/");
    expect(normalizeCheckoutReturnPath("/created/?next=https://evil.example")).toBe("/");
    expect(normalizeCheckoutReturnPath("https://evil.example/")).toBe("/");
    expect(normalizeCheckoutReturnPath("/created/")).toBe("/created/");
    // Protocol-relative paths start with `/` and have no `://` / `?`, so they currently pass.
    expect(normalizeCheckoutReturnPath("//evil.example/phish")).toBe("//evil.example/phish");
  });

  it("builds cancel URL on the sanitized path", () => {
    const url = new URL(buildCheckoutCancelUrl("https://humanity.llc/", "/created/"));
    expect(url.origin).toBe("https://humanity.llc");
    expect(url.pathname).toBe("/created/");
    expect(url.searchParams.get("hosted_checkout")).toBe("canceled");

    const collapsed = new URL(
      buildCheckoutCancelUrl("https://humanity.llc", "/?next=https://evil.example")
    );
    expect(collapsed.pathname).toBe("/");
    expect(collapsed.searchParams.get("next")).toBeNull();
    expect(collapsed.searchParams.get("hosted_checkout")).toBe("canceled");

    const protocolRelative = new URL(
      buildCheckoutCancelUrl("https://humanity.llc", "//evil.example/phish")
    );
    expect(protocolRelative.origin).toBe("https://evil.example");
  });

  it("rejects invalid steward account ids on return URL and metadata", () => {
    expect(() => buildCheckoutReturnUrl("https://humanity.llc", "not-an-account", "/")).toThrow(
      /Invalid steward account_id/
    );
    expect(() => stripeHostedCheckoutMetadata("acc_short", HOSTED_STEWARD_PLAN_ID)).toThrow(
      /Invalid steward account_id/
    );
  });
});

describe("parseStripeCheckoutSessionResponse", () => {
  it("accepts https checkout URLs with cs_ session ids", () => {
    expect(
      parseStripeCheckoutSessionResponse({
        url: "https://checkout.stripe.com/c/pay/cs_test_abc",
        id: "cs_test_abc",
      })
    ).toEqual({
      url: "https://checkout.stripe.com/c/pay/cs_test_abc",
      id: "cs_test_abc",
    });
  });

  it("rejects missing, http, or non-cs_ Stripe session payloads", () => {
    expect(parseStripeCheckoutSessionResponse(null)).toBeNull();
    expect(parseStripeCheckoutSessionResponse("https://checkout.stripe.com")).toBeNull();
    expect(parseStripeCheckoutSessionResponse({ url: "https://checkout.stripe.com", id: "" })).toBeNull();
    expect(
      parseStripeCheckoutSessionResponse({
        url: "http://checkout.stripe.com/c/pay/cs_test_abc",
        id: "cs_test_abc",
      })
    ).toBeNull();
    expect(
      parseStripeCheckoutSessionResponse({
        url: "https://checkout.stripe.com/c/pay/cs_test_abc",
        id: "sess_not_checkout",
      })
    ).toBeNull();
    expect(
      parseStripeCheckoutSessionResponse({
        url: "https://evil.example/phish",
        id: "cs_test_abc",
      })
    ).toEqual({
      url: "https://evil.example/phish",
      id: "cs_test_abc",
    });
  });
});

describe("buildStripeCheckoutSessionForm customer binding", () => {
  it("attaches only cus_ Stripe customer ids", () => {
    const withCustomer = buildStripeCheckoutSessionForm({
      priceId: "price_test_steward",
      accountId: ACCOUNT,
      planId: HOSTED_GAME_SEASON_PLAN_ID,
      successUrl: "https://humanity.llc/",
      cancelUrl: "https://humanity.llc/",
      existingCustomerId: "  cus_Existing123  ",
    });
    expect(withCustomer.get("customer")).toBe("cus_Existing123");

    const ignored = buildStripeCheckoutSessionForm({
      priceId: "price_test_steward",
      accountId: ACCOUNT,
      planId: HOSTED_STEWARD_PLAN_ID,
      successUrl: "https://humanity.llc/",
      cancelUrl: "https://humanity.llc/",
      existingCustomerId: "cusX_not_a_customer",
    });
    expect(ignored.get("customer")).toBeNull();
  });
});
