import { describe, expect, it } from "vitest";

import {
  PWA_INSTALL_BLOCKED_INBOX_KINDS,
  PWA_INSTALL_DISMISS_COOLDOWN_MS,
  PWA_INSTALL_MIN_SAVED_CARDS,
  canTriggerNativeInstallPrompt,
  hasAnyWalletSetupDone,
  isInstallDismissSnoozed,
  isStandaloneDisplayMode,
  parseSetupDoneMap,
  shouldShowIosAddToHomeInstructions,
  shouldShowPwaInstallDeferralHint,
  shouldShowPwaInstallSurface,
} from "../../site/js/pwa-install-ux-core.mjs";
import {
  pwaInstallCardBodyHtml,
  pwaInstallDeferralCardBodyHtml,
} from "../../site/js/pwa-install-html.mjs";

const baseInput = {
  pathname: "/",
  standalone: false,
  deferredPromptAvailable: true,
  isIosSafari: false,
  dismissedAtIso: null,
  savedCardCount: 2,
  anyWalletSetupDone: true,
  inboxKinds: [],
  deviceStatusLoadError: false,
};

describe("shouldShowPwaInstallSurface", () => {
  it("shows for returning steward on landing with deferred prompt", () => {
    expect(shouldShowPwaInstallSurface(baseInput)).toBe(true);
  });

  it("hides when already standalone", () => {
    expect(shouldShowPwaInstallSurface({ ...baseInput, standalone: true })).toBe(false);
  });

  it("hides on scan paths", () => {
    expect(shouldShowPwaInstallSurface({ ...baseInput, pathname: "/c/abc" })).toBe(false);
  });

  it("hides on create flow", () => {
    expect(shouldShowPwaInstallSurface({ ...baseInput, pathname: "/create/" })).toBe(false);
  });

  it("hides without saved cards", () => {
    expect(
      shouldShowPwaInstallSurface({ ...baseInput, savedCardCount: 0 })
    ).toBe(false);
    expect(PWA_INSTALL_MIN_SAVED_CARDS).toBe(1);
  });

  it("hides until at least one wallet row finished setup (P4)", () => {
    expect(
      shouldShowPwaInstallSurface({ ...baseInput, anyWalletSetupDone: false })
    ).toBe(false);
    expect(
      shouldShowPwaInstallDeferralHint({ ...baseInput, anyWalletSetupDone: false })
    ).toBe(true);
    expect(
      shouldShowPwaInstallDeferralHint({ ...baseInput, anyWalletSetupDone: true })
    ).toBe(false);
  });

  it("hasAnyWalletSetupDone checks wallet profile ids against setup map", () => {
    const map = { abc: true, def: false };
    expect(hasAnyWalletSetupDone(map, ["def", "ghi"])).toBe(false);
    expect(hasAnyWalletSetupDone(map, ["ghi", "abc"])).toBe(true);
    expect(parseSetupDoneMap(JSON.stringify(map))).toEqual(map);
    expect(parseSetupDoneMap("not-json")).toEqual({});
  });

  it("hides when dismiss snooze active", () => {
    const now = Date.parse("2026-05-27T12:00:00.000Z");
    const dismissedAt = new Date(now - 1000).toISOString();
    expect(
      isInstallDismissSnoozed(dismissedAt, now)
    ).toBe(true);
    expect(
      shouldShowPwaInstallSurface({
        ...baseInput,
        dismissedAtIso: dismissedAt,
        nowMs: now,
      })
    ).toBe(false);
  });

  it("shows after dismiss cooldown expires", () => {
    const now = Date.parse("2026-05-27T12:00:00.000Z");
    const dismissedAt = new Date(now - PWA_INSTALL_DISMISS_COOLDOWN_MS - 1).toISOString();
    expect(isInstallDismissSnoozed(dismissedAt, now)).toBe(false);
    expect(
      shouldShowPwaInstallSurface({
        ...baseInput,
        dismissedAtIso: dismissedAt,
        nowMs: now,
      })
    ).toBe(true);
  });

  it("hides when urgent inbox kinds are active", () => {
    for (const kind of PWA_INSTALL_BLOCKED_INBOX_KINDS) {
      expect(
        shouldShowPwaInstallSurface({ ...baseInput, inboxKinds: [kind] })
      ).toBe(false);
    }
  });

  it("hides when status graph failed to load", () => {
    expect(
      shouldShowPwaInstallSurface({ ...baseInput, deviceStatusLoadError: true })
    ).toBe(false);
  });

  it("shows iOS manual path without deferred prompt", () => {
    expect(
      shouldShowPwaInstallSurface({
        ...baseInput,
        deferredPromptAvailable: false,
        isIosSafari: true,
      })
    ).toBe(true);
  });

  it("hides when no platform install path exists", () => {
    expect(
      shouldShowPwaInstallSurface({
        ...baseInput,
        deferredPromptAvailable: false,
        isIosSafari: false,
      })
    ).toBe(false);
  });
});

describe("platform helpers", () => {
  it("detects standalone display mode", () => {
    expect(isStandaloneDisplayMode({ matches: true })).toBe(true);
    expect(isStandaloneDisplayMode({ matches: false })).toBe(false);
  });

  it("gates native prompt availability", () => {
    expect(
      canTriggerNativeInstallPrompt({ deferredPromptAvailable: true, standalone: false })
    ).toBe(true);
    expect(
      canTriggerNativeInstallPrompt({ deferredPromptAvailable: true, standalone: true })
    ).toBe(false);
  });

  it("detects iOS manual instructions path", () => {
    expect(
      shouldShowIosAddToHomeInstructions({
        isIosSafari: true,
        standalone: false,
        deferredPromptAvailable: false,
      })
    ).toBe(true);
    expect(
      shouldShowIosAddToHomeInstructions({
        isIosSafari: false,
        standalone: false,
        deferredPromptAvailable: false,
      })
    ).toBe(false);
  });
});

describe("pwaInstallCardBodyHtml", () => {
  it("renders Chromium install CTA and iOS manual copy", () => {
    const chromium = pwaInstallCardBodyHtml({ iosManual: false });
    expect(chromium).toContain("Install on this device");
    expect(chromium).toContain("data-pwa-install-confirm");
    expect(chromium).toContain("data-pwa-install-dismiss");

    const ios = pwaInstallCardBodyHtml({ iosManual: true });
    expect(ios).toContain("Add to Home Screen");
    expect(ios).toContain("Share");
    expect(ios).not.toContain("data-pwa-install-confirm");
  });

  it("renders setup deferral copy (P4)", () => {
    const deferral = pwaInstallDeferralCardBodyHtml();
    expect(deferral).toContain("Finish your first object in Safari");
    expect(deferral).toContain("data-pwa-install-dismiss");
    expect(deferral).not.toContain("data-pwa-install-confirm");
  });
});
