/**
 * Landing Shortcuts & settings — share network checks across tabs.
 * @see docs/DEVICE_TAB_RESOLVER_SYNC.md Phase 2
 */
import {
  readResolverSyncTabsPref,
  setResolverSyncTabsEnabled,
} from "./device-resolver-sync.mjs";

export function initResolverSyncTabsToggle() {
  const btn = document.getElementById("device-resolver-sync-toggle");
  if (!btn) return;

  function sync() {
    const on = readResolverSyncTabsPref();
    const title = btn.querySelector(".list-title");
    const sub = btn.querySelector(".list-sub");
    if (title && sub) {
      title.textContent = "Share network checks";
      sub.textContent = on
        ? "On · other tabs use the same last check"
        : "Off · each tab checks on its own";
    }
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  sync();
  btn.addEventListener("click", () => {
    setResolverSyncTabsEnabled(!readResolverSyncTabsPref());
    sync();
    window.dispatchEvent(new Event("hc-resolver-sync-pref-changed"));
  });

  window.addEventListener("hc-resolver-sync-pref-changed", sync);
}
