import { describe, expect, it, vi, afterEach } from "vitest";

import {
  resolverErrorMessage,
  stripResolverUrlsFromMessage,
} from "../../site/js/resolver-user-error-core.mjs";

describe("resolver-user-error-core", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("strips parenthetical API URLs", () => {
    expect(
      stripResolverUrlsFromMessage(
        "Handle is already taken. (https://humanity.llc/.well-known/hc/v1/cards)"
      )
    ).toBe("Handle is already taken.");
  });

  it("uses fallback when message is only a URL", () => {
    expect(
      resolverErrorMessage(
        { message: "https://humanity.llc/.well-known/hc/v1/cards" },
        { fallback: "Could not update card." }
      )
    ).toBe("Could not update card.");
  });

  it("logs request URL to console when provided", () => {
    const warn = vi.fn();
    vi.stubGlobal("console", { ...console, warn });
    const msg = resolverErrorMessage(
      { error: "MALFORMED", message: "Bad request (https://x/.well-known/hc/v1/cards)" },
      { status: 400, requestUrl: "https://x/.well-known/hc/v1/cards", fallback: "Bad request." }
    );
    expect(warn).toHaveBeenCalledWith(
      "[resolver]",
      "https://x/.well-known/hc/v1/cards",
      expect.objectContaining({ status: 400 })
    );
    expect(msg).toBe("Bad request");
  });

  it("uses plain-language message for server errors", () => {
    expect(resolverErrorMessage({}, { status: 500 })).toBe(
      "Could not reach humanity.llc. Try again in a moment."
    );
  });
});
