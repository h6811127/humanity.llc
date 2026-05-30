/**
 * iOS Safari persist-denied notice (lazy-loaded after device status bootstrap).
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md RC-2
 */

import {
  STORAGE_PERSIST_REQUESTED_KEY,
  STORAGE_PERSIST_SETTLED_EVENT,
} from "./device-storage-persist-core.mjs";
import { getWalletSigningKeyCount } from "./device-wallet.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";
import {
  isIosWebKitUserAgent,
  shouldShowStoragePersistDeniedNotice,
  STORAGE_PERSIST_DENIED_NOTICE_DISMISS_KEY,
} from "./safari-storage-persist-denied-notice-core.mjs";
import { storagePersistDeniedNoticeCardBodyHtml } from "./safari-storage-persist-denied-notice-html.mjs";

let renderScheduled = false;
let listenersBound = false;

function readDismissedAtIso() {
  try {
    return localStorage.getItem(STORAGE_PERSIST_DENIED_NOTICE_DISMISS_KEY);
  } catch {
    return null;
  }
}

function writeDismissedAtIso() {
  try {
    localStorage.setItem(STORAGE_PERSIST_DENIED_NOTICE_DISMISS_KEY, new Date().toISOString());
  } catch {
    /* private mode */
  }
}

function readPersistFlag() {
  try {
    return localStorage.getItem(STORAGE_PERSIST_REQUESTED_KEY);
  } catch {
    return null;
  }
}

function deviceStatusLoadError() {
  return document.getElementById("top-chrome")?.dataset.deviceStatusError === "1";
}

function gatherNoticeInput() {
  return {
    pathname: window.location.pathname,
    isIosWebKit: isIosWebKitUserAgent(navigator.userAgent, navigator),
    signingKeyCount: getWalletSigningKeyCount(),
    persistFlag: readPersistFlag(),
    dismissedAtIso: readDismissedAtIso(),
    deviceStatusLoadError: deviceStatusLoadError(),
    standalone: readStandaloneModeFromWindow(window),
  };
}

function hideNoticeCard() {
  const card = document.getElementById("device-safari-persist-denied-notice-card");
  if (!card) return;
  card.hidden = true;
  card.innerHTML = "";
  card.classList.remove(
    "hc-emphasis-card",
    "hc-emphasis-card--warn",
    "device-safari-persist-denied-notice-card"
  );
}

function renderNoticeCard() {
  renderScheduled = false;
  const card = document.getElementById("device-safari-persist-denied-notice-card");
  if (!card) return;

  const input = gatherNoticeInput();
  if (!shouldShowStoragePersistDeniedNotice(input)) {
    hideNoticeCard();
    return;
  }

  card.hidden = false;
  card.className =
    "hc-emphasis-card hc-emphasis-card--warn device-safari-persist-denied-notice-card";
  card.setAttribute("role", "status");
  card.innerHTML = storagePersistDeniedNoticeCardBodyHtml({
    standalone: input.standalone,
  });

  card.querySelector("[data-storage-persist-denied-dismiss]")?.addEventListener("click", (e) => {
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
  window.addEventListener("hc-device-hub-changed", scheduleRenderNoticeCard);
  window.addEventListener(STORAGE_PERSIST_SETTLED_EVENT, scheduleRenderNoticeCard);
  window.addEventListener("storage", (e) => {
    if (
      e.key === STORAGE_PERSIST_REQUESTED_KEY ||
      e.key === STORAGE_PERSIST_DENIED_NOTICE_DISMISS_KEY ||
      e.key === "hc_wallet"
    ) {
      scheduleRenderNoticeCard();
    }
  });

  scheduleRenderNoticeCard();
}

bindListeners();

export { scheduleRenderNoticeCard as renderStoragePersistDeniedNoticeCardForTests };
