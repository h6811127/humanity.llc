/**
 * iOS camera → Safari vs Home Screen PWA steward handoff (vouch / attest).
 * @see docs/PWA_STANDALONE_EXTERNAL_NAVIGATION.md
 */

/**
 * @param {{
 *   isIosWebKit: boolean;
 *   standalone: boolean;
 *   walletCount?: number;
 * }} input
 */
export function shouldShowScanPwaCameraHandoff(input) {
  const walletCount = input.walletCount ?? 0;
  return Boolean(input.isIosWebKit && !input.standalone && walletCount < 1);
}
