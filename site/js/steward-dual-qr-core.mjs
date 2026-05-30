/**
 * Dual-QR print materials — public scan + optional steward handoff (S7).
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md § S7
 * @see docs/MERCH_QR_LIFECYCLE_POLICY.md (public HTTPS payload unchanged)
 */

import { isAllowedScanHost } from "./qr-scan-url-lock.mjs";
import {
  buildStewardHandoffShortUrl,
  decodeStewardHandoffCode,
  parseStewardHandoffScanParts,
} from "./steward-handoff-code-core.mjs";

/**
 * @param {string | null | undefined} urlString
 */
export function isAllowedStewardHandoffEncodeUrl(urlString) {
  const raw = String(urlString ?? "").trim();
  if (!raw) return false;
  try {
    const url = new URL(raw);
    if (!isAllowedScanHost(url.hostname)) return false;
    if (url.protocol !== "https:" && url.hostname === "humanity.llc") return false;
    const match = url.pathname.match(/^\/v\/([^/]+)$/);
    if (!match?.[1]) return false;
    return Boolean(decodeStewardHandoffCode(match[1]));
  } catch {
    return false;
  }
}

/**
 * @param {string} scanUrl
 * @param {string} [origin]
 */
export function buildStewardDualQrMaterials(scanUrl, origin = "https://humanity.llc") {
  const publicScanUrl = String(scanUrl ?? "").trim();
  const parts = parseStewardHandoffScanParts(publicScanUrl, origin);
  const stewardHandoffUrl = parts ? buildStewardHandoffShortUrl(publicScanUrl, origin) : null;
  return {
    publicScanUrl,
    stewardHandoffUrl,
    hasStewardHandoff: Boolean(stewardHandoffUrl),
  };
}

/**
 * @param {string} scanUrl
 * @param {string} slug
 * @param {string} [origin]
 */
export function stewardDualQrDownloadFilenames(scanUrl, slug, origin = "https://humanity.llc") {
  const safe = String(slug ?? "scan").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "scan";
  const materials = buildStewardDualQrMaterials(scanUrl, origin);
  return {
    publicFilename: `humanity-${safe}-public-qr.png`,
    stewardFilename: materials.hasStewardHandoff
      ? `humanity-${safe}-steward-handoff-qr.png`
      : null,
  };
}
