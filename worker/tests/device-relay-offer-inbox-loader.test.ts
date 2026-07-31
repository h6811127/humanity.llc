import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  walletHasActiveLostItemRelays,
} from "../../site/js/device-relay-offer-inbox-loader.mjs";

class MemoryStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe("device-relay-offer-inbox-loader", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects active wallet relays before the heavy relay inbox module loads", () => {
    localStorage.setItem("hc_wallet", JSON.stringify([{ profile_id: "prof_relay" }]));
    localStorage.setItem(
      "hc_child_objects_v1:prof_relay",
      JSON.stringify([
        {
          object_id: "obj_relay",
          object_type: "lost_item_relay",
          public_label: "Backpack tag",
          public_state: "Text me if found",
          status: "active",
        },
      ])
    );

    expect(walletHasActiveLostItemRelays()).toBe(true);
  });

  it("ignores disabled relay rows and malformed wallet storage", () => {
    localStorage.setItem("hc_wallet", JSON.stringify([{ profile_id: "prof_relay" }]));
    localStorage.setItem(
      "hc_child_objects_v1:prof_relay",
      JSON.stringify([
        {
          object_id: "obj_relay",
          object_type: "lost_item_relay",
          public_label: "Backpack tag",
          public_state: "Text me if found",
          status: "disabled",
        },
      ])
    );

    expect(walletHasActiveLostItemRelays()).toBe(false);

    localStorage.setItem("hc_wallet", "{");
    expect(walletHasActiveLostItemRelays()).toBe(false);
  });
});
