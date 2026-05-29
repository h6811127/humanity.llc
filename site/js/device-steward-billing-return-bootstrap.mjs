/**
 * Early capture of Stripe checkout `hc_account_id` before lazy steward session loads.
 * @see device-steward-session.mjs · docs/HOSTED_OPS_SAD_PATH_MATRIX.md
 */
import {
  STEWARD_PENDING_ACCOUNT_STORAGE_KEY,
  parseStewardAccountIdFromUrl,
} from "./device-steward-session-core.mjs";

/**
 * @returns {string | null}
 */
export function captureStewardBillingReturnFromUrl() {
  if (typeof window === "undefined") return null;
  const accountId = parseStewardAccountIdFromUrl(location.search);
  if (!accountId) return null;
  try {
    sessionStorage.setItem(STEWARD_PENDING_ACCOUNT_STORAGE_KEY, accountId);
  } catch {
    /* ignore */
  }
  return accountId;
}

captureStewardBillingReturnFromUrl();
