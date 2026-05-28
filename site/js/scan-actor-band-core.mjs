/**
 * L3 actor band eligibility (pure).
 * @see docs/SCAN_PAGE_TRUST_UI.md slice S3
 */

/**
 * Show the post-settle actor band when this viewer may vouch or open cards.
 * Strangers: false. Cross-tab-only: false (banner handles that).
 *
 * @param {{
 *   profileId: string | null,
 *   qrId: string | null,
 *   scanActive: boolean,
 *   hasCreatedKeys: boolean,
 *   savedWalletCount: number,
 *   hasDefaultVouchProfile: boolean,
 * }} input
 */
export function scanActorBandEligible(input) {
  if (!input.scanActive) return false;
  if (!input.profileId || !input.qrId) return false;
  if (input.hasCreatedKeys) return true;
  if (input.savedWalletCount > 0) return true;
  if (input.hasDefaultVouchProfile) return true;
  return false;
}

/** Delay after L2 settle before band slides in (ms). */
export const SCAN_ACTOR_BAND_REVEAL_MS = 220;
