import type { RevocationTargetKind } from "../db/types";
import { requestOrigin } from "../http/resolver";

/** Active scan may cache briefly at the edge; must revalidate (Phase 2 — no long SWR). */
export const CACHE_ACTIVE = "public, max-age=30, must-revalidate";

/** Revoked, expired, and other non-active scan truth must not be edge-cached. */
export const CACHE_NO_STORE = "no-store";

/** @deprecated Use CACHE_NO_STORE */
export const CACHE_INACTIVE = CACHE_NO_STORE;

/**
 * @param {import("./scan-state").ScanPageKind} kind
 */
export function cacheControlForScanKind(kind: string): string {
  return kind === "active" ? CACHE_ACTIVE : CACHE_NO_STORE;
}

/**
 * URLs whose cached scan HTML/JSON must drop after owner mutations.
 * @param {string} origin
 * @param {string} profileId
 * @param {string[]} qrIds
 */
export function buildScanCachePurgeUrls(
  origin: string,
  profileId: string,
  qrIds: string[]
): string[] {
  const base = origin.replace(/\/$/, "");
  const encodedProfile = encodeURIComponent(profileId);
  const urls = new Set<string>();
  urls.add(`${base}/.well-known/hc/v1/cards/${encodedProfile}/status`);
  for (const qrId of qrIds) {
    if (!qrId) continue;
    const q = encodeURIComponent(qrId);
    urls.add(`${base}/c/${encodedProfile}?q=${q}`);
    urls.add(
      `${base}/.well-known/hc/v1/cards/${encodedProfile}/status?q=${q}`
    );
  }
  return [...urls];
}

/**
 * @param {string[]} urls
 */
export async function purgeScanCacheUrls(urls: string[]): Promise<number> {
  let purged = 0;
  for (const url of urls) {
    try {
      const deleted = await caches.default.delete(new Request(url));
      if (deleted) purged += 1;
    } catch {
      /* best-effort — mutation already committed */
    }
  }
  return purged;
}

/**
 * @param {D1Database} db
 * @param {string} profileId
 */
export async function listQrIdsForProfile(
  db: D1Database,
  profileId: string
): Promise<string[]> {
  try {
    const bound = db
      .prepare(`SELECT qr_id FROM qr_credentials WHERE profile_id = ?`)
      .bind(profileId);
    if (typeof (bound as { all?: unknown }).all !== "function") {
      return [];
    }
    const result = await (bound as D1PreparedStatement).all<{ qr_id: string }>();
    return (result.results ?? []).map((row) => row.qr_id).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Resolve which QR scan surfaces to purge after a signed mutation.
 * @param {D1Database} db
 * @param {string} profileId
 * @param {RevocationTargetKind} [targetKind]
 * @param {string | null} [targetQrId]
 * @param {string[]} [extraQrIds]
 */
export async function qrIdsForScanCachePurge(
  db: D1Database,
  profileId: string,
  targetKind?: RevocationTargetKind,
  targetQrId?: string | null,
  extraQrIds: string[] = []
): Promise<string[]> {
  const ids = new Set(extraQrIds.filter(Boolean));
  if (targetKind === "qr_credential" && targetQrId) {
    ids.add(targetQrId);
  } else if (targetKind === "card") {
    for (const qrId of await listQrIdsForProfile(db, profileId)) {
      ids.add(qrId);
    }
  } else if (targetQrId) {
    ids.add(targetQrId);
  } else {
    for (const qrId of await listQrIdsForProfile(db, profileId)) {
      ids.add(qrId);
    }
  }
  return [...ids];
}

/**
 * Best-effort edge cache purge after scan-affecting mutations (Phase 2).
 */
export async function purgeScanCacheAfterMutation(input: {
  request: Request;
  db: D1Database;
  profileId: string;
  targetKind?: RevocationTargetKind;
  targetQrId?: string | null;
  extraQrIds?: string[];
}): Promise<number> {
  try {
    const origin = requestOrigin(input.request);
    const qrIds = await qrIdsForScanCachePurge(
      input.db,
      input.profileId,
      input.targetKind,
      input.targetQrId,
      input.extraQrIds ?? []
    );
    const urls = buildScanCachePurgeUrls(origin, input.profileId, qrIds);
    return purgeScanCacheUrls(urls);
  } catch {
    return 0;
  }
}
