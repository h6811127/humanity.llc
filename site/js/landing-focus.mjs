/**
 * Landing focus mode — hide tutorial sections, show device hub + docs + contact.
 */
import { loadWallet } from "./device-wallet.mjs";
import { loadPins } from "./device-pins.mjs";

const FOCUS_KEY = "hc_landing_focus";

const toggle = document.getElementById("landing-focus-toggle");
const docsFull = document.getElementById("landing-docs-full");
const docsFooter = document.getElementById("landing-docs-footer");

function hasDeviceData() {
  return loadWallet().length > 0 || loadPins().length > 0;
}

function isFocusMode() {
  const stored = localStorage.getItem(FOCUS_KEY);
  if (stored === "0") return false;
  if (stored === "1") return true;
  return hasDeviceData();
}

function applyFocus() {
  const on = isFocusMode();
  document.body.classList.toggle("landing-focus-mode", on);
  if (docsFull) docsFull.hidden = on;
  if (docsFooter) docsFooter.hidden = !on;
  if (toggle) {
    toggle.textContent = on ? "Show intro again" : "Hide intro · focus on this device";
    toggle.setAttribute("aria-pressed", on ? "true" : "false");
  }
  if (on) {
    window.dispatchEvent(new CustomEvent("hc-landing-focus-on"));
  }
}

toggle?.addEventListener("click", () => {
  const on = !document.body.classList.contains("landing-focus-mode");
  localStorage.setItem(FOCUS_KEY, on ? "1" : "0");
  applyFocus();
});

window.addEventListener("hc-device-hub-changed", () => {
  if (localStorage.getItem(FOCUS_KEY) === null && hasDeviceData()) {
    localStorage.setItem(FOCUS_KEY, "1");
  }
  applyFocus();
});

applyFocus();
