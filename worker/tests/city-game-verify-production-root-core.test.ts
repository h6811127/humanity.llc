import { describe, expect, it } from "vitest";

import {
  assessProductionRootCard,
  formatProductionRootVerifyReport,
  seasonProductionRootId,
} from "../scripts/city-game-verify-production-root-core.mjs";

describe("city-game-verify-production-root-core", () => {
  it("reads season_root_profile_id", () => {
    expect(seasonProductionRootId({ season_root_profile_id: "GcP3Ee17yGqMHdidhEVMYBzq" })).toBe(
      "GcP3Ee17yGqMHdidhEVMYBzq"
    );
    expect(seasonProductionRootId({})).toBeNull();
  });

  it("passes when production card returns 200", () => {
    expect(assessProductionRootCard({ status: 200 }, "GcP3Ee17yGqMHdidhEVMYBzq")).toEqual({
      ok: true,
      profileId: "GcP3Ee17yGqMHdidhEVMYBzq",
    });
  });

  it("fails when production card is NOT_FOUND", () => {
    const result = assessProductionRootCard({ status: 404, notFound: true }, "CEenC57QN9qqnr2x5L89cbWt");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("NOT_FOUND");
    expect(result.reason).toContain("CEenC57QN9qqnr2x5L89cbWt");
  });

  it("skips when season root unset", () => {
    expect(assessProductionRootCard({ status: 404 }, null)).toEqual({
      ok: true,
      skipped: true,
      reason: "no season_root_profile_id",
    });
  });

  it("formats verify report", () => {
    const pass = formatProductionRootVerifyReport({
      ok: true,
      profileId: "GcP3Ee17yGqMHdidhEVMYBzq",
      apiOrigin: "https://humanity.llc",
    });
    expect(pass).toContain("☑ 200");

    const fail = formatProductionRootVerifyReport({
      ok: false,
      profileId: "CEenC57QN9qqnr2x5L89cbWt",
      reason: "CEen: NOT_FOUND",
      apiOrigin: "https://humanity.llc",
    });
    expect(fail).toContain("☐");
    expect(fail).toContain("Option B");
  });
});
