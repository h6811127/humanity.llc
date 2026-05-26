import { describe, expect, it } from "vitest";

import { shouldAttachDocumentScrollChromeEffects } from "../../site/js/device-shell-chrome-core.mjs";

describe("device-shell-chrome-core", () => {
  it("shouldAttachDocumentScrollChromeEffects is false without matchMedia", () => {
    const prev = globalThis.matchMedia;
    // @ts-expect-error test override
    globalThis.matchMedia = undefined;
    expect(shouldAttachDocumentScrollChromeEffects()).toBe(false);
    globalThis.matchMedia = prev;
  });
});
