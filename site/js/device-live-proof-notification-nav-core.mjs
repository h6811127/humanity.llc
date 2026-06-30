/**
 * Live-proof OS notification click — focus existing PWA client or open deep link.
 * Avoid WindowClient.navigate (unreliable on Android Chrome PWA).
 */

export const HC_NOTIFICATION_NAVIGATE = "HC_NOTIFICATION_NAVIGATE";
export const HC_SW_OPEN_INBOX = "HC_SW_OPEN_INBOX";
export const PENDING_NOTIFICATION_NAV_STORAGE_KEY = "hc_pending_notification_href";

/**
 * @param {string} href
 */
export function notificationNavigateMessage(href) {
  return { type: HC_NOTIFICATION_NAVIGATE, href };
}

/**
 * @param {string} clientUrl
 * @param {string} targetHref
 */
export function notificationNavSameOrigin(clientUrl, targetHref) {
  try {
    return new URL(clientUrl).origin === new URL(targetHref).origin;
  } catch {
    return false;
  }
}

/**
 * Pick first window client on the same origin as the notification deep link.
 *
 * @param {Array<{ url?: string }>} clients
 * @param {string} href
 */
export function pickNotificationNavigateClient(clients, href) {
  for (const client of clients) {
    if (typeof client.url === "string" && notificationNavSameOrigin(client.url, href)) {
      return client;
    }
  }
  return null;
}
