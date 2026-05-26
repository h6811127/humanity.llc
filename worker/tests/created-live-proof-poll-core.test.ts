import { describe, expect, it } from "vitest";

import { createdLiveProofPollShouldRun } from "../../site/js/created-live-proof-poll-core.mjs";

describe("createdLiveProofPollShouldRun", () => {
  it("requires visible document and signing keys", () => {
    expect(
      createdLiveProofPollShouldRun({
        documentVisible: true,
        hasSigningKeys: true,
      })
    ).toBe(true);
    expect(
      createdLiveProofPollShouldRun({
        documentVisible: false,
        hasSigningKeys: true,
      })
    ).toBe(false);
    expect(
      createdLiveProofPollShouldRun({
        documentVisible: true,
        hasSigningKeys: false,
      })
    ).toBe(false);
  });
});
