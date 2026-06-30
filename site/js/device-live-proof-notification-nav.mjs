/**
 * Page-side handler for live-proof notification deep links from the service worker.
 */
import {
  HC_NOTIFICATION_NAVIGATE,
  HC_SW_OPEN_INBOX,
  PENDING_NOTIFICATION_NAV_STORAGE_KEY,
} from "./device-live-proof-notification-nav-core.mjs";
import { openInboxFromChrome } from "./device-inbox-sheet-loader.mjs?v=94";

let notificationNavListenerBound = false;

/** @param {string} href */
export function stashPendingNotificationNav(href) {
  try {
    sessionStorage.setItem(PENDING_NOTIFICATION_NAV_STORAGE_KEY, href);
  } catch {
    /* ignore */
  }
}

/** Apply pending notification navigation (e.g. after cold start or slow module load). */
export function consumePendingNotificationNav() {
  try {
    const href = sessionStorage.getItem(PENDING_NOTIFICATION_NAV_STORAGE_KEY);
    if (!href) return false;
    sessionStorage.removeItem(PENDING_NOTIFICATION_NAV_STORAGE_KEY);
    location.href = href;
    return true;
  } catch {
    return false;
  }
}

/** @param {string} href */
export function applyNotificationNavigate(href) {
  if (typeof href !== "string" || !href) return;
  stashPendingNotificationNav(href);
  location.href = href;
}

/** @param {MessageEvent} event */
function onServiceWorkerMessage(event) {
  const data = event.data;
  if (!data?.type) return;
  if (data.type === HC_SW_OPEN_INBOX) {
    openInboxFromChrome("notification");
    return;
  }
  if (data.type !== HC_NOTIFICATION_NAVIGATE) return;
  if (typeof data.href !== "string" || !data.href) return;
  applyNotificationNavigate(data.href);
}

export function bindLiveProofNotificationNavListener() {
  if (notificationNavListenerBound || typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  notificationNavListenerBound = true;
  navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage);
  consumePendingNotificationNav();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      consumePendingNotificationNav();
    }
  });
}
