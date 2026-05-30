/**
 * Landing Shortcuts & settings — resolver tab sync (Phase 2).
 * @see docs/DEVICE_TAB_RESOLVER_SYNC.md
 */
import { resolverSyncToggleSub } from "./device-prefs-boot-core.mjs";
import { refreshResolverChecksFromHub } from "./device-hub-ui.mjs";
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
      sub.textContent = resolverSyncToggleSub(on);
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

export function initResolverRefreshAllTabsAction() {
  const btn = document.getElementById("device-resolver-refresh-all-tabs");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!(btn instanceof HTMLButtonElement) || btn.disabled) return;
    btn.disabled = true;
    void refreshResolverChecksFromHub()
      .catch(() => {})
      .finally(() => {
        btn.disabled = false;
      });
  });
}
