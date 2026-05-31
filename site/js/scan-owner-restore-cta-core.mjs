/**
 * Scan page owner restore CTA — print_artifact → /created/#restore.
 * @see docs/SCAN_PAGE_OWNER_RESTORE_CTA.md
 */

/**
 * @param {{
 *   kind?: string,
 *   qrScope?: string | null,
 *   profileId?: string | null,
 * }} vm
 */
export function isScanOwnerRestoreCtaEligible(vm) {
  if (vm.kind !== "active") return false;
  if (vm.qrScope !== "print_artifact") return false;
  return Boolean(vm.profileId);
}

/**
 * @param {string} origin
 * @param {string} profileId
 * @param {string | null | undefined} [qrId]
 */
export function buildScanOwnerRestoreCreatedUrl(origin, profileId, qrId) {
  const base = String(origin ?? "").replace(/\/$/, "") || "https://humanity.llc";
  const params = new URLSearchParams();
  params.set("profile_id", profileId);
  if (qrId) params.set("qr_id", qrId);
  return `${base}/created/?${params.toString()}#restore`;
}

/**
 * Hide owner restore CTA when this tab already holds signing material for the scan card.
 *
 * @param {{
 *   profileId: string | null | undefined,
 *   session?: Record<string, unknown> | null,
 *   walletSigningProfileIds?: string[],
 * }} input
 */
export function shouldHideScanOwnerRestoreCta(input) {
  const profileId = input.profileId;
  if (!profileId) return true;
  const session = input.session;
  if (session?.profile_id === profileId) {
    if (
      typeof session.owner_private_key_b58 === "string" ||
      typeof session.recovery_private_key_b58 === "string"
    ) {
      return true;
    }
  }
  const ids = input.walletSigningProfileIds ?? [];
  return ids.includes(profileId);
}
