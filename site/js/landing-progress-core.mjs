/**
 * Landing progress strip resolver (pure; no DOM).
 * @see docs/LANDING_PROGRESS_STRIP.md
 */

export const WALLET_KEY = "hc_wallet";
export const PINS_KEY = "hc_device_pins";
export const SETUP_DONE_KEY = "hc_setup_done";

/**
 * @typedef {1 | 2 | 3 | 4} LandingLegendStep
 */

/**
 * @typedef {{
 *   label: string,
 *   href: string,
 *   legendStep: LandingLegendStep | null,
 *   legendDone: LandingLegendStep[],
 * }} LandingContinue
 */

/**
 * @param {unknown} raw
 * @returns {Record<string, true>}
 */
export function parseSetupDoneMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  /** @type {Record<string, true>} */
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value) out[key] = true;
  }
  return out;
}

/**
 * @param {Array<{ profile_id?: string | null }>} wallet
 * @param {Record<string, true>} setupDone
 */
function walletProfilesNeedSetup(wallet, setupDone) {
  const ids = wallet
    .map((e) => (typeof e?.profile_id === "string" ? e.profile_id.trim() : ""))
    .filter(Boolean);
  if (!ids.length) return false;
  return ids.some((id) => !setupDone[id]);
}

/**
 * @param {{
 *   wallet?: Array<{ profile_id?: string | null }>,
 *   pins?: unknown[],
 *   setupDone?: Record<string, true>,
 *   unsavedTabKeys?: boolean,
 * }} input
 * @returns {LandingContinue}
 */
export function resolveLandingContinue(input = {}) {
  const wallet = Array.isArray(input.wallet) ? input.wallet : [];
  const pins = Array.isArray(input.pins) ? input.pins : [];
  const setupDone = input.setupDone ?? {};
  const unsavedTabKeys = Boolean(input.unsavedTabKeys);
  const count = wallet.length;

  if (unsavedTabKeys) {
    return {
      label: "Save keys on this device",
      href: "/wallet/",
      legendStep: 2,
      legendDone: [1],
    };
  }

  if (!count) {
    return {
      label: "Create your first live object",
      href: "/create/",
      legendStep: 1,
      legendDone: [],
    };
  }

  /** @type {LandingLegendStep[]} */
  const legendDone = [1, 2];
  const needsSetup = walletProfilesNeedSetup(wallet, setupDone);
  const hasPins = pins.length > 0;

  if (needsSetup || !hasPins) {
    return {
      label: "Print your QR",
      href: "/wallet/",
      legendStep: 3,
      legendDone,
    };
  }

  return {
    label: count === 1 ? "Open My cards" : `Open My cards (${count} saved)`,
    href: "/wallet/",
    legendStep: 4,
    legendDone: [1, 2, 3],
  };
}
