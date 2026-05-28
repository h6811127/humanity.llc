import { describe, expect, it } from "vitest";

import {
  ACCOUNT_ID_REGEX,
  STEWARD_ACCOUNT_URL_PARAM,
  STEWARD_PENDING_ACCOUNT_STORAGE_KEY,
  buildStewardAccountLinkUnsigned,
  isValidStewardAccountId,
  parseStewardAccountIdFromUrl,
  resolveStewardAccountLinkTarget,
  stewardAccountLinkTimestamps,
  stewardBillingReturnPendingLine,
} from "../../site/js/device-steward-session-core.mjs";

describe("isValidStewardAccountId", () => {
  it("accepts acc_ prefix ids", () => {
    expect(isValidStewardAccountId("acc_TestHostedSteward1")).toBe(true);
  });

  it("rejects missing prefix", () => {
    expect(isValidStewardAccountId("TestHostedSteward1")).toBe(false);
  });
});

describe("parseStewardAccountIdFromUrl", () => {
  it("reads hc_account_id from search", () => {
    const id = parseStewardAccountIdFromUrl(
      `?${STEWARD_ACCOUNT_URL_PARAM}=acc_TestHostedSteward1`
    );
    expect(id).toBe("acc_TestHostedSteward1");
  });

  it("returns null for invalid id", () => {
    expect(parseStewardAccountIdFromUrl(`?${STEWARD_ACCOUNT_URL_PARAM}=bad`)).toBeNull();
  });
});

describe("stewardAccountLinkTimestamps", () => {
  it("expires within link TTL window", () => {
    const now = Date.parse("2026-05-28T12:00:00.000Z");
    const { issued_at, expires_at } = stewardAccountLinkTimestamps(now);
    expect(Date.parse(expires_at) - Date.parse(issued_at)).toBe(5 * 60 * 1000);
  });
});

describe("buildStewardAccountLinkUnsigned", () => {
  it("includes operator_id humanity.llc", () => {
    const doc = buildStewardAccountLinkUnsigned({
      profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      account_id: "acc_TestHostedSteward1",
      device_id: "devTestdevice1111",
      nonce: "nonce_abc",
      issued_at: "2026-05-28T12:00:00.000Z",
      expires_at: "2026-05-28T12:05:00.000Z",
    });
    expect(doc.operator_id).toBe("humanity.llc");
    expect(ACCOUNT_ID_REGEX.test(doc.account_id)).toBe(true);
  });
});

describe("resolveStewardAccountLinkTarget", () => {
  it("prefers URL account id over pending storage", () => {
    expect(
      resolveStewardAccountLinkTarget("acc_TestHostedSteward1", "acc_TestHostedSteward2")
    ).toBe("acc_TestHostedSteward1");
  });

  it("falls back to pending when URL param absent", () => {
    expect(resolveStewardAccountLinkTarget(null, "acc_TestHostedSteward1")).toBe(
      "acc_TestHostedSteward1"
    );
  });
});

describe("stewardBillingReturnPendingLine", () => {
  it("prompts to load keys when checkout returns without signing keys", () => {
    expect(stewardBillingReturnPendingLine(false)).toContain("open or import");
  });

  it("shows finishing copy when keys are loaded", () => {
    expect(stewardBillingReturnPendingLine(true)).toContain("Finishing hosted plan link");
  });
});

describe("STEWARD_PENDING_ACCOUNT_STORAGE_KEY", () => {
  it("is a stable sessionStorage key", () => {
    expect(STEWARD_PENDING_ACCOUNT_STORAGE_KEY).toBe("hc_steward_pending_account_id");
  });
});
