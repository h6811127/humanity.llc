import { describe, expect, it } from "vitest";

import {
  ACCOUNT_ID_REGEX,
  STEWARD_ACCOUNT_URL_PARAM,
  buildStewardAccountLinkUnsigned,
  isValidStewardAccountId,
  parseStewardAccountIdFromUrl,
  stewardAccountLinkTimestamps,
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
