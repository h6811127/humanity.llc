/**
 * iOS Safari storage eviction notice (lazy-loaded after device status bootstrap).
 * @see docs/SAFARI_KEYS_CUSTODY.md P2-1
 */

import { getWalletCount } from "./device-wallet.mjs";
import {
  parseLastSigningShellMode,
  LAST_SIGNING_SHELL_MODE_KEY,
} from "./device-pwa-session-mismatch-core.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";
import {
  isIosWebKitUserAgent,
  SAFARI_ITP_NOTICE_DISMISS_KEY,
  shouldShowSafariItpStorageNotice,
} from "./safari-itp-storage-notice-core.mjs";
import { safariItpStorageNoticeCardBodyHtml } from "./safari-itp-storage-notice-html.mjs";

let renderScheduled = false;
let listenersBound = false;

function readDismissedAtIso() {
  try {
    return localStorage.getItem(SAFARI_ITP_NOTICE_DISMISS_KEY);
  } catch {
    return null;
  }
}

function writeDismissedAtIso() {
  try {
    localStorage.setItem(SAFARI_ITP_NOTICE_DISMISS_KEY, new Date().toISOString());
  } catch {
    /* private mode */
  }
}

function deviceStatusLoadError() {
  return document.getElementById("top-chrome")?.dataset.deviceStatusError === "1";
}

function readLastSigningShellMode() {
  try {
    return parseLastSigningShellMode(localStorage.getItem(LAST_SIGNING_SHELL_MODE_KEY));
  } catch {
    return null;
  }
}

function gatherNoticeInput() {
  return {
    pathname: window.location.pathname,
    isIosWebKit: isIosWebKitUserAgent(navigator.userAgent, navigator),
    savedCardCount: getWalletCount(),
    dismissedAtIso: readDismissedAtIso(),
    deviceStatusLoadError: deviceStatusLoadError(),
    standalone: readStandaloneModeFromWindow(window),
    lastSigningShellMode: readLastSigningShellMode(),
  };
}

function hideNoticeCard() {
  const card = document.getElementById("device-safari-itp-notice-card");
  if (!card) return;
  card.hidden = true;
  card.innerHTML = "";
  card.classList.remove(
    "hc-emphasis-card",
    "hc-emphasis-card--info",
    "device-safari-itp-notice-card"
  );
}

function renderNoticeCard() {
  renderScheduled = false;
  const card = document.getElementById("device-safari-itp-notice-card");
  if (!card) return;

  const input = gatherNoticeInput();
  if (!shouldShowSafariItpStorageNotice(input)) {
    hideNoticeCard();
    return;
  }

  card.hidden = false;
  card.className = "hc-emphasis-card hc-emphasis-card--info device-safari-itp-notice-card";
  card.setAttribute("role", "status");
  card.innerHTML = safariItpStorageNoticeCardBodyHtml({
    standalone: input.standalone,
  });

  card.querySelector("[data-safari-itp-notice-dismiss]")?.addEventListener("click", (e) => {
    e.preventDefault();
    writeDismissedAtIso();
    hideNoticeCard();
  });
}

function scheduleRenderNoticeCard() {
  if (renderScheduled) return;
  renderScheduled = true;
  window.requestAnimationFrame(() => {
    renderNoticeCard();
  });
}

function bindListeners() {
  if (listenersBound) return;
  listenersBound = true;

  document.addEventListener("hc-device-os-refreshed", scheduleRenderNoticeCard);
  document.addEventListener("hc-cross-tab-custody-invalidated", scheduleRenderNoticeCard);
  window.addEventListener("hc-live-control-inbox-changed", scheduleRenderNoticeCard);
  window.addEventListener("storage", (e) => {
    if (
      e.key === "hc_wallet" ||
      e.key === SAFARI_ITP_NOTICE_DISMISS_KEY ||
      e.key === LAST_SIGNING_SHELL_MODE_KEY
    ) {
      scheduleRenderNoticeCard();
    }
  });

  scheduleRenderNoticeCard();
}

bindListeners();

export { scheduleRenderNoticeCard as renderSafariItpNoticeCardForTests };
