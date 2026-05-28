/**
 * Merch funnel attribution (M8.4) — session-only ref carry + allowed ref list.
 * No PII; aggregate server counters only.
 */

export const MERCH_FUNNEL_SESSION_KEY = "hc_merch_create_ref";
export const MERCH_FUNNEL_POST_CREATE_KEY = "hc_merch_customize_ref";
export const MERCH_FUNNEL_BEACON_PREFIX = "hc_merch_beacon_";

export const ALLOWED_MERCH_REFS = new Set([
  "tier0_sticker",
  "tier0_shop",
  "customize_shop",
  "customize_hoodie",
  "scan_customize",
]);

/** Refs that should continue to `/shop/customize/` after card create. */
export const CUSTOMIZE_HANDOFF_REFS = new Set([
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
 * @param {unknown} ref
 * @returns {boolean}
 */
export function shouldHandoffToCustomize(ref) {
  const normalized = normalizeMerchRef(ref);
  return normalized != null && CUSTOMIZE_HANDOFF_REFS.has(normalized);
}

/**
 * After create attribution is sent, keep customize funnel refs for /created/ → /shop/customize/.
 * @param {string | null | undefined} ref
 */
export function handoffMerchRefAfterCreate(ref) {
  const normalized = normalizeMerchRef(ref);
  if (!normalized) return;
  clearMerchCreateRef();
  if (!shouldHandoffToCustomize(normalized)) return;
  try {
    sessionStorage.setItem(MERCH_FUNNEL_POST_CREATE_KEY, normalized);
  } catch {
    /* sessionStorage unavailable */
  }
}

/**
 * Ref for customize handoff (post-create) or active create attribution.
 * @returns {string | null}
 */
export function peekMerchCustomizeRef() {
  try {
    const post = normalizeMerchRef(sessionStorage.getItem(MERCH_FUNNEL_POST_CREATE_KEY));
    if (post) return post;
  } catch {
    /* ignore */
  }
  return peekMerchCreateRef();
}

/**
 * @param {string} href
 * @param {string | null} ref
 * @returns {string}
 */
export function appendMerchRefToHref(href, ref) {
  const normalized = normalizeMerchRef(ref);
  if (!normalized) return href;
  try {
    const base =
      typeof location !== "undefined" && location.origin
        ? location.origin
        : "https://humanity.llc";
    const u = new URL(href, base);
    u.searchParams.set("hc_ref", normalized);
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return href;
  }
}

/**
 * @param {string | null | undefined} ref
 * @param {string} [origin]
 * @returns {string | null}
 */
export function merchCustomizeUrlFromRef(ref, origin = "https://humanity.llc") {
  const normalized = normalizeMerchRef(ref);
  if (!normalized || !shouldHandoffToCustomize(normalized)) return null;
  const base = origin.replace(/\/$/, "");
  return `${base}/shop/customize/?hc_ref=${encodeURIComponent(normalized)}`;
}

/**
 * @param {{ fresh?: boolean, merchRef?: string | null }} input
 * @returns {boolean}
 */
export function shouldShowCreatedMerchCustomizeCard(input) {
  return input.fresh === true && shouldHandoffToCustomize(input.merchRef);
}

/**
 * Fresh create with customize handoff ref and signing session ready → auto-redirect.
 *
 * @param {{ fresh?: boolean, merchRef?: string | null, sessionHasSigningKeys?: boolean }} input
 * @returns {boolean}
 */
export function shouldAutoRedirectCreatedToCustomize(input) {
  if (!shouldShowCreatedMerchCustomizeCard(input)) return false;
  return input.sessionHasSigningKeys === true;
}

/**
 * @param {string} href
 * @param {string | null} ref
 * @returns {string}
 */
export function appendMerchRefToCreateUrl(href, ref) {
  const normalized = normalizeMerchRef(ref);
  if (!normalized) return href;
  try {
    const base =
      typeof location !== "undefined" && location.origin
        ? location.origin
        : "https://humanity.llc";
    const u = new URL(href, base);
    if (!u.pathname.startsWith("/create")) return href;
    return appendMerchRefToHref(href, normalized);
  } catch {
    return href;
  }
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
