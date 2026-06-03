/**
 * Fetch resolver card metadata to repair wallet scan_url after recovery import.
 */
import {
  normalizeWalletRecoveryImportLabels,
  normalizeWalletScanUrls,
  repairRecoveryImportLabel,
  scanUrlHasOfficialQrParam,
} from "./device-wallet-scan-url-core.mjs";
import { buildOfficialScanUrl } from "./qr-scan-url-lock.mjs";

/**
 * @param {string} profileId
 */
export async function fetchCardMetaForProfile(profileId) {
  const { getCardJsonUrl } = await import("./hc-sign.mjs");
  const res = await fetch(getCardJsonUrl(profileId), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const card = await res.json();
  const qrId =
    typeof card?.qr?.active_qr_id === "string" ? card.qr.active_qr_id.trim() : "";
  return {
    qrId: qrId || null,
    handle: typeof card?.handle === "string" ? card.handle : null,
    manifestoLine: typeof card?.manifesto_line === "string" ? card.manifesto_line : null,
    ownerPublicKey: typeof card?.public_key === "string" ? card.public_key : null,
  };
}

/**
 * @param {Record<string, unknown>} entry
 * @param {string} origin
 * @param {Awaited<ReturnType<typeof fetchCardMetaForProfile>>} meta
 */
export function patchWalletEntryFromCardMeta(entry, origin, meta) {
  if (!meta?.qrId) return entry;
  let scanUrl;
  try {
    scanUrl = buildOfficialScanUrl(String(entry.profile_id), meta.qrId, origin);
  } catch {
    return entry;
  }
  const patched = {
    ...entry,
    qr_id: meta.qrId,
    scan_url: scanUrl,
    handle: entry.handle ?? meta.handle ?? undefined,
    manifesto_line: entry.manifesto_line ?? meta.manifestoLine ?? undefined,
    owner_public_key_b58: entry.owner_public_key_b58 ?? meta.ownerPublicKey ?? undefined,
  };
  return repairRecoveryImportLabel(patched);
}

/**
 * @param {Array<Record<string, unknown>>} entries
 * @param {string} origin
 * @param {(profileId: string) => Promise<Awaited<ReturnType<typeof fetchCardMetaForProfile>>>} [fetchMeta]
 */
export async function repairWalletEntriesFromResolver(entries, origin, fetchMeta = fetchCardMetaForProfile) {
  let changed = false;
  const next = [];
  for (const entry of entries) {
    if (scanUrlHasOfficialQrParam(entry.scan_url) && entry.qr_id) {
      next.push(entry);
      continue;
    }
    const profileId = typeof entry.profile_id === "string" ? entry.profile_id : "";
    if (!profileId) {
      next.push(entry);
      continue;
    }
    const meta = await fetchMeta(profileId);
    if (!meta?.qrId) {
      next.push(entry);
      continue;
    }
    const patched = patchWalletEntryFromCardMeta(entry, origin, meta);
    if (JSON.stringify(patched) !== JSON.stringify(entry)) changed = true;
    next.push(patched);
  }
  return { entries: next, changed };
}

/**
 * @param {Array<Record<string, unknown>>} entries
 * @param {string} origin
 * @param {(entry: Record<string, unknown>) => string | null} resolveQrId
 */
export function finalizeWalletScanUrlRepair(entries, origin, resolveQrId) {
  const scanNorm = normalizeWalletScanUrls(entries, origin, resolveQrId);
  const labelNorm = normalizeWalletRecoveryImportLabels(scanNorm.entries);
  return {
    entries: labelNorm.entries,
    changed: scanNorm.changed || labelNorm.changed,
  };
}
