/**
 * Live tab deploy + custody actions on /created/.
 * @see docs/CREATED_TASK_DASHBOARD.md · docs/CREATED_TASKS_TAB_REDESIGN.md
 */

import { isAutoSaveEnabled, isAutoSaveFailed } from "./device-auto-save.mjs";
import { syncUpdateStatusTaskGate } from "./created-first-revoke-gate.mjs?v=2";
import { initCreatedLivePrimaryCta } from "./created-live-primary-cta.mjs";
import { getWalletSigningKeyCount, isWalletSaved } from "./device-wallet.mjs";
import { initCreatedLiveSetupMemory } from "./created-live-setup-memory.mjs";
import { isSetupDone } from "./created-mode.mjs";
import { openStewardScanPreviewFromWindow } from "./pwa-scan-handoff.mjs";
import { stewardScanOpenedFeedback } from "./pwa-scan-handoff-core.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";

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
 *   runSave?: () => boolean | null,
 *   refreshSave?: () => void,
 *   getScanUrl?: () => string | null,
 *   getProfileId?: () => string | null,
 *   getSession?: () => Record<string, unknown> | null,
 *   hasSigningKeys?: () => boolean,
 * }} opts
 */
export function initCreatedDashboard({
  selectTab,
  runSave,
  refreshSave,
  getScanUrl,
  getProfileId,
  getSession,
  hasSigningKeys,
}) {
  const keysStrip = document.getElementById("created-keys-strip");
  const qrSection = document.getElementById("created-qr-section");
  const liveObjectCard = document.getElementById("created-live-object-card");
  const openScan = document.getElementById("open-scan");
  const downloadQrBtn = document.getElementById("download-qr");
  const scannersSeeSection = document.getElementById("created-live-scanners-see");
  const custodyDisclosure = document.getElementById("created-custody-disclosure");
  const custodySummarySub = document.getElementById("created-custody-summary-sub");
  const revokeDetails = document.getElementById("revoke-details");
  const feedbackEl = document.getElementById("created-dashboard-feedback");
  let feedbackTimer = null;

  function profileId() {
    return getProfileId?.() ?? null;
  }

  function showFeedback(message, isError = false) {
    if (!feedbackEl) return;
    feedbackEl.hidden = false;
    feedbackEl.textContent = message;
    feedbackEl.classList.toggle("created-dashboard-feedback--error", isError);
    if (feedbackTimer) window.clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(() => {
      feedbackEl.hidden = true;
    }, isError ? 8000 : 5000);
  }

  function openDisclosure(id) {
    const el = document.getElementById(id);
    if (!el || el.tagName !== "DETAILS") return;
    el.removeAttribute("hidden");
    el.setAttribute("open", "");
  }

  function openScanUrl() {
    const scanUrl = getScanUrl?.() || openScan?.href;
    if (!scanUrl || scanUrl === "#" || !scanUrl.startsWith("http")) return false;
    const standalone = readStandaloneModeFromWindow(window);
    if (!openStewardScanPreviewFromWindow(scanUrl)) {
      return false;
    }
    showFeedback(stewardScanOpenedFeedback(standalone));
    return true;
  }

  function scrollToQr() {
    selectTab("now");
    openDisclosure("created-deploy-full-qr");
    const target = liveObjectCard || qrSection;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function revealKeysStrip() {
    openDisclosure("created-custody-disclosure");
    if (keysStrip) keysStrip.hidden = false;
    keysStrip?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function markDone(actionId) {
    persistDoneAction(profileId(), actionId);
    syncDoneStates();
    window.dispatchEvent(new Event("hc-created-live-setup-memory-sync"));
  }

  function syncCustodySummary(saved) {
    if (!custodySummarySub) return;
    const pid = profileId();
    const quietAutoSave =
      !saved && pid && isAutoSaveEnabled() && !isAutoSaveFailed(pid);
    custodySummarySub.textContent = saved
      ? "Saved on this device"
      : quietAutoSave
        ? "Saving on this device…"
        : "Save to update and revoke later";
    if (custodyDisclosure) {
      custodyDisclosure.classList.toggle("created-custody-disclosure--saved", saved);
    }
  }

  function syncDoneStates() {
    const pid = profileId();
    const done = loadDoneActions(pid);
    const saved = !!(pid && isWalletSaved(pid));
    if (saved) done.add("save-keys");

    document.querySelectorAll("[data-created-action]").forEach((btn) => {
      const id = btn.getAttribute("data-created-action");
      btn.classList.toggle("is-done", !!(id && done.has(id)));
    });

    syncCustodySummary(saved);
    syncUpdateStatusTaskGate(pid, getSession?.());
  }

  /** @type {Record<string, () => void>} */
  const actions = {
    "save-keys": () => {
      selectTab("now");
      revealKeysStrip();

      if (!runSave) {
        showFeedback(
          "Ownership not loaded in this tab. Finish create in this tab, or tap Open controls on My objects.",
          true
        );
        return;
      }

      const saved = runSave();
      refreshSave?.();

      if (saved === null) {
        showFeedback(
          "Ownership not loaded in this tab. Finish create in this tab, or tap Open controls on My objects.",
          true
        );
        return;
      }

      if (saved) {
        markDone("save-keys");
        showFeedback("Saved on this device. You can update and revoke from this browser.");
      } else {
        showFeedback(
          "Could not save yet. Keys must be in this tab. Finish create here or import a backup in Manage.",
          true
        );
      }
    },
    "open-scan": () => {
      selectTab("now");
      if (openScanUrl()) {
        markDone("open-scan");
      } else {
        showFeedback("Scan link is not ready yet.", true);
      }
    },
    "scroll-qr": () => {
      scrollToQr();
    },
    "download-qr": () => {
      selectTab("now");
      if (downloadQrBtn && !downloadQrBtn.disabled) {
        downloadQrBtn.click();
        markDone("download-qr");
        showFeedback("Downloading QR image.");
        return;
      }
      openDisclosure("created-deploy-download");
      scrollToQr();
      markDone("download-qr");
      showFeedback("Open full-size QR below when the image is ready, then download.");
    },
    "print-qr": () => {
      selectTab("now");
      openDisclosure("created-deploy-print");
      markDone("print-qr");
    },
    "test-scan": () => {
      selectTab("now");
      openDisclosure("created-deploy-test");
      if (openScanUrl()) {
        markDone("test-scan");
      } else {
        showFeedback("Scan link is not ready yet.", true);
      }
    },
    "update-status": () => {
      selectTab("now");
      scannersSeeSection?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      markDone("update-status");
    },
    "revoke-qr": () => {
      selectTab("advanced");
      revokeDetails?.setAttribute("open", "");
      revokeDetails?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    "prove-live": () => {
      selectTab("now");
      const panel = document.getElementById("live-control-proof");
      const proveBtn = document.getElementById("live-control-proof-btn");
      panel?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (proveBtn && !proveBtn.disabled) {
        proveBtn.click();
        return;
      }
      showFeedback("Live proof is not ready yet. Keep this tab open with your ownership loaded.");
    },
    "check-network": () => {
      document.getElementById("brand-status-dot-btn")?.click();
      showFeedback("Check system status in the hub.");
    },
  };

  initCreatedLiveSetupMemory({
    getProfileId: profileId,
    getSession,
    setupComplete: () => {
      const pid = profileId();
      return pid ? isSetupDone(pid) : true;
    },
  });

  initCreatedLivePrimaryCta({
    getProfileId: profileId,
    getSession,
    hasSigningKeys: () => hasSigningKeys?.() ?? false,
    resolverReachable: () =>
      document.body.dataset.createdResolverReachable !== "offline",
    scanUrlReady: () => {
      const href = getScanUrl?.() || openScan?.href;
      return !!(href && href.startsWith("http"));
    },
    onMode(mode) {
      if (actions[mode]) actions[mode]();
    },
  });

  document.querySelectorAll("[data-created-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-created-action");
      if (id && actions[id]) actions[id]();
    });
  });

  window.addEventListener("hc-device-hub-changed", () => {
    syncDoneStates();
    window.dispatchEvent(new Event("hc-created-live-cta-sync"));
  });

  syncDoneStates();
  window.dispatchEvent(new Event("hc-created-live-cta-sync"));
  window.dispatchEvent(new Event("hc-created-live-setup-memory-sync"));
}
