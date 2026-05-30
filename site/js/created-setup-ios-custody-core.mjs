/**
 * Setup wizard iOS Safari custody notices (RC-3).
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md RC-3
 * @see docs/SAFARI_KEYS_CUSTODY.md R4
 */

/**
 * @param {{
 *   isIosWebKit?: boolean;
 *   standalone?: boolean;
 * }} input
 */
export function shouldShowSetupIosSafariCustodyNotice(input) {
  const { isIosWebKit = false, standalone = false } = input;
  return isIosWebKit && !standalone;
}
