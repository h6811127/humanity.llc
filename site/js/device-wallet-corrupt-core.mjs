/**
 * Shared corrupt-wallet UX (Safari P1-4 · R7).
 * @see docs/SAFARI_KEYS_CUSTODY.md R7
 */

import {
  emphasisCardActionsHtml,
  emphasisCardCtaLinkSecondary,
  emphasisCardCtaSecondary,
} from "./device-emphasis-card-html.mjs?v=89";
import {
  WALLET_CORRUPT_HELP_CTA,
  WALLET_CORRUPT_HELP_HREF,
  WALLET_CORRUPT_IMPORT_CTA,
} from "./device-ownership-copy-core.mjs?v=89";

export const WALLET_CORRUPT_IMPORT_ATTR = "data-wallet-corrupt-import";

/** Scroll/open hub backup import (works on `/`, `/wallet/`, `/create/`). */
export function scrollToHubImportForm() {
  const target =
    document.getElementById("hub-import-form") ??
    document.querySelector(".device-hub-import");
  target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  const details = target instanceof HTMLDetailsElement ? target : target?.closest("details");
  if (details instanceof HTMLDetailsElement) {
    details.open = true;
  }
}

/** Hub corrupt card action row: import scroll + backup help link. */
export function walletCorruptActionsHtml() {
  return emphasisCardActionsHtml([
    emphasisCardCtaSecondary(WALLET_CORRUPT_IMPORT_CTA, WALLET_CORRUPT_IMPORT_ATTR),
    emphasisCardCtaLinkSecondary(WALLET_CORRUPT_HELP_CTA, WALLET_CORRUPT_HELP_HREF),
  ]);
}
