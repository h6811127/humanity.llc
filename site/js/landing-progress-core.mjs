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
 *   profile_id?: string | null,
 *   qr_id?: string | null,
 * }} LandingSessionHint
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
 * @param {{ profile_id?: string | null, qr_id?: string | null, scan_url?: string | null } | null | undefined} entry
 * @returns {string | null}
 */
export function walletEntryQrId(entry) {
  if (!entry) return null;
  const direct = typeof entry.qr_id === "string" ? entry.qr_id.trim() : "";
  if (direct) return direct;
  const scanUrl = typeof entry.scan_url === "string" ? entry.scan_url.trim() : "";
  if (!scanUrl) return null;
  try {
    const q = new URL(scanUrl).searchParams.get("q");
    return q?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * @param {string} profileId
 * @param {string | null | undefined} qrId
 * @param {{ fresh?: boolean, hash?: string | null }} [opts]
 */
export function createdPageHref(profileId, qrId, opts = {}) {
  const params = new URLSearchParams();
  params.set("profile_id", profileId);
  const q = qrId?.trim();
  if (q) params.set("qr_id", q);
  if (opts.fresh) params.set("fresh", "1");
  let href = `/created/?${params.toString()}`;
  if (opts.hash) {
    const hash = String(opts.hash).replace(/^#/, "");
    if (hash) href += `#${hash}`;
  }
  return href;
}

/**
 * @param {Array<{ profile_id?: string | null }>} wallet
 * @param {LandingSessionHint | null | undefined} session
 * @param {Record<string, true>} setupDone
 */
export function pickResumeWalletEntry(wallet, session, setupDone) {
  if (!wallet.length) return null;
  const sessionId =
    typeof session?.profile_id === "string" ? session.profile_id.trim() : "";
  if (sessionId) {
    const match = wallet.find((e) => e.profile_id === sessionId);
    if (match) return match;
  }
  const incomplete = wallet.find((e) => {
    const id = typeof e?.profile_id === "string" ? e.profile_id.trim() : "";
    return id && !setupDone[id];
  });
  if (incomplete) return incomplete;
  return wallet[wallet.length - 1];
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
 *   wallet?: Array<{ profile_id?: string | null, qr_id?: string | null, scan_url?: string | null }>,
 *   pins?: unknown[],
 *   setupDone?: Record<string, true>,
 *   unsavedTabKeys?: boolean,
 *   session?: LandingSessionHint | null,
 * }} input
 * @returns {LandingContinue}
 */
export function resolveLandingContinue(input = {}) {
  const wallet = Array.isArray(input.wallet) ? input.wallet : [];
  const pins = Array.isArray(input.pins) ? input.pins : [];
  const setupDone = input.setupDone ?? {};
  const unsavedTabKeys = Boolean(input.unsavedTabKeys);
  const session = input.session ?? null;
  const count = wallet.length;

  if (unsavedTabKeys) {
    const profileId =
      typeof session?.profile_id === "string" ? session.profile_id.trim() : "";
    const qrId = walletEntryQrId(session) ?? session?.qr_id ?? null;
    return {
      label: "Save keys on this device",
      href: profileId
        ? createdPageHref(profileId, qrId, { fresh: true, hash: "setup" })
        : "/wallet/",
      legendStep: 2,
      legendDone: profileId ? [1] : [],
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
  const resume = pickResumeWalletEntry(wallet, session, setupDone);

  if (needsSetup || !hasPins) {
    const profileId =
      typeof resume?.profile_id === "string" ? resume.profile_id.trim() : "";
    const qrId = walletEntryQrId(resume);
    const href = profileId
      ? needsSetup
        ? createdPageHref(profileId, qrId, { fresh: true, hash: "setup-qr" })
        : createdPageHref(profileId, qrId, { hash: "deploy-print" })
      : "/wallet/";
    return {
      label: "Print your QR",
      href,
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
