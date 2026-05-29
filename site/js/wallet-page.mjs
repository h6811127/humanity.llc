/**
 * /wallet/ - dedicated saved-cards page (not the hub bottom sheet).
 */
import { logDeviceActivity } from "./device-activity.mjs";
import { isAutoSaveEnabled, initAutoSaveToggle, isAutoSaveFailed } from "./device-auto-save.mjs";
import { initDeviceHub, refreshDeviceHub } from "./device-hub-ui.mjs";
import { getTabSession, openCardNowPage } from "./device-keys.mjs";
import { shouldShowSessionOnlyOwnershipWarning } from "./device-ownership-notice-core.mjs";
import { refreshWalletContextFromChrome, walletEntryForSession } from "./wallet-page-chrome.mjs";
import { createPinEntry, loadPins, savePins } from "./device-pins.mjs";
import { mountKeysCustody } from "./device-keys-custody.mjs";
import "./device-help-fab.mjs";
import {
  defaultWalletLabel,
  getWalletCount,
  isWalletSaved,
  loadWallet,
  saveSessionToWallet,
} from "./device-wallet.mjs";

const saveForm = document.getElementById("wallet-save-form");
const saveGroup = document.getElementById("device-hub-save-tab-group");
const saveStatus = document.getElementById("wallet-save-status");
const saveLabel = document.getElementById("wallet-save-label");
const activeLink = document.getElementById("wallet-active-link");
const autoSaveLine = document.getElementById("wallet-auto-save-line");
const helpDetails = document.getElementById("wallet-help-details");
const pinForm = document.getElementById("pin-save-form");
const pinLabel = document.getElementById("pin-save-label");
const pinUrl = document.getElementById("pin-save-url");
const pinStatus = document.getElementById("pin-save-status");

function setStatus(el, msg, isError = false) {
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg;
  el.className = isError ? "form-status error" : "form-status";
}

function refreshAutoSaveLine() {
  if (!autoSaveLine) return;
  if (!isAutoSaveEnabled()) {
    autoSaveLine.hidden = true;
    return;
  }
  autoSaveLine.hidden = false;
  autoSaveLine.textContent =
    "Auto-save is on. New cards are written to this device after create.";
}

function refreshHelpVisibility() {
  if (!helpDetails) return;
  helpDetails.hidden = getWalletCount() > 0;
}

function bindWalletActiveLink() {
  if (!activeLink || activeLink.dataset.bound === "1") return;
  activeLink.dataset.bound = "1";
  activeLink.addEventListener("click", (e) => {
    e.preventDefault();
    const entry = walletEntryForSession(getTabSession());
    if (entry) openCardNowPage(entry);
  });
}

function updateContextBanners() {
  refreshWalletContextFromChrome();
}

function refreshTabSaveGroup() {
  const session = getTabSession();
  if (!saveForm || !saveGroup) return;

  if (!session?.owner_private_key_b58 || !session?.profile_id) {
    saveGroup.hidden = true;
    return;
  }

  const show = shouldShowSessionOnlyOwnershipWarning({
    hasTabControl: true,
    savedOnDevice: isWalletSaved(session.profile_id),
    autoSaveEnabled: isAutoSaveEnabled(),
    autoSaveFailed: isAutoSaveFailed(session.profile_id),
  });
  saveGroup.hidden = !show;
  if (!show) return;

  if (saveLabel && !saveLabel.value.trim()) {
    saveLabel.value = defaultWalletLabel(session);
  }
}

function initTabSave() {
  refreshTabSaveGroup();

  saveForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const current = getTabSession();
    if (!current?.profile_id || !current?.owner_private_key_b58) {
      setStatus(saveStatus, "Ownership not loaded in this tab.", true);
      return;
    }
    const label = saveLabel?.value?.trim() || "";
    const result = saveSessionToWallet(current, label);
    if ("error" in result) {
      setStatus(saveStatus, result.error, true);
      return;
    }
    setStatus(
      saveStatus,
      result.updated
        ? "Label updated."
        : result.already
          ? "Already saved on this device."
          : "Saved on this device."
    );
    if (!result.already && !result.updated) {
      logDeviceActivity("saved", label || defaultWalletLabel(current), {
        profile_id: current.profile_id,
        qr_id: current.qr_id ?? null,
      });
    }
    refreshDeviceHub();
    refreshHelpVisibility();
    updateContextBanners();
  });
}

if (pinForm) {
  pinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const created = createPinEntry(pinLabel?.value ?? "", pinUrl?.value ?? "", loadPins());
    if ("error" in created) {
      setStatus(pinStatus, created.error, true);
      return;
    }
    const pins = loadPins();
    pins.unshift(created);
    savePins(pins);
    logDeviceActivity("pin_added", created.label);
    if (pinUrl) pinUrl.value = "";
    if (pinLabel) pinLabel.value = "";
    setStatus(pinStatus, "Pinned on this device only.");
    refreshDeviceHub();
  });
}

initDeviceHub({
  hubRoot: "#wallet-page",
  noticeMode: "created-url",
  savedLabel: "Cards",
  showShortcuts: false,
  showImport: true,
  showActivity: true,
  showEmptyHint: true,
  showLiveControlInbox: true,
});

mountKeysCustody("#device-keys-custody-wallet", "wallet", {
  importHref: "#hub-import-form",
});

initAutoSaveToggle();
initTabSave();
bindWalletActiveLink();
refreshAutoSaveLine();
updateContextBanners();
refreshHelpVisibility();

window.addEventListener("hc-device-hub-changed", () => {
  refreshHelpVisibility();
  updateContextBanners();
  refreshAutoSaveLine();
  refreshTabSaveGroup();
});

window.addEventListener("storage", (e) => {
  // Phase 2: device-chrome-refresh owns cross-tab refresh scheduling.
  if (e.key === "hc_created") updateContextBanners();
});

// Phase 2: device-chrome-refresh owns cross-tab refresh scheduling.

window.addEventListener("hc-auto-save-changed", () => {
  refreshAutoSaveLine();
  refreshTabSaveGroup();
});
