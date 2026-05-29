/**
 * Stranger-empty hub: hide steward chrome until first save or inbox action.
 * @see docs/HUB_STRANGER_ONBOARDING.md
 */

export const HUB_STRANGER_EMPTY_CLASS = "device-hub--stranger-empty";

/**
 * @param {{ walletCount?: number, pinCount?: number, inboxActionCount?: number }} input
 */
export function isHubStrangerEmptyState(input) {
  const walletCount = input.walletCount ?? 0;
  const pinCount = input.pinCount ?? 0;
  const inboxActionCount = input.inboxActionCount ?? 0;
  if (walletCount > 0 || pinCount > 0) return false;
  if (inboxActionCount > 0) return false;
  return true;
}
