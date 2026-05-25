/**
 * Task dashboard primary actions on /created/.
 */

import { isWalletSaved } from "./device-wallet.mjs";

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

/** @param {string | null | undefined} profileId @param {string} actionId */
function persistDoneAction(profileId, actionId) {
  if (!profileId) return;
  try {
    const all = JSON.parse(sessionStorage.getItem(DONE_STORAGE_KEY) || "{}");
    const set = new Set(Array.isArray(all[profileId]) ? all[profileId] : []);
    set.add(actionId);
    all[profileId] = [...set];
    sessionStorage.setItem(DONE_STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

/**
 * @param {{
 *   selectTab: (id: string) => void,
 *   runSave?: () => boolean,
 *   getScanUrl?: () => string | null,
 *   getProfileId?: () => string | null,
 * }} opts
 */
export function initCreatedDashboard({ selectTab, runSave, getScanUrl, getProfileId }) {
  const keysStrip = document.getElementById("created-keys-strip");
  const qrSection = document.getElementById("created-qr-section");
  const downloadBtn = document.getElementById("download-qr");
  const openScan = document.getElementById("open-scan");
  const manifestoPanel = document.getElementById("manifesto-update-panel");
  const revokeDetails = document.getElementById("revoke-details");
  const printTip = document.querySelector("#created-qr-section .created-print-tip");

  function profileId() {
    return getProfileId?.() ?? null;
  }

  function markDone(actionId) {
    persistDoneAction(profileId(), actionId);
    syncDoneStates();
  }

  function syncDoneStates() {
    const pid = profileId();
    const done = loadDoneActions(pid);
    if (pid && isWalletSaved(pid)) done.add("save-keys");
    document.querySelectorAll("[data-created-action]").forEach((btn) => {
      const id = btn.getAttribute("data-created-action");
      btn.classList.toggle("is-done", !!(id && done.has(id)));
    });
  }

  const actions = {
    "save-keys": () => {
      selectTab("now");
      if (keysStrip) keysStrip.hidden = false;
      keysStrip?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      if (runSave?.() === true) {
        markDone("save-keys");
      }
    },
    "download-qr": () => {
      selectTab("now");
      qrSection?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      if (downloadBtn && !downloadBtn.disabled) {
        downloadBtn.click();
        markDone("download-qr");
      }
    },
    "print-qr": () => {
      selectTab("now");
      qrSection?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      printTip?.setAttribute("open", "");
      markDone("print-qr");
    },
    "test-scan": () => {
      selectTab("now");
      const scanUrl = getScanUrl?.() || openScan?.href;
      if (scanUrl && scanUrl !== "#" && scanUrl.startsWith("http")) {
        window.open(scanUrl, "_blank", "noopener,noreferrer");
        markDone("test-scan");
        return;
      }
      qrSection?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    "update-status": () => {
      selectTab("manage");
      manifestoPanel?.removeAttribute("hidden");
      manifestoPanel?.setAttribute("open", "");
      manifestoPanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      markDone("update-status");
    },
    "revoke-qr": () => {
      selectTab("manage");
      revokeDetails?.setAttribute("open", "");
      revokeDetails?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
  };

  document.querySelectorAll("[data-created-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-created-action");
      if (id && actions[id]) actions[id]();
    });
  });

  window.addEventListener("hc-device-hub-changed", syncDoneStates);

  syncDoneStates();
}
