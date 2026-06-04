/**
 * Hub recovery-code import (pure helpers · Vitest without DOM).
 * @see docs/OWNERSHIP_RESTORE_UX_PLAN.md · docs/CUSTODY_EASY_MODE.md C4
 */

import { stripStaleDeviceUnlockWrapForRecoveryImport } from "./device-custody-reenroll-core.mjs";

/** Loose base58 profile id (resolver cards). */
const PROFILE_ID_RE = /^[1-9A-HJ-NP-Za-km-z]{20,64}$/;

/**
 * @param {{
 *   profileId: string;
 *   handle?: string | null;
 *   manifestoLine?: string | null;
 *   existingLabel?: string | null;
 * }} input
 */
export function recoveryImportLabel(input) {
  const { profileId, handle, manifestoLine, existingLabel } = input;
  const label = String(existingLabel ?? "").trim();
  const looksLikeProfileSlice =
    label &&
    (label === profileId.slice(0, 12) || label === profileId.slice(0, 8) || label === profileId);
  if (label && !looksLikeProfileSlice) return label;

  const handleClean = handle ? String(handle).replace(/^@/, "").trim() : "";
  if (handleClean) return `@${handleClean}`;

  const manifesto = String(manifestoLine ?? "").trim();
  if (manifesto) return manifesto.slice(0, 48);

  return label || "Saved card";
}

/**
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function parseProfileIdFromCardRef(raw) {
  const input = String(raw ?? "").trim();
  if (!input) return null;
  if (PROFILE_ID_RE.test(input)) return input;
  try {
    const url = new URL(input, "https://humanity.llc");
    const fromQuery = url.searchParams.get("profile_id");
    if (fromQuery && PROFILE_ID_RE.test(fromQuery)) return fromQuery;
    const scanMatch = url.pathname.match(/^\/c\/([^/?#]+)/);
    if (scanMatch?.[1] && PROFILE_ID_RE.test(scanMatch[1])) return scanMatch[1];
  } catch {
    /* not a URL */
  }
  return null;
}

/**
 * @param {string} recoveryPrivateKeyB58
 * @param {string} expectedRecoveryPublicKeyB58
 * @param {(priv: string) => Promise<string>} derivePublicKey
 */
export async function assertRecoveryKeyMatchesCard(
  recoveryPrivateKeyB58,
  expectedRecoveryPublicKeyB58,
  derivePublicKey
) {
  if (!expectedRecoveryPublicKeyB58) {
    throw new Error("This card has no recovery key on file. Use encrypted backup instead.");
  }
  const derivedPub = await derivePublicKey(recoveryPrivateKeyB58);
  if (derivedPub !== expectedRecoveryPublicKeyB58) {
    throw new Error("Recovery code does not match this card.");
  }
  return derivedPub;
}

/**
 * @param {Array<Record<string, unknown>>} entries
 * @param {{
 *   profileId: string;
 *   recoveryPublicKeyB58: string;
 *   recoveryPrivateKeyB58: string;
 *   ownerPublicKeyB58?: string | null;
 *   scanUrl: string;
 *   qrId?: string | null;
 *   handle?: string | null;
 *   manifestoLine?: string | null;
 * }} unlocked
 * @param {string} [importedAt]
 */
export function mergeRecoveryIntoWallet(entries, unlocked, importedAt = new Date().toISOString()) {
  const idx = entries.findIndex((e) => e.profile_id === unlocked.profileId);
  const baseFields = {
    profile_id: unlocked.profileId,
    recovery_public_key_b58: unlocked.recoveryPublicKeyB58,
    recovery_private_key_b58: unlocked.recoveryPrivateKeyB58,
    owner_public_key_b58: unlocked.ownerPublicKeyB58 ?? null,
    scan_url: unlocked.scanUrl,
    qr_id: unlocked.qrId ?? null,
    handle: unlocked.handle ?? undefined,
    manifesto_line: unlocked.manifestoLine ?? undefined,
    saved_at: importedAt,
    key_imported_at: importedAt,
    recovery_key_acknowledged: true,
    recovery_imported_at: importedAt,
  };
  if (idx >= 0) {
    const entry = stripStaleDeviceUnlockWrapForRecoveryImport({
      ...entries[idx],
      ...baseFields,
      label: recoveryImportLabel({
        profileId: unlocked.profileId,
        handle: unlocked.handle,
        manifestoLine: unlocked.manifestoLine,
        existingLabel: entries[idx].label,
      }),
      owner_private_key_b58: entries[idx].owner_private_key_b58,
    });
    const next = entries.slice();
    next[idx] = entry;
    return { entries: next, entry, isNew: false };
  }
  const entry = {
    ...baseFields,
    label: recoveryImportLabel({
      profileId: unlocked.profileId,
      handle: unlocked.handle,
      manifestoLine: unlocked.manifestoLine,
    }),
  };
  return { entries: [entry, ...entries], entry, isNew: true };
}
