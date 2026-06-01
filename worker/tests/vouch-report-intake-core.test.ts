import { describe, expect, it } from "vitest";

import {
  isVouchReportKind,
  parseVouchReportTarget,
  priorityForReportKind,
  publicReportSourceKey,
  summarizePublicReport,
  threatIdsForReportKind,
  vouchCaseKindFromReportKind,
} from "../src/db/vouch-report-intake-core";

describe("vouch report intake core", () => {
  it("parses profile id, vouch id, and scan URL targets", () => {
    const profileId = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
    expect(parseVouchReportTarget(profileId)).toMatchObject({
      profileIds: [profileId],
      vouchIds: [],
    });
    expect(parseVouchReportTarget("vouch_abc123456789")).toMatchObject({
      profileIds: [],
      vouchIds: ["vouch_abc123456789"],
    });
    expect(
      parseVouchReportTarget(`https://humanity.llc/c/${profileId}?q=qr_test1234567890`)
    ).toMatchObject({
      profileIds: [profileId],
      scanUrl: `https://humanity.llc/c/${profileId}?q=qr_test1234567890`,
    });
  });

  it("rejects invalid targets", () => {
    expect(parseVouchReportTarget("")).toBeNull();
    expect(parseVouchReportTarget("https://evil.example/c/foo")).toBeNull();
    expect(parseVouchReportTarget("not-a-valid-target")).toBeNull();
  });

  it("maps report kinds to case kinds and threat ids", () => {
    expect(vouchCaseKindFromReportKind("coerced_vouch")).toBe("false_vouch");
    expect(vouchCaseKindFromReportKind("stolen_qr_or_artifact")).toBe("impersonation");
    expect(threatIdsForReportKind("harassment")).toContain("V-08");
    expect(priorityForReportKind("impersonation")).toBe("p0");
    expect(isVouchReportKind("false_vouch")).toBe(true);
    expect(isVouchReportKind("bogus")).toBe(false);
  });

  it("builds dedupe source keys and summaries", () => {
    expect(publicReportSourceKey("false_vouch", "profile_a")).toBe(
      "report:false_vouch:profile_a"
    );
    expect(
      summarizePublicReport("false_vouch", "They never met me.", "https://humanity.llc/c/x")
    ).toContain("Public false vouch report");
  });
});
