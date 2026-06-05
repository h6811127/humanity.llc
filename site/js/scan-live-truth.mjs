/**
 * Browser live-truth gate for public scan pages (Phase 1).
 */
import {
  SCAN_ARRIVE_STRIP_VARIANT_CLASSES,
  SCAN_TRUTH_MISMATCH_BANNER,
  SCAN_TRUTH_PARTIAL_APPLY_BANNER,
  SCAN_TRUTH_UNVERIFIED_BANNER,
  arriveLabelForScanKind,
  arriveStripClassForScanKind,
  buildScanStatusUrl,
  scanTruthCacheBustUrl,
  scanTruthKindsMatch,
  scanTruthMismatchAction,
  scanTruthReloadSessionKey,
} from "./scan-live-truth-core.mjs";

export { buildScanStatusUrl, scanTruthKindsMatch, arriveLabelForScanKind };

/**
 * @param {HTMLElement | null | undefined} hero
 * @param {string} [origin]
 */
export async function fetchScanLiveTruth(hero, origin = location.origin) {
  const profileId = hero?.dataset?.profileId?.trim();
  const qrId = hero?.dataset?.qrId?.trim();
  const ssrKind = hero?.dataset?.ssrScanKind?.trim();
  if (!profileId || !qrId) {
    return { ok: false, reason: "missing_ids" };
  }

  const statusUrl = buildScanStatusUrl(origin, profileId, qrId);
  try {
    const res = await fetch(statusUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const body = await res.json().catch(() => null);
    const networkKind = body?.scan?.kind;
    if (!res.ok || !networkKind) {
      return {
        ok: false,
        reason: "http_error",
        status: res.status,
        statusUrl,
      };
    }
    const arriveLabel = arriveLabelForScanKind(networkKind);
    const match = scanTruthKindsMatch(ssrKind, networkKind);
    return {
      ok: true,
      statusUrl,
      ssrKind: ssrKind ?? null,
      networkKind,
      arriveLabel,
      match,
      body,
    };
  } catch {
    return { ok: false, reason: "network", statusUrl };
  }
}

/**
 * @param {string} message
 */
export function showScanTruthBanner(message) {
  const el = document.getElementById("scan-truth-unverified-banner");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

export function hideScanTruthBanner() {
  const el = document.getElementById("scan-truth-unverified-banner");
  if (el) el.hidden = true;
}

/**
 * @param {HTMLElement} strip
 * @param {string} kind
 * @param {string} arriveLabel
 */
export function applyArriveStripFromNetworkKind(strip, kind, arriveLabel) {
  if (!(strip instanceof HTMLElement)) return;
  strip.dataset.arriveLabel = arriveLabel;
  const labelEl = strip.querySelector(".scan-arrive-status-label");
  if (labelEl) labelEl.textContent = arriveLabel;
  for (const cls of SCAN_ARRIVE_STRIP_VARIANT_CLASSES) {
    strip.classList.remove(cls);
  }
  strip.classList.add(arriveStripClassForScanKind(kind));
}

/**
 * @param {HTMLElement | null | undefined} hero
 * @param {{ networkKind: string, arriveLabel: string }} truth
 */
export function applyNetworkTruthToHeroDom(hero, truth) {
  if (!(hero instanceof HTMLElement)) return;
  hero.dataset.ssrScanKind = truth.networkKind;
  const strip = hero.querySelector(".scan-arrive-strip");
  if (strip instanceof HTMLElement) {
    applyArriveStripFromNetworkKind(strip, truth.networkKind, truth.arriveLabel);
  }
  if (truth.networkKind === "active") {
    hero.dataset.scanActive = "1";
  } else {
    delete hero.dataset.scanActive;
  }
}

function reloadAttempted(profileId, qrId) {
  const key = scanTruthReloadSessionKey(profileId, qrId);
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markReloadAttempted(profileId, qrId) {
  const key = scanTruthReloadSessionKey(profileId, qrId);
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

function clearReloadAttempted(profileId, qrId) {
  const key = scanTruthReloadSessionKey(profileId, qrId);
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * @param {HTMLElement | null | undefined} hero
 * @param {{ networkKind: string, arriveLabel: string }} truth
 * @returns {"reload" | "applied"}
 */
export function handleScanTruthMismatch(hero, truth) {
  const profileId = hero?.dataset?.profileId?.trim();
  const qrId = hero?.dataset?.qrId?.trim();
  if (!profileId || !qrId) return "applied";

  const action = scanTruthMismatchAction(reloadAttempted(profileId, qrId));
  if (action === "reload") {
    markReloadAttempted(profileId, qrId);
    showScanTruthBanner(SCAN_TRUTH_MISMATCH_BANNER);
    location.replace(scanTruthCacheBustUrl(location.href));
    return "reload";
  }

  applyNetworkTruthToHeroDom(hero, truth);
  showScanTruthBanner(SCAN_TRUTH_PARTIAL_APPLY_BANNER);
  return "applied";
}

/**
 * @param {HTMLElement | null | undefined} hero
 * @param {{ arriveLabel: string, networkKind: string }} truth
 */
export function applyConfirmedScanTruth(hero, truth) {
  const profileId = hero?.dataset?.profileId?.trim();
  const qrId = hero?.dataset?.qrId?.trim();
  if (profileId && qrId) clearReloadAttempted(profileId, qrId);

  const strip = hero?.querySelector(".scan-arrive-strip");
  if (strip instanceof HTMLElement) {
    strip.dataset.arriveLabel = truth.arriveLabel;
  }
  hideScanTruthBanner();
}

export function showScanTruthUnverified() {
  showScanTruthBanner(SCAN_TRUTH_UNVERIFIED_BANNER);
}
