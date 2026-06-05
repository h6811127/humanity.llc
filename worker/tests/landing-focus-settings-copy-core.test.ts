import { describe, expect, it } from "vitest";

import {
  LANDING_LEARN_HELP_GUIDE_SUB,
  LANDING_LEARN_SAVED_CONTROLS_TITLE,
  LANDING_ROW_ALERTS_TITLE,
  LANDING_ROW_MANAGE_SAVED_QRS_TITLE,
  LANDING_ROW_SAVED_CONTROLS_TITLE,
  LANDING_ROW_SIMPLE_MODE_TITLE,
  LANDING_SETTINGS_GROUP_APP,
  LANDING_SETTINGS_GROUP_LEARN,
  LANDING_SETTINGS_GROUP_SAVED,
  MANAGE_SAVED_QRS_FALLBACK_HREF,
  resolveManageSavedQrsWalletEntry,
  simpleModeToggleSub,
} from "../../site/js/landing-focus-settings-copy-core.mjs";

describe("landing focus settings copy", () => {
  it("exports grouped section labels", () => {
    expect(LANDING_SETTINGS_GROUP_SAVED).toBe("Saved on this device");
    expect(LANDING_SETTINGS_GROUP_APP).toBe("App settings");
    expect(LANDING_SETTINGS_GROUP_LEARN).toBe("Learn");
  });

  it("exports landing-only row titles", () => {
    expect(LANDING_ROW_SAVED_CONTROLS_TITLE).toBe("Saved controls");
    expect(LANDING_ROW_MANAGE_SAVED_QRS_TITLE).toBe("Open current item");
    expect(LANDING_ROW_ALERTS_TITLE).toBe("Alerts");
    expect(LANDING_ROW_SIMPLE_MODE_TITLE).toBe("Simple mode");
    expect(LANDING_LEARN_HELP_GUIDE_SUB).toBe("How saved QRs work");
    expect(LANDING_LEARN_SAVED_CONTROLS_TITLE).toBe("How saved controls work");
  });

  it("simple mode toggle sub reflects on state", () => {
    expect(simpleModeToggleSub(false)).toBe("Hide extra help");
    expect(simpleModeToggleSub(true)).toBe("Show intro again");
  });
});

describe("resolveManageSavedQrsWalletEntry", () => {
  const wallet = [
    { profile_id: "prof_a", label: "A" },
    { profile_id: "prof_b", label: "B" },
  ];

  it("returns null for empty wallet", () => {
    expect(resolveManageSavedQrsWalletEntry([], "prof_a")).toBeNull();
  });

  it("prefers last active profile when set", () => {
    expect(resolveManageSavedQrsWalletEntry(wallet, "prof_b")?.profile_id).toBe("prof_b");
  });

  it("returns sole entry without last active", () => {
    expect(resolveManageSavedQrsWalletEntry([wallet[0]], null)?.profile_id).toBe("prof_a");
  });

  it("returns null for multi-wallet without last active", () => {
    expect(resolveManageSavedQrsWalletEntry(wallet, null)).toBeNull();
    expect(MANAGE_SAVED_QRS_FALLBACK_HREF).toBe("/wallet/");
  });
});
