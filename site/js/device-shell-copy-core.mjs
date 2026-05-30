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
export function keysInOtherContextEyebrow(surface) {
  return surface === "standalone" ? "Keys in Safari" : "Keys in another tab";
}

/**
 * @param {ShellSurface} surface
 */
export function keysInOtherContextDetail(surface) {
  return surface === "standalone"
    ? "Save or manage in Safari, or open controls here on this page."
    : "Save or manage in that tab’s card workspace, or open controls here on this page.";
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
 */
export function crossTabAggregateTitle(count, surface) {
  if (count <= 0) return "";
  if (surface === "standalone") {
    if (count === 1) return "Managing in Safari";
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
 */
export function statusKeyCrossTabLine(surface) {
  return surface === "standalone"
    ? "Blue notch - keys in Safari"
    : "Blue notch - keys in another tab";
}

/**
 * @param {ShellSurface} surface
 */
export function dotOverlayCrossTabPhrase(surface) {
  return surface === "standalone" ? "managing in Safari" : "managing in another tab";
}

/**
 * @param {boolean} compact
 * @param {ShellSurface} surface
 */
export function browserAlertBackgroundCopy(compact, surface) {
  if (surface === "standalone") {
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
 */
export function browserAlertWhileOpenCopy(surface) {
  return surface === "standalone"
    ? "use the inbox badge while this app is open"
    : "use the inbox badge while this tab is open";
}
