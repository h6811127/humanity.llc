/**
 * Phase 2: device-local pins for public scan links (no private keys).
 * @see docs/DEVICE_HUB_AND_LOCAL_SEARCH.md
 */
export const PINS_STORAGE_KEY = "hc_device_pins";

/** Base58-style profile IDs (matches resolver scan-status hint). */
const PROFILE_ID_RE = /^[1-9A-HJ-NP-Za-km-z]{20,32}$/;
const QR_ID_RE = /^qr_[1-9A-HJ-NP-Za-km-z_]{8,64}$/;

export function loadPins() {
  try {
    const raw = localStorage.getItem(PINS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePins(entries) {
  localStorage.setItem(PINS_STORAGE_KEY, JSON.stringify(entries));
}

/**
 * @param {string} raw
 * @param {string} [origin]
 * @returns {{ profile_id: string, qr_id: string | null, scan_url: string } | { error: string }}
 */
export function parseScanInput(raw, origin = typeof location !== "undefined" ? location.origin : "https://humanity.llc") {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: "Enter a scan link or profile ID." };
  }

  const base = origin.replace(/\/$/, "");

  const tryPath = (pathname, search = "") => {
    const match = pathname.match(/\/c\/([^/]+)\/?$/);
    if (!match) return null;
    const profileId = decodeURIComponent(match[1]);
    let qrId = null;
    if (search) {
      const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
      qrId = params.get("q");
    }
    return buildPinFields(profileId, qrId, base);
  };

  try {
    const asUrl = new URL(trimmed, `${base}/`);
    const fromUrl = tryPath(asUrl.pathname, asUrl.search);
    if (fromUrl) {
      if ("error" in fromUrl) return fromUrl;
      return { ...fromUrl, scan_url: asUrl.href };
    }
  } catch {
    /* fall through */
  }

  if (trimmed.startsWith("/c/")) {
    const q = trimmed.indexOf("?");
    const path = q >= 0 ? trimmed.slice(0, q) : trimmed;
    const search = q >= 0 ? trimmed.slice(q) : "";
    const fromPath = tryPath(path, search);
    if (fromPath) {
      if ("error" in fromPath) return fromPath;
      const scan_url = `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
      return { ...fromPath, scan_url: new URL(scan_url, `${base}/`).href };
    }
  }

  if (PROFILE_ID_RE.test(trimmed)) {
    return buildPinFields(trimmed, null, base);
  }

  return {
    error: "Use a humanity.llc scan link (/c/…?q=…) or a profile ID (20–32 characters).",
  };
}

function buildPinFields(profileId, qrId, base) {
  if (!PROFILE_ID_RE.test(profileId)) {
    return { error: "Profile ID must be 20–32 base58 characters." };
  }
  if (qrId != null && qrId !== "" && !QR_ID_RE.test(qrId)) {
    return { error: "QR id must look like qr_ plus base58 characters." };
  }
  const q = qrId ? `?q=${encodeURIComponent(qrId)}` : "";
  const scan_url = `${base}/c/${encodeURIComponent(profileId)}${q}`;
  return {
    profile_id: profileId,
    qr_id: qrId || null,
    scan_url,
  };
}

export function pinDedupeKey(entry) {
  return `${entry.profile_id}:${entry.qr_id || ""}`;
}

export function pinHaystack(entry) {
  return [
    entry.label,
    entry.profile_id,
    entry.qr_id,
    entry.scan_url,
    "public",
    "pinned",
    "scan",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * @param {string} label
 * @param {string} scanOrProfile
 * @param {ReturnType<typeof loadPins>} existing
 */
export function createPinEntry(label, scanOrProfile, existing = loadPins()) {
  const parsed = parseScanInput(scanOrProfile);
  if ("error" in parsed) return parsed;

  const key = pinDedupeKey(parsed);
  if (existing.some((p) => pinDedupeKey(p) === key)) {
    return { error: "This scan link is already pinned on this device." };
  }

  const cleanLabel = label.trim();
  return {
    id: `pin_${parsed.profile_id.slice(0, 8)}_${Date.now()}`,
    label:
      cleanLabel ||
      (parsed.qr_id ? `Scan · ${parsed.profile_id.slice(0, 8)}…` : parsed.profile_id.slice(0, 12)),
    profile_id: parsed.profile_id,
    qr_id: parsed.qr_id,
    scan_url: parsed.scan_url,
    pinned_at: new Date().toISOString(),
  };
}
