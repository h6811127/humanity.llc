import { describe, expect, it } from "vitest";

import {
  CREATED_VERIFICATION_CHECKING_LABEL,
  CREATED_VERIFICATION_CHECKING_SUB,
  createdHumanTrustCopyBeforePoll,
  createdHumanTrustIconInput,
  shouldDeferCreatedStewardSurfacesUntilPoll,
  shouldShowCreatedStewardReviewQueue,
} from "../../site/js/created-verification-boot-core.mjs";

describe("shouldDeferCreatedStewardSurfacesUntilPoll", () => {
  it("defers until the first status poll completes", () => {
    expect(shouldDeferCreatedStewardSurfacesUntilPoll(false)).toBe(true);
    expect(shouldDeferCreatedStewardSurfacesUntilPoll(true)).toBe(false);
  });
});

describe("shouldShowCreatedStewardReviewQueue", () => {
  it("hides steward tools until poll confirms steward state", () => {
    expect(shouldShowCreatedStewardReviewQueue("steward", false)).toBe(false);
    expect(shouldShowCreatedStewardReviewQueue("steward", true)).toBe(true);
    expect(shouldShowCreatedStewardReviewQueue("verified_human", true)).toBe(false);
  });
});

describe("createdHumanTrustIconInput", () => {
  it("uses neutral checking icon before poll even when session label is Steward", () => {
    const icon = createdHumanTrustIconInput(
      { label: "Steward", subtitle: "Registered on this operator" },
      { state: "steward" },
      false
    );
    expect(icon.state).toBeNull();
    expect(icon.label).toBe(CREATED_VERIFICATION_CHECKING_LABEL);
  });

  it("passes resolver verification after poll", () => {
    const icon = createdHumanTrustIconInput(
      { label: "Steward", subtitle: "Registered on this operator" },
      { state: "steward" },
      true
    );
    expect(icon.state).toBe("steward");
    expect(icon.label).toBe("Steward");
  });
});

describe("createdHumanTrustCopyBeforePoll", () => {
  it("shows checking copy until poll confirms", () => {
    expect(createdHumanTrustCopyBeforePoll(false, { label: "Steward" })).toEqual({
      label: CREATED_VERIFICATION_CHECKING_LABEL,
      subtitle: CREATED_VERIFICATION_CHECKING_SUB,
    });
  });
});
