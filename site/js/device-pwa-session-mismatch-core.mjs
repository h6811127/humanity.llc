/**
 * PWA vs in-browser signing context mismatch (Safari P2-2 · R5).
 * @see docs/SAFARI_KEYS_CUSTODY.md R5
 */

export const LAST_SIGNING_SHELL_MODE_KEY = "hc_last_signing_shell_mode";

/** @typedef {"standalone" | "browser"} SigningShellMode */

/**
 * @param {boolean} standalone
 * @returns {SigningShellMode}
 */
export function signingShellModeFromStandalone(standalone) {
  return standalone ? "standalone" : "browser";
}

/**
 * @param {string | null | undefined} raw
 * @returns {SigningShellMode | null}
 */
export function parseLastSigningShellMode(raw) {
  if (raw === "standalone" || raw === "browser") return raw;
  return null;
}

/**
 * @param {SigningShellMode} mode
 */
export function rememberLastSigningShellMode(mode) {
  if (mode !== "standalone" && mode !== "browser") return;
  try {
    localStorage.setItem(LAST_SIGNING_SHELL_MODE_KEY, mode);
  } catch {
    /* private mode */
  }
}

/**
 * @param {{
 *   standalone: boolean,
 *   hasTabSigningKeys: boolean,
 *   walletSigningKeyCount: number,
 *   lastSigningShellMode?: SigningShellMode | null,
 *   isIosWebKit?: boolean,
 * }} input
 * @returns {{
 *   lastMode: SigningShellMode,
 *   currentMode: SigningShellMode,
 *   canRestoreInThisTab: boolean,
 *   iosEmptyWalletAfterPwa?: boolean,
 * } | null}
 */
export function detectPwaSessionMismatch(input) {
  const walletSigningKeyCount = input.walletSigningKeyCount ?? 0;
  if (input.hasTabSigningKeys) return null;

  const lastMode = input.lastSigningShellMode ?? null;
  if (!lastMode) return null;

  const currentMode = signingShellModeFromStandalone(input.standalone);
  if (lastMode === currentMode) return null;

  if (
    input.isIosWebKit &&
    currentMode === "browser" &&
    lastMode === "standalone" &&
    walletSigningKeyCount < 1
  ) {
    return {
      lastMode,
      currentMode,
      canRestoreInThisTab: false,
      iosEmptyWalletAfterPwa: true,
    };
  }

  if (walletSigningKeyCount < 1) return null;

  return {
    lastMode,
    currentMode,
    canRestoreInThisTab: currentMode === "standalone" && lastMode === "browser",
  };
}
