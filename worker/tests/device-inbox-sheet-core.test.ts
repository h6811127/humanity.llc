import { describe, expect, it } from "vitest";

import {
  inboxSheetMountAllowed,
  inboxSheetReconcileAction,
} from "../../site/js/device-inbox-sheet-core.mjs";

describe("inboxSheetMountAllowed", () => {
  it("allows mount when top-chrome exists", () => {
    expect(
      inboxSheetMountAllowed({
        getElementById: (id) => (id === "top-chrome" ? {} : null),
        body: { classList: { contains: () => false } },
      })
    ).toBe(true);
  });

  it("allows mount when body has shell chrome class", () => {
    expect(
      inboxSheetMountAllowed({
        getElementById: () => null,
        body: { classList: { contains: (c) => c === "has-shell-chrome" } },
      })
    ).toBe(true);
  });

  it("blocks mount on scan-only pages", () => {
    expect(
      inboxSheetMountAllowed({
        getElementById: () => null,
        body: { classList: { contains: () => false } },
      })
    ).toBe(false);
  });
});

describe("inboxSheetReconcileAction", () => {
  it("does nothing when inbox sheet is expanded", () => {
    expect(
      inboxSheetReconcileAction({
        sheetCollapsed: false,
        bodySheetOpen: true,
        chromeInboxLocked: true,
        sheetOpenFlag: true,
        backdropHidden: false,
        backdropVisibleClass: true,
      })
    ).toBe("none");
  });

  it("closes sheet when body, chrome, or in-memory flag still open", () => {
    expect(
      inboxSheetReconcileAction({
        sheetCollapsed: true,
        bodySheetOpen: true,
        chromeInboxLocked: false,
        sheetOpenFlag: false,
        backdropHidden: true,
        backdropVisibleClass: false,
      })
    ).toBe("close_sheet");
    expect(
      inboxSheetReconcileAction({
        sheetCollapsed: true,
        bodySheetOpen: false,
        chromeInboxLocked: true,
        sheetOpenFlag: false,
        backdropHidden: true,
        backdropVisibleClass: false,
      })
    ).toBe("close_sheet");
    expect(
      inboxSheetReconcileAction({
        sheetCollapsed: true,
        bodySheetOpen: false,
        chromeInboxLocked: false,
        sheetOpenFlag: true,
        backdropHidden: true,
        backdropVisibleClass: false,
      })
    ).toBe("close_sheet");
  });

  it("hides backdrop when collapsed and chrome is clean", () => {
    expect(
      inboxSheetReconcileAction({
        sheetCollapsed: true,
        bodySheetOpen: false,
        chromeInboxLocked: false,
        sheetOpenFlag: false,
        backdropHidden: false,
        backdropVisibleClass: false,
      })
    ).toBe("hide_backdrop");
  });

  it("needs no action when collapsed and fully closed", () => {
    expect(
      inboxSheetReconcileAction({
        sheetCollapsed: true,
        bodySheetOpen: false,
        chromeInboxLocked: false,
        sheetOpenFlag: false,
        backdropHidden: true,
        backdropVisibleClass: false,
      })
    ).toBe("none");
  });
});
