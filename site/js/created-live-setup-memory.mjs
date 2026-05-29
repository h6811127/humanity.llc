/**
 * DOM sync for Live tab setup memory chips.
 */

import { isWalletSaved } from "./device-wallet.mjs";
import {
  liveSetupMemoryKicker,
  resolveLiveSetupMemory,
} from "./created-live-setup-memory-core.mjs";

const DONE_STORAGE_KEY = "hc_created_task_done";

/** @param {string | null | undefined} profileId */
function loadDoneActions(profileId) {
  if (!profileId) return new Set();
  try {
    const all = JSON.parse(sessionStorage.getItem(DONE_STORAGE_KEY) || "{}");
    const list = all[profileId];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

/**
 * @param {{ getProfileId?: () => string | null, setupComplete?: () => boolean }} opts
 */
export function initCreatedLiveSetupMemory(opts) {
  const wrap = document.getElementById("created-live-setup-memory-wrap");
  const list = document.getElementById("created-live-setup-memory");
  const kicker = wrap?.querySelector(".created-live-setup-memory-kicker");
  const items = list
    ? [...list.querySelectorAll("[data-memory-step]")]
    : [];

  function sync() {
    if (!wrap || !list) return;
    if (document.body.dataset.createdMode !== "control") {
      wrap.hidden = true;
      return;
    }

    const profileId = opts.getProfileId?.() ?? null;
    const done = loadDoneActions(profileId);
    const walletSaved = !!(profileId && isWalletSaved(profileId));
    const memory = resolveLiveSetupMemory({
      walletSaved,
      printDone: done.has("download-qr") || done.has("print-qr"),
      testScanDone: done.has("test-scan"),
      setupComplete: opts.setupComplete?.() ?? true,
    });

    wrap.hidden = false;
    if (kicker) kicker.textContent = liveSetupMemoryKicker(memory);

    for (const item of items) {
      const step = item.getAttribute("data-memory-step");
      const isDone =
        step === "save" ||
        step === "print" ||
        step === "test" ||
        step === "protect" ||
        step === "live"
          ? memory[step]
          : false;
      item.classList.toggle("is-done", isDone);
      const mark = item.querySelector(".created-live-setup-memory-mark");
      if (mark) mark.textContent = isDone ? "✓" : "";
    }
  }

  window.addEventListener("hc-device-hub-changed", sync);
  window.addEventListener("hc-created-live-cta-sync", sync);
  window.addEventListener("hc-created-live-setup-memory-sync", sync);

  sync();
  return { sync };
}
