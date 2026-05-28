/**
 * Steward PWA install card (lazy-loaded after device status bootstrap).
 * @see docs/PWA_INSTALL.md
 */

import { getWalletCount } from "./device-wallet.mjs";
import { getInboxItems } from "./device-inbox.mjs";
import {
  canTriggerNativeInstallPrompt,
  PWA_INSTALL_DISMISS_KEY,
  shouldShowIosAddToHomeInstructions,
  shouldShowPwaInstallSurface,
} from "./pwa-install-ux-core.mjs";
import { pwaInstallCardBodyHtml } from "./pwa-install-html.mjs";

/** @type {BeforeInstallPromptEvent | null} */
let deferredPrompt = null;

let renderScheduled = false;
let listenersBound = false;

/**
 * @typedef {Event & { prompt: () => Promise<{ outcome: string }> }} BeforeInstallPromptEvent
 */

function isStandaloneMode() {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // @ts-expect-error legacy iOS
  if (window.navigator.standalone === true) return true;
  return false;
}

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

function gatherSurfaceInput() {
  return {
    pathname: window.location.pathname,
    standalone: isStandaloneMode(),
    deferredPromptAvailable: Boolean(deferredPrompt),
    isIosSafari: isIosSafari(),
    dismissedAtIso: readDismissedAtIso(),
    savedCardCount: getWalletCount(),
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
  if (!shouldShowPwaInstallSurface(input)) {
    hideInstallCard();
    return;
  }

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
    if (e.key === "hc_wallet" || e.key === PWA_INSTALL_DISMISS_KEY) {
      scheduleRenderInstallCard();
    }
  });

  scheduleRenderInstallCard();
}

bindListeners();

export { scheduleRenderInstallCard as renderPwaInstallCardForTests };
