/**
 * Steward PWA install card (lazy-loaded after device status bootstrap).
 * @see docs/PWA_INSTALL.md
 */

import { getWalletCount, loadWalletSummary } from "./device-wallet.mjs";
import { getInboxItems } from "./device-inbox.mjs";
import {
  canTriggerNativeInstallPrompt,
  hasAnyWalletSetupDone,
  parseSetupDoneMap,
  PWA_INSTALL_DISMISS_KEY,
  PWA_INSTALL_SETUP_DONE_KEY,
  shouldShowIosAddToHomeInstructions,
  shouldShowPwaInstallDeferralHint,
  shouldShowPwaInstallSurface,
} from "./pwa-install-ux-core.mjs";
import { pwaInstallCardBodyHtml, pwaInstallDeferralCardBodyHtml } from "./pwa-install-html.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";

/** @type {BeforeInstallPromptEvent | null} */
let deferredPrompt = null;

let renderScheduled = false;
let listenersBound = false;

/**
 * @typedef {Event & { prompt: () => Promise<{ outcome: string }> }} BeforeInstallPromptEvent
 */

function isIosSafari() {
  const ua = navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios;
}

function readDismissedAtIso() {
  try {
    return localStorage.getItem(PWA_INSTALL_DISMISS_KEY);
  } catch {
    return null;
  }
}

function writeDismissedAtIso() {
  try {
    localStorage.setItem(PWA_INSTALL_DISMISS_KEY, new Date().toISOString());
  } catch {
    /* private mode */
  }
}

function deviceStatusLoadError() {
  return document.getElementById("top-chrome")?.dataset.deviceStatusError === "1";
}

function activeInboxKinds() {
  return getInboxItems().map((item) => item.kind);
}

function readSetupDoneState() {
  try {
    const raw = localStorage.getItem(PWA_INSTALL_SETUP_DONE_KEY);
    const map = parseSetupDoneMap(raw);
    const profileIds = loadWalletSummary().profileIds;
    return hasAnyWalletSetupDone(map, profileIds);
  } catch {
    return false;
  }
}

function gatherSurfaceInput() {
  return {
    pathname: window.location.pathname,
    standalone: readStandaloneModeFromWindow(window),
    deferredPromptAvailable: Boolean(deferredPrompt),
    isIosSafari: isIosSafari(),
    dismissedAtIso: readDismissedAtIso(),
    savedCardCount: getWalletCount(),
    anyWalletSetupDone: readSetupDoneState(),
    inboxKinds: activeInboxKinds(),
    deviceStatusLoadError: deviceStatusLoadError(),
  };
}

function hideInstallCard() {
  const card = document.getElementById("device-pwa-install-card");
  if (!card) return;
  card.hidden = true;
  card.innerHTML = "";
  card.classList.remove("hc-emphasis-card", "hc-emphasis-card--info", "device-pwa-install-card");
}

function renderInstallCard() {
  renderScheduled = false;
  const card = document.getElementById("device-pwa-install-card");
  if (!card) return;

  const input = gatherSurfaceInput();
  if (shouldShowPwaInstallSurface(input)) {
    const iosManual = shouldShowIosAddToHomeInstructions({
      isIosSafari: input.isIosSafari,
      standalone: input.standalone,
      deferredPromptAvailable: input.deferredPromptAvailable,
    });

    card.hidden = false;
    card.className = "hc-emphasis-card hc-emphasis-card--info device-pwa-install-card";
    card.setAttribute("role", "status");
    card.innerHTML = pwaInstallCardBodyHtml({ iosManual });

    card.querySelector("[data-pwa-install-dismiss]")?.addEventListener("click", (e) => {
      e.preventDefault();
      writeDismissedAtIso();
      hideInstallCard();
    });

    const confirm = card.querySelector("[data-pwa-install-confirm]");
    if (confirm && canTriggerNativeInstallPrompt(input)) {
      confirm.addEventListener("click", async (e) => {
        e.preventDefault();
        if (!deferredPrompt) return;
        try {
          await deferredPrompt.prompt();
        } catch (err) {
          console.info("[humanity] PWA install prompt failed:", err?.message || err);
        }
      });
    }
    return;
  }

  if (shouldShowPwaInstallDeferralHint(input)) {
    card.hidden = false;
    card.className = "hc-emphasis-card hc-emphasis-card--info device-pwa-install-card";
    card.setAttribute("role", "status");
    card.innerHTML = pwaInstallDeferralCardBodyHtml();

    card.querySelector("[data-pwa-install-dismiss]")?.addEventListener("click", (e) => {
      e.preventDefault();
      writeDismissedAtIso();
      hideInstallCard();
    });
    return;
  }

  hideInstallCard();
}

function scheduleRenderInstallCard() {
  if (renderScheduled) return;
  renderScheduled = true;
  window.requestAnimationFrame(() => {
    renderInstallCard();
  });
}

function bindListeners() {
  if (listenersBound) return;
  listenersBound = true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = /** @type {BeforeInstallPromptEvent} */ (e);
    scheduleRenderInstallCard();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    hideInstallCard();
  });

  document.addEventListener("hc-device-os-refreshed", scheduleRenderInstallCard);
  document.addEventListener("hc-cross-tab-custody-invalidated", scheduleRenderInstallCard);
  window.addEventListener("hc-live-control-inbox-changed", scheduleRenderInstallCard);
  window.addEventListener("storage", (e) => {
    if (
      e.key === "hc_wallet" ||
      e.key === PWA_INSTALL_DISMISS_KEY ||
      e.key === PWA_INSTALL_SETUP_DONE_KEY
    ) {
      scheduleRenderInstallCard();
    }
  });

  scheduleRenderInstallCard();
}

bindListeners();

export { scheduleRenderInstallCard as renderPwaInstallCardForTests };
