/**
 * Hub — open a pasted scan link in this app (PWA camera handoff).
 */
import {
  HUB_OPEN_SCAN_HINT,
  HUB_OPEN_SCAN_SUMMARY,
} from "./device-ownership-copy-core.mjs";
import { parseHumanityScanUrl } from "./device-hub-open-scan-core.mjs";
import { patchWalletScanUrlFromOfficialLink } from "./device-wallet.mjs";

const HUB_OPEN_SCAN_HINT_ID = "hub-open-scan-form-hint";
const HUB_OPEN_SCAN_SUMMARY_CLASS = "hub-open-scan-list-sub";

/**
 * @param {HTMLFormElement | null} form
 */
export function applyHubOpenScanCopy(form) {
  if (!form) return;
  const hintEl = document.getElementById(HUB_OPEN_SCAN_HINT_ID);
  if (hintEl) hintEl.textContent = HUB_OPEN_SCAN_HINT;
  form.closest(".device-hub-import")?.querySelectorAll(`.${HUB_OPEN_SCAN_SUMMARY_CLASS}`)?.forEach((el) => {
    el.textContent = HUB_OPEN_SCAN_SUMMARY;
  });
}

/**
 * @param {HTMLFormElement | null} form
 * @param {HTMLElement | null} statusEl
 * @param {{ navigate?: (url: string) => void }} [opts]
 */
export function initHubOpenScanLink(form, statusEl, opts = {}) {
  if (!form) return;
  applyHubOpenScanCopy(form);
  const navigate =
    opts.navigate ??
    ((url) => {
      window.location.assign(url);
    });

  function setStatus(msg, isError = false) {
    if (!statusEl) return;
    statusEl.hidden = !msg;
    statusEl.textContent = msg;
    statusEl.className = isError ? "form-status error" : "form-status";
  }

  form.querySelector("[data-hub-open-scan-paste]")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const input = form.querySelector("[name=scan_url], #hub-open-scan-url");
    if (!input || !navigator.clipboard?.readText) {
      setStatus("Paste your scan link manually.", true);
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      input.value = text;
      setStatus("Pasted from clipboard.");
    } catch {
      setStatus("Could not read clipboard. Paste the link manually.", true);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.querySelector("[name=scan_url], #hub-open-scan-url");
    const raw = String(input?.value ?? "").trim();
    const scanUrl = parseHumanityScanUrl(raw, location.origin);
    if (!scanUrl) {
      setStatus("Paste a humanity.llc scan link (https://humanity.llc/c/…).", true);
      return;
    }
    setStatus("Opening scan…");
    patchWalletScanUrlFromOfficialLink(scanUrl);
    window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
    navigate(scanUrl);
  });
}
