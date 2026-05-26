import { describe, expect, it } from "vitest";

import { hubSheetReconcileAction } from "../../site/js/device-hub-sheet-core.mjs";

describe("hubSheetReconcileAction", () => {
  it("does nothing when hub is expanded", () => {
    expect(
      hubSheetReconcileAction({
        hubCollapsed: false,
        bodySheetOpen: true,
        chromeHubLocked: true,
        backdropHidden: false,
        backdropVisibleClass: true,
      })
    ).toBe("none");
  });

  it("closes sheet when body or chrome still reflect open state", () => {
    expect(
      hubSheetReconcileAction({
        hubCollapsed: true,
        bodySheetOpen: true,
        chromeHubLocked: false,
        backdropHidden: true,
        backdropVisibleClass: false,
      })
    ).toBe("close_sheet");
    expect(
      hubSheetReconcileAction({
        hubCollapsed: true,
        bodySheetOpen: false,
        chromeHubLocked: true,
        backdropHidden: true,
        backdropVisibleClass: false,
      })
    ).toBe("close_sheet");
  });

  it("hides backdrop when hub collapsed and chrome is clean", () => {
    expect(
      hubSheetReconcileAction({
        hubCollapsed: true,
        bodySheetOpen: false,
        chromeHubLocked: false,
        backdropHidden: false,
        backdropVisibleClass: false,
      })
    ).toBe("hide_backdrop");
    expect(
      hubSheetReconcileAction({
        hubCollapsed: true,
        bodySheetOpen: false,
        chromeHubLocked: false,
        backdropHidden: true,
        backdropVisibleClass: true,
      })
    ).toBe("hide_backdrop");
  });

  it("needs no action when collapsed and fully closed", () => {
    expect(
      hubSheetReconcileAction({
        hubCollapsed: true,
        bodySheetOpen: false,
        chromeHubLocked: false,
        backdropHidden: true,
        backdropVisibleClass: false,
      })
    ).toBe("none");
  });
});
