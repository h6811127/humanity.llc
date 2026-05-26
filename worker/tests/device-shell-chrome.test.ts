import { describe, expect, it } from "vitest";

import { shouldAttachDocumentScrollChromeEffects } from "../../site/js/device-shell-chrome-core.mjs";

/** @param {Record<string, boolean>} queries */
function mockMatchMedia(queries) {
  const prev = globalThis.matchMedia;
  // @ts-expect-error test override
  globalThis.matchMedia = (query) => ({
    matches: queries[query] ?? false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  return () => {
    globalThis.matchMedia = prev;
  };
}

describe("device-shell-chrome-core", () => {
  it("shouldAttachDocumentScrollChromeEffects is false without matchMedia", () => {
    const prev = globalThis.matchMedia;
    // @ts-expect-error test override
    globalThis.matchMedia = undefined;
    expect(shouldAttachDocumentScrollChromeEffects()).toBe(false);
    globalThis.matchMedia = prev;
  });

  it("enables scroll-edge chrome only for fine pointer + hover", () => {
    const restore = mockMatchMedia({
      "(pointer: fine)": true,
      "(hover: hover)": true,
    });
    expect(shouldAttachDocumentScrollChromeEffects()).toBe(true);
    restore();
  });

  it("disables scroll-edge chrome for coarse pointer (touch / iOS)", () => {
    const restore = mockMatchMedia({
      "(pointer: fine)": false,
      "(hover: hover)": true,
    });
    expect(shouldAttachDocumentScrollChromeEffects()).toBe(false);
    restore();
  });

  it("disables scroll-edge chrome when hover is not available", () => {
    const restore = mockMatchMedia({
      "(pointer: fine)": true,
      "(hover: hover)": false,
    });
    expect(shouldAttachDocumentScrollChromeEffects()).toBe(false);
    restore();
  });
});
