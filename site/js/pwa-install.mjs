import {
  PWA_INSTALL_DISMISSED_KEY,
  PWA_INSTALL_INSTALLED_KEY,
  isLikelyIosDevice,
  isStandaloneDisplay,
  pwaInstallPromptMode,
} from "./pwa-install-core.mjs";
import { registerPwaServiceWorker } from "./pwa-service-worker.mjs";

const HOST_SELECTOR = "[data-pwa-install-prompt-host]";

/** @type {BeforeInstallPromptEvent | null} */
let deferredInstallPrompt = null;
let mounted = false;

/**
 * @typedef {Event & {
 *   prompt?: () => Promise<void>,
 *   userChoice?: Promise<{ outcome?: string }>
 * }} BeforeInstallPromptEvent
 */

function readStorageFlag(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeStorageFlag(key) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

function standalone() {
  const standaloneMedia =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return isStandaloneDisplay({
    standaloneMedia,
    navigatorStandalone: navigator.standalone === true,
  });
}

function iosDevice() {
  return isLikelyIosDevice({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  });
}

function promptMode() {
  return pwaInstallPromptMode({
    standalone: standalone(),
    dismissed: readStorageFlag(PWA_INSTALL_DISMISSED_KEY),
    installed: readStorageFlag(PWA_INSTALL_INSTALLED_KEY),
    promptAvailable: Boolean(deferredInstallPrompt),
    ios: iosDevice(),
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function ensureHost(container) {
  if (!container) return null;
  let host = container.querySelector(HOST_SELECTOR);
  if (!host) {
    host = document.createElement("div");
    host.className = "pwa-install-prompt-host";
    host.dataset.pwaInstallPromptHost = "1";
    container.insertBefore(host, container.firstChild);
  }
  return host;
}

function promptCopy(mode) {
  if (mode === "install") {
    return {
      title: "Add Humanity to your home screen",
      detail: "Launch this device wallet without the browser address bar.",
      primary: "Add",
    };
  }
  return {
    title: "Add Humanity to your home screen",
    detail: "On iPhone or iPad, use Share, then Add to Home Screen.",
    primary: "",
  };
}

async function runInstallPrompt(host) {
  if (!deferredInstallPrompt?.prompt) return;
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice?.catch(() => null);
    if (choice?.outcome === "accepted") {
      writeStorageFlag(PWA_INSTALL_INSTALLED_KEY);
    }
  } catch {
    /* Browser rejected or cancelled the prompt. */
  }
  renderHost(host);
}

function renderHost(host) {
  if (!host) return;
  const mode = promptMode();
  if (mode === "hidden") {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }

  const copy = promptCopy(mode);
  host.hidden = false;
  host.innerHTML = `
    <div class="pwa-install-prompt hc-notice hc-notice--info" role="region" aria-label="${escapeHtml(copy.title)}">
      <p class="pwa-install-prompt-title">${escapeHtml(copy.title)}</p>
      <p class="pwa-install-prompt-copy">${escapeHtml(copy.detail)}</p>
      <div class="pwa-install-prompt-actions">
        ${
          mode === "install"
            ? `<button type="button" class="btn-secondary pwa-install-prompt-install">${escapeHtml(copy.primary)}</button>`
            : ""
        }
        <button type="button" class="pwa-install-prompt-dismiss">Not now</button>
      </div>
    </div>`;

  host.querySelector(".pwa-install-prompt-install")?.addEventListener("click", () => {
    void runInstallPrompt(host);
  });
  host.querySelector(".pwa-install-prompt-dismiss")?.addEventListener("click", () => {
    writeStorageFlag(PWA_INSTALL_DISMISSED_KEY);
    renderHost(host);
  });
}

function renderAll() {
  document.querySelectorAll(HOST_SELECTOR).forEach((host) => renderHost(host));
}

export function syncPwaInstallPrompts() {
  for (const containerId of ["device-hub-alerts-top", "wallet-alerts-top"]) {
    renderHost(ensureHost(document.getElementById(containerId)));
  }
}

export function initPwaInstallPrompt() {
  syncPwaInstallPrompts();
  void registerPwaServiceWorker();
  if (mounted) return;
  mounted = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = /** @type {BeforeInstallPromptEvent} */ (event);
    syncPwaInstallPrompts();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    writeStorageFlag(PWA_INSTALL_INSTALLED_KEY);
    renderAll();
  });

  const media = window.matchMedia?.("(display-mode: standalone)");
  media?.addEventListener?.("change", renderAll);
}
