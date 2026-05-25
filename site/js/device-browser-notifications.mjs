/**
 * Browser notifications v1 — live proof waiting on saved cards (device-only).
 */
import { getLiveControlPending, getLiveControlPendingCount } from "./device-live-control-inbox.mjs";

const STORAGE_KEY = "hc_browser_notif";
const TAG_LIVE_PROOF = "hc-live-proof";

/** @returns {boolean} */
export function isBrowserNotifEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

/** @param {boolean} on */
export function setBrowserNotifEnabled(on) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
  syncBrowserNotifToggleButtons();
}

function toggleLabel(on, permission) {
  if (!on) return "Browser alerts · off";
  if (permission === "granted") return "Browser alerts · on";
  if (permission === "denied") return "Browser alerts · blocked in settings";
  return "Browser alerts · tap to allow";
}

function syncBrowserNotifToggleButtons() {
  const on = isBrowserNotifEnabled();
  const perm =
    typeof Notification !== "undefined" ? Notification.permission : "unsupported";
  document.querySelectorAll("[data-device-browser-notif-toggle]").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.setAttribute("aria-pressed", on && perm === "granted" ? "true" : "false");
    const title = btn.querySelector(".list-title");
    const sub = btn.querySelector(".list-sub");
    if (title && sub) {
      title.textContent = "Browser alerts";
      sub.textContent =
        perm === "unsupported"
          ? "Not supported in this browser"
          : on && perm === "granted"
            ? "On · live proof in background"
            : perm === "denied"
              ? "Blocked · enable in system settings"
              : "Off · tap to allow";
    } else {
      btn.textContent = toggleLabel(on, perm);
    }
    btn.disabled = perm === "unsupported";
  });
}

async function ensurePermission() {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

let lastLiveProofSig = "";

function liveProofNotifBody() {
  const pending = getLiveControlPending();
  const n = pending.length;
  if (n === 0) return "";
  const first = pending[0];
  const label =
    typeof first.entry?.label === "string"
      ? first.entry.label
      : first.entry?.profile_id
        ? `${String(first.entry.profile_id).slice(0, 12)}…`
        : "saved card";
  if (n === 1) return `Live proof waiting · ${label}`;
  return `${n} live proofs waiting · ${label} +${n - 1} more`;
}

export function maybeNotifyLiveProof() {
  if (!isBrowserNotifEnabled()) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  const n = getLiveControlPendingCount();
  const sig = n > 0 ? getLiveControlPending().map((p) => p.challenge_id).join("|") : "";
  if (n === 0) {
    lastLiveProofSig = "";
    return;
  }
  if (sig === lastLiveProofSig) return;
  lastLiveProofSig = sig;

  const body = liveProofNotifBody();
  if (!body) return;

  try {
    const ntf = new Notification("humanity.llc", {
      body,
      tag: TAG_LIVE_PROOF,
    });
    ntf.onclick = () => {
      window.focus();
      ntf.close();
      location.href = "/wallet/";
    };
  } catch {
    /* ignore */
  }
}

export function mountBrowserNotifToggles() {
  document.querySelectorAll("[data-device-browser-notif-toggle]").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn.dataset.browserNotifBound === "1") return;
    btn.dataset.browserNotifBound = "1";
    btn.addEventListener("click", async () => {
      const on = isBrowserNotifEnabled();
      if (on) {
        setBrowserNotifEnabled(false);
        return;
      }
      const perm = await ensurePermission();
      if (perm === "granted") {
        setBrowserNotifEnabled(true);
      } else {
        setBrowserNotifEnabled(false);
      }
    });
  });
  syncBrowserNotifToggleButtons();
}

export function initBrowserNotifications() {
  mountBrowserNotifToggles();
  window.addEventListener("hc-live-control-inbox-changed", maybeNotifyLiveProof);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      maybeNotifyLiveProof();
    }
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountBrowserNotifToggles);
  }
}

initBrowserNotifications();
