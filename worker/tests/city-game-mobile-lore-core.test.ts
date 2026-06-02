import { describe, expect, it } from "vitest";

import {
  buildMobileLoreEnrollmentRow,
  validateMobileLoreEnrollmentList,
  validateMobileLoreEnrollmentRow,
} from "../scripts/city-game-mobile-lore-core.mjs";

describe("city-game-mobile-lore-core", () => {
  it("accepts a valid enrollment row", () => {
    const row = buildMobileLoreEnrollmentRow({
      profileId: "CEenC57QN9qqnr2x5L89cbWt",
      artifact: "pa_glitchHoodieCourier01",
      label: "Courier North",
      fragmentHint: "Fragment 3 · dusk",
    });
    expect(validateMobileLoreEnrollmentRow(row)).toEqual([]);
  });

  it("rejects invalid print_artifact_id", () => {
    const issues = validateMobileLoreEnrollmentRow({
      profile_id: "CEenC57QN9qqnr2x5L89cbWt",
      print_artifact_id: "bad",
      label: "Courier",
    });
    expect(issues.some((i) => i.includes("print_artifact_id"))).toBe(true);
  });

  it("rejects duplicate enrollments", () => {
    const row = buildMobileLoreEnrollmentRow({
      profileId: "CEenC57QN9qqnr2x5L89cbWt",
      artifact: "pa_glitchHoodieCourier01",
      label: "Courier North",
    });
    const issues = validateMobileLoreEnrollmentList([row, row]);
    expect(issues.some((i) => i.includes("duplicate print_artifact_id"))).toBe(true);
  });
});
