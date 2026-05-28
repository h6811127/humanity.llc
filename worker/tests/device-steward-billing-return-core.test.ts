import { describe, expect, it } from "vitest";

import {
  buildHostedStewardCheckoutReturnUrl,
  stripeHostedStewardMetadata,
} from "../../site/js/device-steward-billing-return-core.mjs";

describe("buildHostedStewardCheckoutReturnUrl", () => {
  it("appends hc_account_id on landing", () => {
    const url = buildHostedStewardCheckoutReturnUrl(
      "https://humanity.llc",
      "acc_TestHostedSteward1"
    );
    expect(url).toBe("https://humanity.llc/?hc_account_id=acc_TestHostedSteward1");
  });

  it("supports wallet path and profile_id for created deep link", () => {
    const url = buildHostedStewardCheckoutReturnUrl(
      "https://humanity.llc",
      "acc_TestHostedSteward1",
      { path: "/wallet/", profileId: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5" }
    );
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/wallet/");
    expect(parsed.searchParams.get("hc_account_id")).toBe("acc_TestHostedSteward1");
    expect(parsed.searchParams.get("profile_id")).toBe("7Xk9mP2nQ4rT6vW8yZ1aB3cD5");
  });

  it("rejects invalid account ids", () => {
    expect(() =>
      buildHostedStewardCheckoutReturnUrl("https://humanity.llc", "not_an_account")
    ).toThrow(/Invalid steward account_id/);
  });
});

describe("stripeHostedStewardMetadata", () => {
  it("returns subscription metadata.account_id", () => {
    expect(stripeHostedStewardMetadata("acc_TestHostedSteward1")).toEqual({
      subscription_metadata: { account_id: "acc_TestHostedSteward1" },
      success_url_hint:
        'Use buildHostedStewardCheckoutReturnUrl(origin, "acc_TestHostedSteward1")',
    });
  });
});
