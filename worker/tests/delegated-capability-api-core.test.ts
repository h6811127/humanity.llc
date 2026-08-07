import { describe, expect, it } from "vitest";

import {
  delegatedCapabilityApiUrl,
  delegatedCapabilityListPath,
  delegatedCapabilityRevokePath,
} from "../../site/js/delegated-capability-api-core.mjs";

const PROFILE = "cuAPt5nFYr8VCCWgPbAAupBS";
const CAPABILITY = "cap_testDelegated01";

describe("delegated-capability-api-core", () => {
  it("builds list and revoke resolver paths", () => {
    expect(delegatedCapabilityListPath(PROFILE)).toBe(
      `/.well-known/hc/v1/cards/${PROFILE}/delegated-capabilities`
    );
    expect(delegatedCapabilityRevokePath(PROFILE, CAPABILITY)).toBe(
      `/.well-known/hc/v1/cards/${PROFILE}/delegated-capabilities/${CAPABILITY}/revoke`
    );
  });

  it("percent-encodes profile and capability id path segments", () => {
    const weirdProfile = "prof/../evil";
    const weirdCap = "cap?x=1#frag";
    expect(delegatedCapabilityListPath(weirdProfile)).toBe(
      "/.well-known/hc/v1/cards/prof%2F..%2Fevil/delegated-capabilities"
    );
    expect(delegatedCapabilityRevokePath(weirdProfile, weirdCap)).toBe(
      "/.well-known/hc/v1/cards/prof%2F..%2Fevil/delegated-capabilities/cap%3Fx%3D1%23frag/revoke"
    );
  });

  it("joins origin and path into an absolute API URL", () => {
    const path = delegatedCapabilityListPath(PROFILE);
    expect(delegatedCapabilityApiUrl("http://127.0.0.1:8787", path)).toBe(
      `http://127.0.0.1:8787${path}`
    );
    expect(
      delegatedCapabilityApiUrl("https://humanity.llc/", path)
    ).toBe(`https://humanity.llc${path}`);
  });
});
