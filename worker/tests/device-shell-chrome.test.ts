import { describe, expect, it } from "vitest";

import {
  isShellScrollChromeOptInEnabled,
  shouldAttachDocumentScrollChromeEffects,
} from "../../site/js/device-shell-chrome-core.mjs";

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

function mockLocalStorage(value) {
  const prev = globalThis.localStorage;
  // @ts-expect-error test mock
  globalThis.localStorage = {
    getItem(key) {
      return value[key] ?? null;
    },
  };
  return () => {
    globalThis.localStorage = prev;
  };
}

describe("device-shell-chrome-core", () => {
  it("shouldAttachDocumentScrollChromeEffects is false without matchMedia", () => {
    const restoreStorage = mockLocalStorage({ hc_shell_scroll_chrome: "1" });
    const prev = globalThis.matchMedia;
    // @ts-expect-error test override
    globalThis.matchMedia = undefined;
    expect(shouldAttachDocumentScrollChromeEffects()).toBe(false);
    globalThis.matchMedia = prev;
    restoreStorage();
  });

  it("scroll-edge chrome is off by default (Phase 3A)", () => {
    const restoreStorage = mockLocalStorage({});
    const restoreMedia = mockMatchMedia({
      "(pointer: fine)": true,
      "(hover: hover)": true,
      "(pointer: coarse)": false,
    });
    expect(isShellScrollChromeOptInEnabled()).toBe(false);
    expect(shouldAttachDocumentScrollChromeEffects()).toBe(false);
    restoreMedia();
    restoreStorage();
  });

  it("enables scroll-edge chrome only when opt-in and fine pointer + hover", () => {
    const restoreStorage = mockLocalStorage({ hc_shell_scroll_chrome: "1" });
    const restoreMedia = mockMatchMedia({
      "(pointer: fine)": true,
      "(hover: hover)": true,
      "(pointer: coarse)": false,
    });
    expect(shouldAttachDocumentScrollChromeEffects()).toBe(true);
    restoreMedia();
    restoreStorage();
  });

  it("disables scroll-edge chrome for coarse pointer even when opt-in", () => {
    const restoreStorage = mockLocalStorage({ hc_shell_scroll_chrome: "1" });
    const restoreMedia = mockMatchMedia({
      "(pointer: fine)": false,
      "(hover: hover)": true,
      "(pointer: coarse)": true,
    });
    expect(shouldAttachDocumentScrollChromeEffects()).toBe(false);
    restoreMedia();
    restoreStorage();
  });

  it("disables scroll-edge chrome when hover is not available", () => {
    const restoreStorage = mockLocalStorage({ hc_shell_scroll_chrome: "1" });
    const restoreMedia = mockMatchMedia({
      "(pointer: fine)": true,
      "(hover: hover)": false,
      "(pointer: coarse)": false,
    });
    expect(shouldAttachDocumentScrollChromeEffects()).toBe(false);
    restoreMedia();
    restoreStorage();
  });
});
