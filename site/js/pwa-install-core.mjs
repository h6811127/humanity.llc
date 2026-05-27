export const PWA_INSTALL_DISMISSED_KEY = "hc_pwa_install_dismissed";
export const PWA_INSTALL_INSTALLED_KEY = "hc_pwa_install_installed";

/**
 * @param {{ standaloneMedia?: boolean, navigatorStandalone?: boolean }} env
 * @returns {boolean}
 */
export function isStandaloneDisplay(env) {
  return Boolean(env?.standaloneMedia || env?.navigatorStandalone);
}

/**
 * @param {{ userAgent?: string, platform?: string, maxTouchPoints?: number }} env
 * @returns {boolean}
 */
export function isLikelyIosDevice(env) {
  const ua = String(env?.userAgent || "");
  const platform = String(env?.platform || "");
  return /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && (env?.maxTouchPoints || 0) > 1);
}

/**
 * @param {{
 *   standalone: boolean,
 *   dismissed: boolean,
 *   installed: boolean,
 *   promptAvailable: boolean,
 *   ios: boolean,
 * }} state
 * @returns {'install' | 'ios-instructions' | 'hidden'}
 */
export function pwaInstallPromptMode(state) {
  if (state.standalone || state.installed || state.dismissed) return "hidden";
  if (state.promptAvailable) return "install";
  if (state.ios) return "ios-instructions";
  return "hidden";
}
