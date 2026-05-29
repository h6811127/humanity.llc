/**
 * Browser background alerts - live proof when tab hidden (device-only).
 * @see docs/DEVICE_INBOX.md phases 4+
 */
import {
  inboxKindAllowsOsNotification,
  isBrowserNotifEnabled as readBrowserNotifEnabled,
  osNotificationContentForLiveProof,
  shouldShowBrowserNotifPrompt,
  STORAGE_BROWSER_NOTIF,
  STORAGE_PROMPT_DISMISS,
} from "./device-browser-notifications-core.mjs?v=67";
import { buildLiveControlProofHref } from "./device-live-control-inbox-core.mjs";
import { getLiveControlPending, getLiveControlPendingCount } from "./device-live-control-inbox.mjs";
import { logInboxDiagnostic } from "./device-inbox-diagnostics.mjs?v=67";
import {
  registerLiveProofServiceWorker,
  syncLiveProofServiceWorkerState,
  teardownLiveProofServiceWorker,
} from "./device-browser-notifications-sw.mjs";

const TAG_LIVE_PROOF = "hc-live-proof";
const SESSION_OS_INTERACT = "hc_browser_notif_os_interact";

/** @returns {boolean} */
export function isBrowserNotifEnabled() {
  return readBrowserNotifEnabled();
}

/** @param {boolean} on */
export function setBrowserNotifEnabled(on) {
  try {
    localStorage.setItem(STORAGE_BROWSER_NOTIF, on ? "on" : "off");
  } catch {
    /* ignore */
  }
  if (on) {
    void registerLiveProofServiceWorker();
  } else {
    void teardownLiveProofServiceWorker();
  }
  syncBrowserNotifToggleButtons();
  syncBrowserNotifPrompts();
}

function isPromptDismissed() {
  try {
    return localStorage.getItem(STORAGE_PROMPT_DISMISS) === "1";
  } catch {
    return false;
  }
}

export function dismissBrowserNotifPrompt() {
  try {
    localStorage.setItem(STORAGE_PROMPT_DISMISS, "1");
  } catch {
    /* ignore */
  }
  logInboxDiagnostic({ type: "browser_alert_dismissed_prompt" });
  syncBrowserNotifPrompts();
}

function notificationSupported() {
  return typeof Notification !== "undefined";
}

function notificationPermission() {
  if (!notificationSupported()) return "unsupported";
  return Notification.permission;
}

async function ensurePermission() {
  const perm = notificationPermission();
  if (perm === "unsupported") return "unsupported";
  if (perm === "granted") return "granted";
  if (perm === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/** @returns {Promise<boolean>} */
export async function enableBrowserAlerts() {
  const perm = await ensurePermission();
  if (perm === "granted") {
    setBrowserNotifEnabled(true);
    await registerLiveProofServiceWorker();
    await syncLiveProofServiceWorkerState({ pollNow: false });
    logInboxDiagnostic({ type: "browser_alert_opt_in" });
    return true;
  }
  setBrowserNotifEnabled(false);
  if (perm === "denied") {
    logInboxDiagnostic({ type: "browser_alert_denied" });
  }
  syncBrowserNotifPrompts();
  return false;
}

function promptContext() {
  return {
    supported: notificationSupported(),
    enabled: isBrowserNotifEnabled() && notificationPermission() === "granted",
    dismissed: isPromptDismissed(),
    pendingCount: getLiveControlPendingCount(),
    tabVisible: document.visibilityState === "visible",
  };
}

export function shouldShowLiveProofNotifPrompt() {
  return shouldShowBrowserNotifPrompt(promptContext());
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * @param {HTMLElement | null} host
 * @param {{ compact?: boolean }} [opts]
 */
export function renderBrowserNotifPrompt(host, opts = {}) {
  if (!host) return;
  host.dataset.deviceBrowserNotifPrompt = "1";
  const compact = Boolean(opts.compact);
  const perm = notificationPermission();
  const show = shouldShowLiveProofNotifPrompt();
  const pending = getLiveControlPendingCount() > 0;

  if (
    perm === "denied" &&
    pending &&
    !isBrowserNotifEnabled()
  ) {
    host.hidden = false;
    host.innerHTML = `
      <p class="device-browser-notif-prompt-copy device-browser-notif-prompt-copy--denied">
        Background alerts are blocked. Enable notifications in your browser settings, or use the inbox badge while this tab is open.
      </p>`;
    return;
  }

  if (!show) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }

  host.hidden = false;
  const copy = compact
    ? "Get an alert when this tab is in the background."
    : "Someone is waiting for live proof. Get an alert when this tab is in the background?";

  host.innerHTML = `
    <div class="device-browser-notif-prompt hc-notice hc-notice--info" role="region" aria-label="Background alerts">
      <p class="device-browser-notif-prompt-copy">${escapeHtml(copy)}</p>
      <div class="device-browser-notif-prompt-actions">
        <button type="button" class="btn-secondary device-browser-notif-prompt-enable">
          Turn on background alerts
        </button>
        <button type="button" class="device-browser-notif-prompt-dismiss">Not now</button>
      </div>
      <p class="device-browser-notif-prompt-denied" hidden>
        Notifications blocked. Enable in your browser settings, or use the inbox badge while you’re here.
      </p>
    </div>`;

  host.querySelector(".device-browser-notif-prompt-enable")?.addEventListener("click", async () => {
    const ok = await enableBrowserAlerts();
    const deniedEl = host.querySelector(".device-browser-notif-prompt-denied");
    if (!ok && deniedEl instanceof HTMLElement && notificationPermission() === "denied") {
      deniedEl.hidden = false;
      host.querySelector(".device-browser-notif-prompt-actions")?.setAttribute("hidden", "");
    }
  });

  host.querySelector(".device-browser-notif-prompt-dismiss")?.addEventListener("click", () => {
    dismissBrowserNotifPrompt();
  });
}

function ensureAlertsPromptHost() {
  for (const alertsId of ["device-hub-alerts-top", "wallet-alerts-top"]) {
    const alerts = document.getElementById(alertsId);
    if (!alerts) continue;
    let host = alerts.querySelector("[data-device-browser-notif-prompt-host]");
    if (!host) {
      host = document.createElement("div");
      host.className = "device-browser-notif-prompt-host";
      host.dataset.deviceBrowserNotifPromptHost = "1";
      alerts.insertBefore(host, alerts.firstChild);
    }
    renderBrowserNotifPrompt(host);
  }
}

export function syncBrowserNotifPrompts() {
  ensureAlertsPromptHost();
  const footer = document.getElementById("device-inbox-sheet-footer");
  if (footer) {
    renderBrowserNotifPrompt(footer, { compact: true });
  }
}

function syncBrowserNotifToggleButtons() {
  const on = isBrowserNotifEnabled();
  const perm = notificationPermission();
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
      btn.textContent =
        !on
          ? "Browser alerts · off"
          : perm === "granted"
            ? "Browser alerts · on"
            : perm === "denied"
              ? "Browser alerts · blocked in settings"
              : "Browser alerts · tap to allow";
    }
    btn.disabled = perm === "unsupported";
  });
}

