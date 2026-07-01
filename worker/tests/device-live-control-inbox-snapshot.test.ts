import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyLiveControlInboxSnapshot,
  getLiveControlPendingForDisplay,
  resetLiveControlInboxOnShellResume,
} from "../../site/js/device-live-control-inbox.mjs";

function storageStub() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
  };
}

const pendingItem = {
  entry: { profile_id: "prof_live_proof", qr_id: "qr_live_proof" },
  challenge_id: "lc_confirmed_by_leader",
  return_url: null,
  owner_url: null,
  expires_at: "2099-01-01T00:00:00.000Z",
};

describe("applyLiveControlInboxSnapshot", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", storageStub());
    vi.stubGlobal("localStorage", storageStub());
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      clearTimeout: vi.fn(),
      setTimeout: vi.fn(),
    });
    resetLiveControlInboxOnShellResume();
  });

  afterEach(() => {
    resetLiveControlInboxOnShellResume();
    vi.unstubAllGlobals();
  });

  it("surfaces leader-confirmed pending rows on follower tabs", () => {
    applyLiveControlInboxSnapshot({
      pending: [pendingItem],
      health: "ok",
      at: 123,
      tabId: "leader-tab",
    });

    expect(getLiveControlPendingForDisplay()).toEqual([pendingItem]);

    applyLiveControlInboxSnapshot({
      pending: [],
      health: "ok",
      at: 124,
      tabId: "leader-tab",
    });

    expect(getLiveControlPendingForDisplay()).toEqual([]);
  });
});
