/** Debounce window for batched device OS refreshes. */
export const DEVICE_OS_DEBOUNCE_MS = 300;

/**
 * @param {string | null | undefined} reason
 * @returns {boolean}
 */
export function shouldRefreshLiveControlInbox(reason) {
  const r = String(reason || "");
  return (
    r === "visible" ||
    r === "init" ||
    r === "manual" ||
    r === "storage" ||
    r === "hub-changed"
  );
}

/**
 * @param {string | null | undefined} reason
 * @returns {boolean}
 */
export function shouldRefreshWalletNetwork(reason) {
  return shouldRefreshLiveControlInbox(reason);
}

/**
 * Auto wallet network refresh runs only when resolver health is ok.
 * Manual Check network bypasses this gate.
 *
 * @param {string | null | undefined} reason
 * @param {'ok' | 'degraded' | 'offline'} resolverHealth
 * @returns {boolean}
 */
export function shouldAutoRefreshWalletNetwork(reason, resolverHealth) {
  if (!shouldRefreshWalletNetwork(reason)) return false;
  return resolverHealth === "ok";
}
