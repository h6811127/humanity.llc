/**
 * iOS Safari persist-denied notice gating (RC-2).
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md RC-2
 */

import { storagePersistWasDenied } from "./device-storage-persist-core.mjs";
import { isPwaShellPagePath } from "./pwa-install-metadata-core.mjs";
import {
  isIosWebKitUserAgent,
  isSafariItpNoticeDismissSnoozed,
} from "./safari-itp-storage-notice-core.mjs";

export const STORAGE_PERSIST_DENIED_NOTICE_DISMISS_KEY =
  "hc_storage_persist_denied_notice_dismissed_at";

export const STORAGE_PERSIST_DENIED_NOTICE_MIN_SIGNING_KEYS = 1;

/**
 * @param {{
 *   pathname: string;
 *   isIosWebKit: boolean;
 *   signingKeyCount?: number;
 *   persistFlag?: string | null;
 *   dismissedAtIso?: string | null;
 *   deviceStatusLoadError?: boolean;
 *   nowMs?: number;
 * }} input
 */
export function shouldShowStoragePersistDeniedNotice(input) {
  const {
    pathname,
    isIosWebKit,
    signingKeyCount = 0,
    persistFlag = null,
    dismissedAtIso = null,
    deviceStatusLoadError = false,
    nowMs = Date.now(),
  } = input;

  if (!isIosWebKit) return false;
  if (deviceStatusLoadError) return false;
  if (!isPwaShellPagePath(pathname)) return false;
  if (signingKeyCount < STORAGE_PERSIST_DENIED_NOTICE_MIN_SIGNING_KEYS) return false;
  if (!storagePersistWasDenied(persistFlag)) return false;
  if (isSafariItpNoticeDismissSnoozed(dismissedAtIso, nowMs)) return false;
  return true;
}

export { isIosWebKitUserAgent };
