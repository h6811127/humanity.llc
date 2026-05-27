export const PWA_SW_SCRIPT_URL = "/sw-live-proof.mjs";

/** @returns {boolean} */
export function pwaServiceWorkerSupported() {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Register the existing root service worker for app-shell installability.
 * It intentionally does not enable live-proof polling; that still requires
 * browser-alert opt-in and an explicit state sync.
 *
 * @returns {Promise<ServiceWorkerRegistration | null>}
 */
export async function registerPwaServiceWorker() {
  if (!pwaServiceWorkerSupported()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing?.active?.scriptURL?.includes("sw-live-proof")) {
      return existing;
    }
    return await navigator.serviceWorker.register(PWA_SW_SCRIPT_URL, {
      type: "module",
      scope: "/",
    });
  } catch (err) {
    console.warn("[humanity] PWA service worker registration failed:", err);
    return null;
  }
}
