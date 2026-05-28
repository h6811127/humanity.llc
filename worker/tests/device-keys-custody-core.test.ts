import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  KEYS_CUSTODY_DISMISS_STORAGE_KEY,
  dismissKeysCustodyNotice,
  isKeysCustodyNoticeDismissed,
} from "../../site/js/device-keys-custody-core.mjs";

describe("device-keys-custody-core", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
  });

  it("starts un-dismissed", () => {
    expect(isKeysCustodyNoticeDismissed()).toBe(false);
  });

  it("persists dismiss", () => {
    dismissKeysCustodyNotice();
    expect(localStorage.getItem(KEYS_CUSTODY_DISMISS_STORAGE_KEY)).toBe("1");
    expect(isKeysCustodyNoticeDismissed()).toBe(true);
  });
});
