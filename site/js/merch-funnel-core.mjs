/**
 * Merch funnel attribution (M8.4) — session-only ref carry + allowed ref list.
 * No PII; aggregate server counters only.
 */

export const MERCH_FUNNEL_SESSION_KEY = "hc_merch_create_ref";
export const MERCH_FUNNEL_BEACON_PREFIX = "hc_merch_beacon_";

export const ALLOWED_MERCH_REFS = new Set([
  "tier0_sticker",
  "tier0_shop",
  "customize_shop",
  "customize_hoodie",
  "scan_customize",
]);

/** Refs that continue to /shop/customize/ after card create (docs/MERCH_FUNNEL_MVP.md). */
export const CUSTOMIZE_FUNNEL_REFS = new Set([
  "scan_customize",
  "customize_shop",
  "customize_hoodie",
]);

const REF_PATTERN = /^[a-z0-9_]{2,32}$/;

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeMerchRef(raw) {
  if (typeof raw !== "string") return null;
  const ref = raw.trim().toLowerCase();
  if (!REF_PATTERN.test(ref)) return null;
  if (!ALLOWED_MERCH_REFS.has(ref)) return null;
  return ref;
}

/**
 * @param {URL | Location} [url]
 * @returns {string | null}
 */
export function readMerchRefFromUrl(url = location) {
  try {
    const params = url instanceof URL ? url.searchParams : new URL(url.href).searchParams;
    return normalizeMerchRef(params.get("hc_ref"));
  } catch {
    return null;
  }
}

/**
 * @param {string} ref
 */
export function persistMerchCreateRef(ref) {
  const normalized = normalizeMerchRef(ref);
  if (!normalized) return;
  try {
    sessionStorage.setItem(MERCH_FUNNEL_SESSION_KEY, normalized);
  } catch {
    /* sessionStorage unavailable */
  }
}

/**
 * @returns {string | null}
 */
export function peekMerchCreateRef() {
  try {
    return normalizeMerchRef(sessionStorage.getItem(MERCH_FUNNEL_SESSION_KEY));
  } catch {
    return null;
  }
}

export function clearMerchCreateRef() {
  try {
    sessionStorage.removeItem(MERCH_FUNNEL_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string | null | undefined} ref
 * @returns {boolean}
 */
export function shouldPostCreateRedirectToCustomize(ref) {
  const normalized = normalizeMerchRef(ref);
  return normalized !== null && CUSTOMIZE_FUNNEL_REFS.has(normalized);
}

/**
 * After successful POST /cards — customize funnel or /created/ workspace.
 * @param {string | null | undefined} ref
 * @param {{ origin?: string, profileId: string, qrId: string, fresh?: boolean }} opts
 * @returns {string}
 */
export function buildPostCreateDestinationUrl(ref, opts) {
  const origin = (opts.origin ?? "https://humanity.llc").replace(/\/$/, "");
  const normalized = normalizeMerchRef(ref);
  if (normalized && CUSTOMIZE_FUNNEL_REFS.has(normalized)) {
    const customize = new URL(`${origin}/shop/customize/`);
    customize.searchParams.set("hc_ref", normalized);
    return customize.href;
  }
  const created = new URL(`${origin}/created/`);
  created.searchParams.set("profile_id", opts.profileId);
  created.searchParams.set("qr_id", opts.qrId);
  if (opts.fresh) created.searchParams.set("fresh", "1");
  return created.href;
}

/**
 * @param {string} href
 * @param {string | null} ref
 * @param {string} pathPrefix — e.g. `/create` or `/shop/customize`
 * @returns {string}
 */
export function appendMerchRefToPath(href, ref, pathPrefix) {
  const normalized = normalizeMerchRef(ref);
  if (!normalized) return href;
  try {
    const base =
      typeof location !== "undefined" && location.origin
        ? location.origin
        : "https://humanity.llc";
    const u = new URL(href, base);
    if (!u.pathname.startsWith(pathPrefix)) return href;
    if (u.searchParams.has("hc_ref")) return href;
    u.searchParams.set("hc_ref", normalized);
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return href;
  }
}

/**
 * @param {string} href
 * @param {string | null} ref
 * @returns {string}
 */
export function appendMerchRefToCreateUrl(href, ref) {
  return appendMerchRefToPath(href, ref, "/create");
}

/**
 * @param {string} href
 * @param {string | null} ref
 * @returns {string}
 */
export function appendMerchRefToCustomizeUrl(href, ref) {
  return appendMerchRefToPath(href, ref, "/shop/customize");
}

/**
 * @param {string} ref
 * @returns {boolean}
 */
export function merchBeaconAlreadySent(ref) {
  const normalized = normalizeMerchRef(ref);
  if (!normalized) return true;
  try {
    return sessionStorage.getItem(`${MERCH_FUNNEL_BEACON_PREFIX}${normalized}`) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {string} ref
 */
export function markMerchBeaconSent(ref) {
  const normalized = normalizeMerchRef(ref);
  if (!normalized) return;
  try {
    sessionStorage.setItem(`${MERCH_FUNNEL_BEACON_PREFIX}${normalized}`, "1");
  } catch {
    /* ignore */
  }
}
