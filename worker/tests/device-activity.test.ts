import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadWalletMock } = vi.hoisted(() => ({
  loadWalletMock: vi.fn(() => [] as Array<{ profile_id?: string; label?: string; handle?: string }>),
}));

vi.mock("../../site/js/device-wallet.mjs", () => ({
  loadWallet: loadWalletMock,
}));

import {
  HUB_RECENT_DISPLAY_LIMIT,
  activityActionHint,
  activityHaystack,
  activityTypeLabel,
  formatActivityTime,
  lastActivityForEntry,
  loadActivity,
  logDeviceActivity,
  walletEntryForActivity,
} from "../../site/js/device-activity.mjs";

function stubStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
  vi.stubGlobal("localStorage", localStorage);
  return store;
}

describe("device-activity", () => {
  beforeEach(() => {
    loadWalletMock.mockReset();
    loadWalletMock.mockReturnValue([]);
    stubStorage();
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
    });
  });

  it("exports the hub recent display cap", () => {
    expect(HUB_RECENT_DISPLAY_LIMIT).toBe(3);
  });

  it("builds a lowercase search haystack from label, type, and profile", () => {
    expect(
      activityHaystack({
        type: "use_keys",
        label: "River Studio",
        at: "2026-06-01T12:00:00.000Z",
        profile_id: "p_river",
      })
    ).toContain("river studio");
    expect(
      activityHaystack({
        type: "use_keys",
        label: "River Studio",
        at: "2026-06-01T12:00:00.000Z",
        profile_id: "p_river",
      })
    ).toContain("use_keys");
    expect(
      activityHaystack({
        type: "use_keys",
        label: "River Studio",
        at: "2026-06-01T12:00:00.000Z",
        profile_id: "p_river",
      })
    ).toContain("p_river");
  });

  it("maps known activity types and falls back for unknown kinds", () => {
    expect(activityTypeLabel("saved")).toBe("Saved on device");
    expect(activityTypeLabel("use_keys")).toBe("Took control in tab");
    expect(activityTypeLabel("remove_card")).toBe("Removed from wallet");
    expect(activityTypeLabel("pin_added")).toBe("Pinned scan link");
    expect(activityTypeLabel("backup_import")).toBe("Imported backup");
    expect(activityTypeLabel("live_control")).toBe("Signed live proof");
    expect(activityTypeLabel("auto_activate_vouch_keys")).toBe(
      "Auto-activated control for attestation"
    );
    expect(activityTypeLabel("default_vouch_set")).toBe("Default for attestation");
    expect(activityTypeLabel("default_vouch_clear")).toBe("Cleared vouch default");
    expect(activityTypeLabel("not_a_real_type")).toBe("Action on device");
  });

  it("hints Open Now when a wallet row or profile id is present", () => {
    expect(activityActionHint({ type: "pin_added" })).toBe("Pinned scan");
    expect(activityActionHint({ type: "saved", profile_id: "p1" })).toBe("Open Now");
    loadWalletMock.mockReturnValue([{ profile_id: "p2", label: "Studio" }]);
    expect(activityActionHint({ type: "saved", label: "Studio" })).toBe("Open Now");
    loadWalletMock.mockReturnValue([]);
    expect(activityActionHint({ type: "saved", label: "Unknown" })).toBe("");
  });

  it("resolves wallet rows by profile id, label, or @handle", () => {
    loadWalletMock.mockReturnValue([
      { profile_id: "p_river", label: "River", handle: "river" },
    ]);
    expect(walletEntryForActivity({ type: "saved", label: "Other", profile_id: "p_river" })).toEqual(
      expect.objectContaining({ profile_id: "p_river" })
    );
    expect(walletEntryForActivity({ type: "saved", label: "River" })).toEqual(
      expect.objectContaining({ handle: "river" })
    );
    expect(walletEntryForActivity({ type: "saved", label: "@river" })).toEqual(
      expect.objectContaining({ handle: "river" })
    );
    expect(walletEntryForActivity({ type: "saved", label: "missing" })).toBeNull();
  });

  it("treats corrupt or non-array storage as an empty log", () => {
    stubStorage({ hc_device_activity: "{not-json" });
    expect(loadActivity()).toEqual([]);
    stubStorage({ hc_device_activity: '{"type":"saved"}' });
    expect(loadActivity()).toEqual([]);
  });

  it("skips blank labels and back-to-back duplicates", () => {
    logDeviceActivity("use_keys", "   ");
    expect(loadActivity()).toEqual([]);

    logDeviceActivity("use_keys", "River", { profile_id: "p_river" });
    logDeviceActivity("use_keys", "River again", { profile_id: "p_river" });
    expect(loadActivity()).toHaveLength(1);

    logDeviceActivity("saved", "River", { profile_id: "p_river" });
    expect(loadActivity()).toHaveLength(2);

    logDeviceActivity("pin_added", "Door plate");
    logDeviceActivity("pin_added", "Door plate");
    expect(loadActivity().filter((row: { type: string }) => row.type === "pin_added")).toHaveLength(
      1
    );
  });

  it("caps stored entries at 40", () => {
    for (let i = 0; i < 45; i++) {
      logDeviceActivity("saved", `Card ${i}`, { profile_id: `p_${i}` });
    }
    expect(loadActivity()).toHaveLength(40);
    expect(loadActivity()[0].label).toBe("Card 44");
  });

  it("returns the latest matching activity time for a wallet row", () => {
    stubStorage({
      hc_device_activity: JSON.stringify([
        {
          type: "saved",
          label: "@river",
          at: "2026-06-02T12:00:00.000Z",
        },
        {
          type: "saved",
          label: "River",
          at: "2026-06-01T12:00:00.000Z",
        },
      ]),
    });
    expect(lastActivityForEntry({ label: "River", handle: "river" })).toBe(
      formatActivityTime("2026-06-02T12:00:00.000Z")
    );
    expect(lastActivityForEntry({ label: "Missing" })).toBe("");
  });

  it("returns empty for invalid activity timestamps", () => {
    expect(formatActivityTime("not-a-date")).toBe("");
  });
});
