/**
 * /wallet/  -  shared device hub + tab save, pins, context banners.
 */
import { logDeviceActivity } from "./device-activity.mjs";
import { isAutoSaveEnabled, initAutoSaveToggle } from "./device-auto-save.mjs";
import { initDeviceHub, refreshDeviceHub } from "./device-hub-ui.mjs";
import { activateWalletEntry, createdUrlForEntry, getTabSession } from "./device-keys.mjs";
import { createPinEntry, loadPins, savePins } from "./device-pins.mjs";
import {
  defaultWalletLabel,
  loadWallet,
  saveSessionToWallet,
} from "./device-wallet.mjs";

const saveForm = document.getElementById("wallet-save-form");
const saveGroup = document.getElementById("device-hub-save-tab-group");
const saveStatus = document.getElementById("wallet-save-status");
const saveLabel = document.getElementById("wallet-save-label");
const activeBanner = document.getElementById("wallet-active-banner");
const activeText = document.getElementById("wallet-active-text");
const activeLink = document.getElementById("wallet-active-link");
const tabHint = document.getElementById("wallet-tab-hint");
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
  autoSaveLine.textContent = "Auto-save is on  -  new cards are written to this device after create.";
}

function refreshHelpVisibility() {
  if (!helpDetails) return;
  const hasWallet = loadWallet().length > 0;
  helpDetails.hidden = hasWallet;
}

function updateContextBanners() {
  const session = getTabSession();
  const hasKeys = !!(session?.profile_id && session?.owner_private_key_b58);

  if (tabHint) tabHint.hidden = hasKeys;

  if (!activeBanner || !activeText) return;
  if (!hasKeys) {
    activeBanner.hidden = true;
    return;
  }

  const label =
    session.wallet_label ||
    (session.handle ? `@${session.handle}` : session.profile_id.slice(0, 12));
  activeBanner.hidden = false;
  activeText.textContent = `Managing in this tab: ${label}`;
  if (activeLink) {
    const url = new URL("/created/", location.origin);
    url.searchParams.set("profile_id", session.profile_id);
    if (session.qr_id) url.searchParams.set("qr_id", session.qr_id);
    activeLink.href = url.href;
  }
}

function initTabSave() {
  const session = getTabSession();
  if (!saveForm || !saveGroup) return;

  if (!session?.owner_private_key_b58 || !session?.profile_id) {
    saveGroup.hidden = true;
    return;
  }

  saveGroup.hidden = false;
  if (saveLabel && !saveLabel.value.trim()) {
    saveLabel.value = defaultWalletLabel(session);
  }

  saveForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const current = getTabSession();
    if (!current?.profile_id || !current?.owner_private_key_b58) {
      setStatus(saveStatus, "No signing keys in this tab.", true);
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
  noticeMode: "created-url",
  savedLabel: "With signing keys",
  showShortcuts: true,
  showImport: true,
  showActivity: true,
  showEmptyHint: true,
  showLiveControlInbox: true,
});

initAutoSaveToggle();
initTabSave();
refreshAutoSaveLine();
updateContextBanners();
refreshHelpVisibility();

window.addEventListener("hc-device-hub-changed", () => {
  refreshHelpVisibility();
  updateContextBanners();
  refreshAutoSaveLine();
});

window.addEventListener("storage", (e) => {
  if (e.key === "hc_created") updateContextBanners();
});

window.addEventListener("hc-auto-save-changed", refreshAutoSaveLine);
