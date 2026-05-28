import { describe, expect, it } from "vitest";

import {
  CHROME_REFRESH_IMMEDIATE_STORAGE_KEYS,
  shouldChromeRefreshStorageImmediately,
} from "../../site/js/device-chrome-refresh-core.mjs";

describe("shouldChromeRefreshStorageImmediately (Safari P0)", () => {
  it("does not immediate-refresh on presence heartbeats", () => {
    expect(shouldChromeRefreshStorageImmediately("hc_tab_keys_presence")).toBe(false);
  });

  it("immediate-refresh on wallet and custody keys", () => {
    for (const key of CHROME_REFRESH_IMMEDIATE_STORAGE_KEYS) {
      expect(shouldChromeRefreshStorageImmediately(key)).toBe(true);
    }
  });

  it("ignores null or unknown keys", () => {
    expect(shouldChromeRefreshStorageImmediately(null)).toBe(false);
    expect(shouldChromeRefreshStorageImmediately("hc_theme")).toBe(false);
  });
});
