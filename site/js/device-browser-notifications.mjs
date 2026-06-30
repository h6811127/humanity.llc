/**
 * Browser background alerts - live proof when tab hidden (device-only).
 * @see docs/DEVICE_INBOX.md phases 4+
 */
import {
  browserAlertBackgroundCopy,
  browserAlertWhileOpenCopy,
  readShellCopyContext,
} from "./device-shell-copy-core.mjs";
import { LANDING_ROW_ALERTS_TITLE } from "./landing-focus-settings-copy-core.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";
import {
  browserNotifTogglePressed,
  browserNotifToggleSub,
} from "./device-prefs-boot-core.mjs";
import {
  isBrowserNotifEnabled as readBrowserNotifEnabled,
  shouldShowBrowserNotifPrompt,
  STORAGE_BROWSER_NOTIF,
  STORAGE_PROMPT_DISMISS,
} from "./device-browser-notifications-core.mjs?v=94";
import { getLiveControlPendingCount } from "./device-live-control-inbox.mjs";
import { logInboxDiagnostic } from "./device-inbox-diagnostics.mjs?v=94";
import { applyOsNotificationsFromInbox } from "./device-notification-delivery.mjs?v=94";
import { probeLiveControlInboxForBackgroundAlerts } from "./device-live-control-inbox.mjs?v=94";
import {
  LIVE_CONTROL_BACKGROUND_ALERT_POLL_MS,
  LIVE_CONTROL_POLL_MS_ACTIVE,
  liveControlBackgroundAlertPollShouldRun,
} from "./device-live-control-poll-scheduler.mjs";
import { bindLiveProofNotificationNavListener } from "./device-live-proof-notification-nav.mjs";
import { getResolverHealthStatus } from "./device-wallet-since-visit-gate.mjs?v=94";
import { isStewardPushHealthy } from "./device-steward-push.mjs";
import {
  registerLiveProofServiceWorker,
  syncLiveProofServiceWorkerState,
  teardownLiveProofServiceWorker,
} from "./device-browser-notifications-sw.mjs";

const SESSION_OS_INTERACT = "hc_browser_notif_os_interact";
const SW_POLL_NOW_DEFER_MS = 400;

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
    syncBackgroundAlertPollTimer();
  } else {
    void teardownLiveProofServiceWorker();
    clearBackgroundAlertPollTimer();
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
    syncBackgroundAlertPollTimer();
    if (document.visibilityState === "hidden") {
      void probeAndDeliverBackgroundAlerts();
    }
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
  const { surface, companionBrowser } = readShellCopyContext(window);
  const copyOpts = { companionBrowser };
  const perm = notificationPermission();
  const show = shouldShowLiveProofNotifPrompt();
  const pending = getLiveControlPendingCount() > 0;
  const whileOpen = browserAlertWhileOpenCopy(surface, copyOpts);

  if (
    perm === "denied" &&
    pending &&
    !isBrowserNotifEnabled()
  ) {
    host.hidden = false;
    host.innerHTML = `
      <p class="device-browser-notif-prompt-copy device-browser-notif-prompt-copy--denied">
        Background alerts are blocked. Enable notifications in your browser settings, or ${whileOpen}.
      </p>`;
    return;
  }

  if (!show) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }

  host.hidden = false;
  const copy = browserAlertBackgroundCopy(compact, surface, copyOpts);

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
  const permState =
    perm === "granted" || perm === "denied" ? perm : perm === "unsupported" ? "unsupported" : "default";
  const standalone = readStandaloneModeFromWindow(window);
  document.querySelectorAll("[data-device-browser-notif-toggle]").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.setAttribute("aria-pressed", browserNotifTogglePressed(on, permState) ? "true" : "false");
    const title = btn.querySelector(".list-title");
    const sub = btn.querySelector(".list-sub");
    if (title && sub) {
      title.textContent = LANDING_ROW_ALERTS_TITLE;
      sub.textContent = browserNotifToggleSub(on, permState, { standalone });
    } else {
      btn.textContent =
        !on
          ? `${LANDING_ROW_ALERTS_TITLE} · off`
          : perm === "granted"
            ? `${LANDING_ROW_ALERTS_TITLE} · on`
            : perm === "denied"
              ? `${LANDING_ROW_ALERTS_TITLE} · blocked in settings`
              : `${LANDING_ROW_ALERTS_TITLE} · tap to allow`;
    }
    btn.disabled = perm === "unsupported";
  });
}

function readOsInteractShown() {
  try {
    return sessionStorage.getItem(SESSION_OS_INTERACT) === "1";
  } catch {
    return false;
  }
}

let backgroundProbeInFlight = false;
/** @type {ReturnType<typeof setInterval> | null} */
let backgroundAlertPollTimer = null;

function readBackgroundAlertPollContext() {
  return {
    alertsEnabled: isBrowserNotifEnabled(),
    permissionGranted: notificationPermission() === "granted",
    tabHidden: document.visibilityState === "hidden",
    resolverHealth: getResolverHealthStatus(),
    stewardPushHealthy: isStewardPushHealthy(),
  };
}

function clearBackgroundAlertPollTimer() {
  if (backgroundAlertPollTimer != null) {
    clearTimeout(backgroundAlertPollTimer);
    backgroundAlertPollTimer = null;
  }
}

