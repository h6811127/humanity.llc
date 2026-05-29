/**
 * Sole saved signing row auto-activate for scan vouch (P0b-3 · mirrors D10 Tier 1).
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P0b-3
 */

import { soleSigningWalletEntry } from "./device-quiet-tab-rehydrate-core.mjs";

/**
 * Wallet row to auto-load for vouch when exactly one signing entry exists (no default vouch).
 * @param {Array<{ profile_id?: string, owner_private_key_b58?: string, owner_public_key_b58?: string }>} wallet
 * @param {string | null | undefined} voucheeProfileId
 * @returns {Record<string, unknown> | null}
 */
export function soleSigningVouchActivateEntry(wallet, voucheeProfileId) {
  const sole = soleSigningWalletEntry(wallet);
  if (!sole?.profile_id) return null;
  const vouchee = typeof voucheeProfileId === "string" ? voucheeProfileId.trim() : "";
  if (vouchee && sole.profile_id === vouchee) return null;
  if (!sole.owner_private_key_b58 || !sole.owner_public_key_b58) return null;
  return sole;
}
