/**
 * Landing focus mode  -  hide tutorial sections, show device hub + docs + contact.
 */
import { getWalletCount } from "./device-wallet.mjs";
import { loadPins } from "./device-pins.mjs";
import {
  isLandingFocusModeFromStorage,
  landingFocusDatasetValue,
  LANDING_FOCUS_KEY,
} from "./landing-focus-boot-core.mjs";
import {
  LANDING_ROW_SIMPLE_MODE_TITLE,
  simpleModeToggleSub,
} from "./landing-focus-settings-copy-core.mjs";

const toggle = document.getElementById("landing-focus-toggle");
const docsFull = document.getElementById("landing-docs-full");
const docsFooter = document.getElementById("landing-docs-footer");

function hasDeviceData() {
  return getWalletCount() > 0 || loadPins().length > 0;
}

function isFocusMode() {
  try {
    return isLandingFocusModeFromStorage((key) => localStorage.getItem(key));
  } catch {
    return hasDeviceData();
  }
}

function applyFocus() {
  const on = isFocusMode();
  document.documentElement.dataset.landingFocus = landingFocusDatasetValue(on);
  document.body.classList.toggle("landing-focus-mode", on);
  if (docsFull) docsFull.hidden = on;
  if (docsFooter) docsFooter.hidden = !on;
  if (toggle) {
    const title = toggle.querySelector(".list-title");
    const sub = toggle.querySelector(".list-sub");
    if (title && sub) {
      title.textContent = LANDING_ROW_SIMPLE_MODE_TITLE;
      sub.textContent = simpleModeToggleSub(on);
    } else {
      toggle.textContent = on ? "Show intro again" : "Hide extra help";
    }
    toggle.setAttribute("aria-pressed", on ? "true" : "false");
  }
}

toggle?.addEventListener("click", () => {
  const on = !document.body.classList.contains("landing-focus-mode");
  localStorage.setItem(LANDING_FOCUS_KEY, on ? "1" : "0");
  applyFocus();
});

window.addEventListener("hc-device-hub-changed", () => {
  if (localStorage.getItem(LANDING_FOCUS_KEY) === null && hasDeviceData()) {
    localStorage.setItem(LANDING_FOCUS_KEY, "1");
  }
  applyFocus();
});

applyFocus();
