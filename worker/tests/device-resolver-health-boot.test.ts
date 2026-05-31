import { describe, expect, it, beforeEach } from "vitest";

import {
  isResolverHealthBootSettled,
  markResolverHealthBootSettled,
  resetResolverHealthBootSettled,
} from "../../site/js/device-resolver-health-boot-core.mjs";

describe("resolver health boot settled (RC-18)", () => {
  beforeEach(() => {
    resetResolverHealthBootSettled();
  });

  it("starts unset until first health fetch marks settled", () => {
    expect(isResolverHealthBootSettled()).toBe(false);
    markResolverHealthBootSettled();
    expect(isResolverHealthBootSettled()).toBe(true);
  });

  it("resets on bfcache resume path", () => {
    markResolverHealthBootSettled();
    resetResolverHealthBootSettled();
    expect(isResolverHealthBootSettled()).toBe(false);
  });
});
