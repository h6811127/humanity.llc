/**
 * User-visible shell copy by browsing context (browser tab vs standalone PWA).
 * @see docs/PWA_INSTALL.md Phase 11
 */

/** @typedef {'browser' | 'standalone'} ShellSurface */

/**
 * @param {boolean} standalone
 * @returns {ShellSurface}
 */
export function shellSurfaceFromStandalone(standalone) {
  return standalone ? "standalone" : "browser";
}

/**
 * @param {ShellSurface} surface
 */
export function controlHereEyebrow(surface) {
  return surface === "standalone" ? "Active here" : "Active in this tab";
}

/**
 * @param {ShellSurface} surface
 */
export function controlHereDetail(surface) {
  return surface === "standalone"
    ? "Signing keys stay in this app until you leave."
    : "Signing keys stay here until you close this tab.";
}

/**
 * @param {ShellSurface} surface
 */
export function keysInOtherContextEyebrow(surface, opts = {}) {
  if (surface !== "standalone") return "Keys in another tab";
  const name = opts.companionBrowser ?? "Safari";
  return `Keys in ${name}`;
}

/**
 * @param {ShellSurface} surface
 */
export function keysInOtherContextDetail(surface, opts = {}) {
  if (surface !== "standalone") {
    return "Save or manage in that tab’s card workspace, or open controls here on this page.";
  }
  const name = opts.companionBrowser ?? "Safari";
  return `Save or manage in ${name}, or open controls here on this page.`;
}

/**
 * @param {number} extraCount
 * @param {ShellSurface} surface
 */
export function otherContextPresenceExtra(extraCount, surface) {
  if (extraCount <= 0) return "";
  const noun = surface === "standalone" ? "window" : "tab";
  return ` (+${extraCount} other ${noun}${extraCount === 1 ? "" : "s"})`;
}

/**
 * @param {number} count
 * @param {ShellSurface} surface
 * @param {{ companionBrowser?: string | null }} [opts]
 */
export function crossTabAggregateTitle(count, surface, opts = {}) {
  if (count <= 0) return "";
  const companion = opts.companionBrowser ?? "Safari";
  if (surface === "standalone") {
    if (count === 1) return `Managing in ${companion}`;
    return `Managing in ${count} other windows`;
  }
  if (count === 1) return "Managing in 1 other tab";
  return `Managing in ${count} other tabs`;
}

/**
 * @param {ShellSurface} surface
 */
export function crossTabPresenceFallbackLabel(surface) {
  return surface === "standalone" ? "Other window" : "Other tab";
}

/**
 * @param {number} count
 * @param {string} [who]
 * @param {ShellSurface} [surface]
 */
export function inboxAriaManagingInOtherContext(count, who = "", surface = "browser") {
  const suffix = who ? ` (${who})` : "";
  if (surface === "standalone") {
    if (count > 1) return `managing in ${count} other windows${suffix}`;
    return `managing elsewhere${suffix}`;
  }
  if (count > 1) return `managing in ${count} other tabs${suffix}`;
  return `managing in 1 other tab${suffix}`;
}

/**
 * @param {string} [who]
 * @param {ShellSurface} [surface]
 */
export function inboxAriaOrphanManagingElsewhere(who = "", surface = "browser") {
  const suffix = who ? ` (${who})` : "";
  return surface === "standalone"
    ? `still managing elsewhere${suffix}`
    : `still managing in another tab${suffix}`;
}

/**
 * @param {ShellSurface} surface
 * @param {{ companionBrowser?: string | null }} [opts]
 */
export function statusKeyCrossTabLine(surface, opts = {}) {
  if (surface !== "standalone") return "Blue notch - keys in another tab";
  const name = opts.companionBrowser ?? "Safari";
  return `Blue notch - keys in ${name}`;
}

/**
 * @param {ShellSurface} surface
 * @param {{ companionBrowser?: string | null }} [opts]
 */
export function dotOverlayCrossTabPhrase(surface, opts = {}) {
  if (surface !== "standalone") return "managing in another tab";
  const name = opts.companionBrowser ?? "Safari";
  return `managing in ${name}`;
}

/**
 * Standalone PWA companion browser label (P1-MOTO-08 — not Safari on Chrome Android).
 * @param {{ standalone?: boolean, userAgent?: string }} ctx
 */
export function companionBrowserLabel(ctx = {}) {
  if (!ctx.standalone) return null;
  const ua = ctx.userAgent ?? "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "Safari";
  if (/Android/i.test(ua)) return "Chrome";
  return "your browser";
}

/**
 * @param {Window | { navigator?: { userAgent?: string } }} [win]
 */
export function readShellCopyContext(win = typeof window !== "undefined" ? window : undefined) {
  const ua = win?.navigator?.userAgent ?? "";
  const standalone =
    typeof win !== "undefined" &&
    typeof win.matchMedia === "function" &&
    win.matchMedia("(display-mode: standalone)").matches;
  const surface = shellSurfaceFromStandalone(standalone);
  const companionBrowser = companionBrowserLabel({ standalone, userAgent: ua });
  return { surface, companionBrowser, standalone, userAgent: ua };
}

/**
 * @param {boolean} compact
 * @param {ShellSurface} surface
 * @param {{ companionBrowser?: string | null }} [opts]
 */
export function browserAlertBackgroundCopy(compact, surface, opts = {}) {
  const companion = opts.companionBrowser ?? null;
  if (surface === "standalone") {
    if (companion === "Chrome") {
      return compact
        ? "Get a Chrome notification when this app is in the background."
        : "Someone is waiting for live proof. Get a Chrome notification when this app is in the background?";
    }
    if (companion === "Safari") {
      return compact
        ? "Get a Safari notification when this app is in the background."
        : "Someone is waiting for live proof. Get a Safari notification when this app is in the background?";
    }
    return compact
      ? "Get an alert when this app is in the background."
      : "Someone is waiting for live proof. Get an alert when this app is in the background?";
  }
  return compact
    ? "Get an alert when this tab is in the background."
    : "Someone is waiting for live proof. Get an alert when this tab is in the background?";
}

/**
 * @param {ShellSurface} surface
 * @param {{ companionBrowser?: string | null }} [opts]
 */
export function browserAlertWhileOpenCopy(surface, opts = {}) {
  if (surface === "standalone") {
    const companion = opts.companionBrowser ?? null;
    if (companion === "Chrome") {
      return "use the inbox badge or foreground strip while this app is open (Chrome handles background alerts)";
    }
    if (companion === "Safari") {
      return "use the inbox badge or foreground strip while this app is open";
    }
    return "use the inbox badge while this app is open";
  }
  return "use the inbox badge while this tab is open";
}
