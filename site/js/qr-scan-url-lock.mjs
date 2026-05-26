/**
 * Official Humanity scan URL host lock (docs/SCANNER_EXPERIENCE.md Phase C).
 * All branded QR generators must encode only URLs that pass validateOfficialScanUrl.
 */

export const OFFICIAL_SCAN_PRODUCTION_HOST = "humanity.llc";

/** Hostnames allowed for local Worker/Pages dev QR encoding. */
export const OFFICIAL_SCAN_LOCAL_HOSTS = ["localhost", "127.0.0.1"];

const PROFILE_ID_PATTERN =
  /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{20,32}$/;

const QR_ID_PATTERN =
  /^qr_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8,40}$/;

/**
 * @param {string} hostname
 */
export function isAllowedScanHost(hostname) {
  if (!hostname) return false;
  if (hostname === OFFICIAL_SCAN_PRODUCTION_HOST) return true;
  if (hostname.endsWith(".humanity.llc")) return true;
  return OFFICIAL_SCAN_LOCAL_HOSTS.includes(hostname);
}

/**
 * @param {string} urlString
 * @param {{ profileId?: string | null, qrId?: string | null }} [opts]
 * @returns {{ ok: true } | { ok: false, code: string, message: string }}
 */
export function validateOfficialScanUrl(urlString, opts = {}) {
  const raw = urlString?.trim();
  if (!raw) {
    return { ok: false, code: "empty", message: "Scan URL is empty" };
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, code: "parse", message: "Scan URL is not a valid URL" };
  }

  const host = url.hostname;
  if (!isAllowedScanHost(host)) {
    return {
      ok: false,
      code: "host",
      message: `Scan URL host must be ${OFFICIAL_SCAN_PRODUCTION_HOST} or local dev, not ${host}`,
    };
  }

  if (host === OFFICIAL_SCAN_PRODUCTION_HOST && url.protocol !== "https:") {
    return {
      ok: false,
      code: "protocol",
      message: "Production scan URLs must use https",
    };
  }

  if (
    OFFICIAL_SCAN_LOCAL_HOSTS.includes(host) &&
    url.protocol !== "http:" &&
    url.protocol !== "https:"
  ) {
    return {
      ok: false,
      code: "protocol",
      message: "Local scan URLs must use http or https",
    };
  }

  if (url.username || url.password) {
    return { ok: false, code: "credentials", message: "Scan URL must not include credentials" };
  }

  if (url.hash) {
    return { ok: false, code: "hash", message: "Scan URL must not include a fragment" };
  }

  const pathMatch = url.pathname.match(/^\/c\/([^/]+)\/?$/);
  if (!pathMatch) {
    return {
      ok: false,
      code: "path",
      message: "Scan URL path must be /c/{profile_id} with ?q={qr_id}",
    };
  }

  const pathProfile = decodeURIComponent(pathMatch[1]);
  if (!PROFILE_ID_PATTERN.test(pathProfile)) {
    return { ok: false, code: "profile_id", message: "Invalid profile_id in scan URL" };
  }

  const qrParam = url.searchParams.get("q");
  if (!qrParam || !QR_ID_PATTERN.test(qrParam)) {
    return { ok: false, code: "qr_id", message: "Scan URL must include valid ?q={qr_id}" };
  }

  for (const key of url.searchParams.keys()) {
    if (key !== "q") {
      return {
        ok: false,
        code: "query",
        message: `Unexpected query parameter: ${key}`,
      };
    }
  }

  if (opts.profileId && pathProfile !== opts.profileId) {
    return {
      ok: false,
      code: "profile_mismatch",
      message: "Scan URL profile_id does not match this card",
    };
  }

  if (opts.qrId && qrParam !== opts.qrId) {
    return {
      ok: false,
      code: "qr_mismatch",
      message: "Scan URL qr_id does not match this credential",
    };
  }

  return { ok: true };
}

/**
 * @param {string} urlString
 * @param {{ profileId?: string | null, qrId?: string | null }} [opts]
 */
export function assertOfficialScanUrl(urlString, opts = {}) {
  const result = validateOfficialScanUrl(urlString, opts);
  if (!result.ok) {
    throw new Error(`Official scan URL required: ${result.message}`);
  }
  return urlString.trim();
}

/**
 * @param {string} urlString
 * @param {{ profileId?: string | null, qrId?: string | null }} [opts]
 */
export function isOfficialScanUrl(urlString, opts = {}) {
  return validateOfficialScanUrl(urlString, opts).ok;
}

/**
 * Build and validate a scan URL for official QR generators (create, rotate, download).
 * @param {string} profileId
 * @param {string} qrId
 * @param {string} [origin]
 */
export function buildOfficialScanUrl(
  profileId,
  qrId,
  origin = `https://${OFFICIAL_SCAN_PRODUCTION_HOST}`
) {
  const base = String(origin).replace(/\/$/, "");
  const url = `${base}/c/${encodeURIComponent(profileId)}?q=${encodeURIComponent(qrId)}`;
  return assertOfficialScanUrl(url, { profileId, qrId });
}
