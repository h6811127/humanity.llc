import { describe, expect, it } from "vitest";

import {
  PWA_INSTALL_BLOCKED_INBOX_KINDS,
  PWA_INSTALL_DISMISS_COOLDOWN_MS,
  PWA_INSTALL_MIN_SAVED_CARDS,
  canTriggerNativeInstallPrompt,
  isInstallDismissSnoozed,
  isStandaloneDisplayMode,
  shouldShowIosAddToHomeInstructions,
  shouldShowPwaInstallSurface,
} from "../../site/js/pwa-install-ux-core.mjs";

const baseInput = {
  pathname: "/",
  standalone: false,
  deferredPromptAvailable: true,
  isIosSafari: false,
  dismissedAtIso: null,
  savedCardCount: 2,
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