function backgroundAlertPollIntervalMs() {
  return getLiveControlPendingCount() > 0
    ? LIVE_CONTROL_POLL_MS_ACTIVE
    : LIVE_CONTROL_BACKGROUND_ALERT_POLL_MS;
}

function armBackgroundAlertPollTimer() {
  clearBackgroundAlertPollTimer();
  const ctx = readBackgroundAlertPollContext();
  if (!liveControlBackgroundAlertPollShouldRun(ctx)) return;

  const tick = () => {
    if (!liveControlBackgroundAlertPollShouldRun(readBackgroundAlertPollContext())) {
      clearBackgroundAlertPollTimer();
      return;
    }
    void probeAndDeliverBackgroundAlerts().finally(() => {
      if (!liveControlBackgroundAlertPollShouldRun(readBackgroundAlertPollContext())) {
        clearBackgroundAlertPollTimer();
        return;
      }
      backgroundAlertPollTimer = setTimeout(tick, backgroundAlertPollIntervalMs());
    });
  };

  backgroundAlertPollTimer = setTimeout(tick, backgroundAlertPollIntervalMs());
}

function syncBackgroundAlertPollTimer() {
  const ctx = readBackgroundAlertPollContext();
  if (!liveControlBackgroundAlertPollShouldRun(ctx)) {
    clearBackgroundAlertPollTimer();
    return;
  }
  if (backgroundAlertPollTimer != null) return;
  armBackgroundAlertPollTimer();
}

function scheduleServiceWorkerPollNow() {
  void syncLiveProofServiceWorkerState({ pollNow: true });
  setTimeout(() => {
    if (document.visibilityState === "hidden") {
      void syncLiveProofServiceWorkerState({ pollNow: true });
    }
  }, SW_POLL_NOW_DEFER_MS);
}

async function probeAndDeliverBackgroundAlerts() {
  if (backgroundProbeInFlight) return;
  if (!isBrowserNotifEnabled() || notificationPermission() !== "granted") {
    void runOsDeliveryFromInbox();
    return;
  }
  backgroundProbeInFlight = true;
  try {
    await probeLiveControlInboxForBackgroundAlerts();
    await runOsDeliveryFromInbox();
  } finally {
    backgroundProbeInFlight = false;
  }
}

async function runOsDeliveryFromInbox() {
  const result = await applyOsNotificationsFromInbox({
    supported: notificationSupported(),
    permissionGranted: notificationPermission() === "granted",
    browserAlertsEnabled: isBrowserNotifEnabled(),
    tabVisible: document.visibilityState === "visible",
    interactShown: readOsInteractShown(),
    pageOrigin: location.origin,
    onLiveProofClick: () => {
      logInboxDiagnostic({ type: "os_notification_click" });
    },
  });
  if (result.plans.some((p) => p.kind === "live_proof" && p.requireInteraction)) {
    try {
      sessionStorage.setItem(SESSION_OS_INTERACT, "1");
    } catch {
      /* ignore */
    }
  }
  if (document.visibilityState === "hidden") {
    scheduleServiceWorkerPollNow();
  }
}

/** @deprecated Use applyOsNotificationsFromInbox via runOsDeliveryFromInbox */
export function maybeNotifyRelayOffer() {
  void runOsDeliveryFromInbox();
}

/** @deprecated Use applyOsNotificationsFromInbox via runOsDeliveryFromInbox */
export function maybeNotifyLiveProof() {
  void runOsDeliveryFromInbox();
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
  bindLiveProofNotificationNavListener();
  if (browserNotifListenersBound) {
    mountBrowserNotifToggles();
    syncBrowserNotifPrompts();
    return;
  }
  browserNotifListenersBound = true;
  mountBrowserNotifToggles();
  syncBrowserNotifPrompts();
  window.addEventListener("hc-device-hub-changed", () => {
    void runOsDeliveryFromInbox();
    syncBrowserNotifPrompts();
  });
  window.addEventListener("hc-live-control-inbox-changed", () => {
    void runOsDeliveryFromInbox();
    syncBrowserNotifPrompts();
    if (document.visibilityState === "hidden") {
      scheduleServiceWorkerPollNow();
    }
  });
  window.addEventListener("hc-relay-offer-inbox-changed", () => {
    void runOsDeliveryFromInbox();
    syncBrowserNotifPrompts();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      syncBackgroundAlertPollTimer();
      void probeAndDeliverBackgroundAlerts();
      scheduleServiceWorkerPollNow();
    } else {
      clearBackgroundAlertPollTimer();
      syncBrowserNotifPrompts();
    }
  });
  window.addEventListener("pagehide", () => {
    syncBackgroundAlertPollTimer();
    void probeAndDeliverBackgroundAlerts();
    scheduleServiceWorkerPollNow();
  });
  window.addEventListener("hc-resolver-health-changed", () => {
    syncBackgroundAlertPollTimer();
    if (isBrowserNotifEnabled() && notificationPermission() === "granted") {
      void syncLiveProofServiceWorkerState({ pollNow: false });
    }
  });
  syncBackgroundAlertPollTimer();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      mountBrowserNotifToggles();
      syncBrowserNotifPrompts();
    });
  }
}
