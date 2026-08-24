import { describe, expect, it } from "vitest";

import { isLocalHourInRange } from "../src/live-object/time-policy";

describe("isLocalHourInRange", () => {
  it("treats equal start and end as all-day", () => {
    expect(isLocalHourInRange(0, 9, 9)).toBe(true);
    expect(isLocalHourInRange(15, 9, 9)).toBe(true);
    expect(isLocalHourInRange(23, 0, 0)).toBe(true);
  });

  it("uses exclusive end for same-day windows", () => {
    expect(isLocalHourInRange(9, 9, 21)).toBe(true);
    expect(isLocalHourInRange(20, 9, 21)).toBe(true);
    expect(isLocalHourInRange(21, 9, 21)).toBe(false);
    expect(isLocalHourInRange(8, 9, 21)).toBe(false);
  });

  it("keeps until=24 open through the rest of the day", () => {
    expect(isLocalHourInRange(9, 9, 24)).toBe(true);
    expect(isLocalHourInRange(23, 9, 24)).toBe(true);
    expect(isLocalHourInRange(8, 9, 24)).toBe(false);
    expect(isLocalHourInRange(0, 0, 24)).toBe(true);
  });

  it("wraps overnight windows across midnight", () => {
    expect(isLocalHourInRange(22, 22, 6)).toBe(true);
    expect(isLocalHourInRange(23, 22, 6)).toBe(true);
    expect(isLocalHourInRange(0, 22, 6)).toBe(true);
    expect(isLocalHourInRange(5, 22, 6)).toBe(true);
    expect(isLocalHourInRange(6, 22, 6)).toBe(false);
    expect(isLocalHourInRange(21, 22, 6)).toBe(false);
  });

  it("normalizes negative and >23 hours modulo 24", () => {
    expect(isLocalHourInRange(-1, 22, 6)).toBe(true);
    expect(isLocalHourInRange(25, 9, 21)).toBe(false);
    expect(isLocalHourInRange(33, 9, 21)).toBe(true);
  });
});