let lastLiveProofSig = "";

export function maybeNotifyLiveProof() {
  if (!inboxKindAllowsOsNotification("live_proof")) return;
  if (!isBrowserNotifEnabled()) return;
  if (!notificationSupported() || notificationPermission() !== "granted") return;
  if (document.visibilityState === "visible") return;

  const pending = getLiveControlPending();
  const n = pending.length;
  const sig = n > 0 ? pending.map((p) => p.challenge_id).join("|") : "";
  if (n === 0) {
    lastLiveProofSig = "";
    return;
  }
  if (sig === lastLiveProofSig) return;
  lastLiveProofSig = sig;

  const first = pending[0];
  const { title, body } = osNotificationContentForLiveProof(first);
  const href = buildLiveControlProofHref(first, location.origin);

  const requireInteraction =
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem(SESSION_OS_INTERACT) !== "1";

  try {
    const ntf = new Notification(title, {
      body,
      tag: TAG_LIVE_PROOF,
      requireInteraction,
    });
    if (requireInteraction) {
      try {
        sessionStorage.setItem(SESSION_OS_INTERACT, "1");
      } catch {
        /* ignore */
      }
    }
    ntf.onclick = () => {
      logInboxDiagnostic({ type: "os_notification_click" });
      window.focus();
      ntf.close();
      location.href = href;
    };
  } catch {
    /* ignore */
  }
  if (document.visibilityState === "hidden") {
    void syncLiveProofServiceWorkerState({ pollNow: true });
  }
}

export function mountBrowserNotifToggles() {
  document.querySelectorAll("[data-device-browser-notif-toggle]").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn.dataset.browserNotifBound === "1") return;
    btn.dataset.browserNotifBound = "1";
    btn.addEventListener("click", async () => {
      if (isBrowserNotifEnabled()) {
        setBrowserNotifEnabled(false);
        return;
      }
      await enableBrowserAlerts();
    });
  });
  syncBrowserNotifToggleButtons();
}

let browserNotifListenersBound = false;

export function initBrowserNotifications() {
  if (browserNotifListenersBound) {
    mountBrowserNotifToggles();
    syncBrowserNotifPrompts();
    return;
  }
  browserNotifListenersBound = true;
  mountBrowserNotifToggles();
  syncBrowserNotifPrompts();
  window.addEventListener("hc-live-control-inbox-changed", () => {
    maybeNotifyLiveProof();
    syncBrowserNotifPrompts();
    if (document.visibilityState === "hidden") {
      void syncLiveProofServiceWorkerState({ pollNow: true });
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      maybeNotifyLiveProof();
      void syncLiveProofServiceWorkerState({ pollNow: true });
    } else {
      syncBrowserNotifPrompts();
    }
  });
  window.addEventListener("pagehide", () => {
    void syncLiveProofServiceWorkerState({ pollNow: true });
  });
  window.addEventListener("hc-resolver-health-changed", () => {
    if (isBrowserNotifEnabled() && notificationPermission() === "granted") {
      void syncLiveProofServiceWorkerState({ pollNow: false });
    }
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      mountBrowserNotifToggles();
      syncBrowserNotifPrompts();
    });
  }
}
