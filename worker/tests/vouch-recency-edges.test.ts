import { describe, expect, it } from "vitest";

import { formatVouchRecency } from "../src/resolver/verification-display";

const NOW = new Date("2026-05-24T12:00:00.000Z");

function isoSecondsAgo(seconds: number): string {
  return new Date(NOW.getTime() - seconds * 1000).toISOString();
}

function isoDaysAgo(days: number): string {
  return isoSecondsAgo(days * 86_400);
}

describe("formatVouchRecency edges (HV-FR-32)", () => {
  it("returns null for blank or unparseable timestamps", () => {
    expect(formatVouchRecency("", NOW)).toBeNull();
    expect(formatVouchRecency("   ", NOW)).toBeNull();
    expect(formatVouchRecency("not-an-iso-date", NOW)).toBeNull();
    expect(formatVouchRecency("2026-99-99T12:00:00.000Z", NOW)).toBeNull();
  });

  it("clamps future timestamps to just now", () => {
    expect(formatVouchRecency("2026-05-24T12:00:01.000Z", NOW)).toBe("just now");
    expect(formatVouchRecency("2026-06-01T00:00:00.000Z", NOW)).toBe("just now");
  });

  it("uses minute windows between 60s and 1h", () => {
    expect(formatVouchRecency(isoSecondsAgo(59), NOW)).toBe("just now");
    expect(formatVouchRecency(isoSecondsAgo(60), NOW)).toBe("1m ago");
    expect(formatVouchRecency(isoSecondsAgo(3599), NOW)).toBe("59m ago");
  });

  it("uses hour windows between 1h and 1 day", () => {
    expect(formatVouchRecency(isoSecondsAgo(3600), NOW)).toBe("1h ago");
    expect(formatVouchRecency(isoSecondsAgo(86_399), NOW)).toBe("23h ago");
  });

  it("uses singular day, then days until 14", () => {
    expect(formatVouchRecency(isoDaysAgo(1), NOW)).toBe("1 day ago");
    expect(formatVouchRecency(isoDaysAgo(2), NOW)).toBe("2 days ago");
    expect(formatVouchRecency(isoDaysAgo(13), NOW)).toBe("13 days ago");
  });

  it("switches to weeks at 14 days and calendar date at 60 days", () => {
    expect(formatVouchRecency(isoDaysAgo(14), NOW)).toBe("2 weeks ago");
    expect(formatVouchRecency(isoDaysAgo(59), NOW)).toBe("8 weeks ago");
    const calendar = formatVouchRecency(isoDaysAgo(60), NOW);
    expect(calendar).toBe(
      new Date(isoDaysAgo(60)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );
    expect(calendar).not.toMatch(/ago/);
  });
});
