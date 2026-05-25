/**
 * Device-local saved cards (keys) + Phase 2 pinned public scan links.
 */
import { logDeviceActivity } from "./device-activity.mjs";
import { applyDeviceHubSearch } from "./device-hub-search.mjs";
import {
  createPinEntry,
  loadPins,
  pinHaystack,
  savePins,
} from "./device-pins.mjs";
import { activateWalletEntry, createdUrlForEntry, getTabSession } from "./device-keys.mjs";
import {
  defaultWalletLabel,
  loadWallet,
  saveSessionToWallet,
  saveWallet,
  walletEntrySubtitle,
} from "./device-wallet.mjs";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function searchHaystack(entry) {
  return [
    entry.label,
    entry.handle,
    entry.manifesto_line,
    entry.profile_id,
    entry.scan_url,
    "saved",
    "keys",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const hubEl = document.getElementById("wallet-device-hub");
const listEl = document.getElementById("wallet-list");
const emptyEl = document.getElementById("wallet-empty");
const cardsGroup = document.getElementById("wallet-cards-group");
const saveForm = document.getElementById("wallet-save-form");
const saveGroup = document.getElementById("wallet-save-group");
const saveStatus = document.getElementById("wallet-save-status");
const saveLabel = document.getElementById("wallet-save-label");
const searchInput = document.getElementById("device-hub-search");
const activeBanner = document.getElementById("wallet-active-banner");
const activeText = document.getElementById("wallet-active-text");
const tabHint = document.getElementById("wallet-tab-hint");

const pinForm = document.getElementById("pin-save-form");
const pinLabel = document.getElementById("pin-save-label");
const pinUrl = document.getElementById("pin-save-url");
const pinStatus = document.getElementById("pin-save-status");
const pinList = document.getElementById("pin-list");
const pinsEmpty = document.getElementById("pins-empty");

let searchQuery = "";

function setStatus(el, msg, isError = false) {
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg;
  el.className = isError ? "form-status error" : "form-status";
}

function renderPinList() {
  const pins = loadPins();
  if (!pinList) return;
  pinList.innerHTML = "";

  if (pins.length === 0) {
    if (pinsEmpty) pinsEmpty.hidden = false;
    return;
  }

  if (pinsEmpty) pinsEmpty.hidden = true;

  for (const pin of pins) {
    const li = document.createElement("li");
    li.className = "wallet-card-item device-pin-item";
    li.dataset.hubSearchable = pinHaystack(pin);
    const sub = pin.qr_id ? "Scan · new tab" : "Card scan · new tab";
    li.innerHTML = `
      <a
        class="wallet-card-main wallet-pin-open"
        href="${escapeHtml(pin.scan_url)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span class="list-icon list-icon-tone-gold" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/></svg>
        </span>
        <span class="list-content">
          <span class="list-title">${escapeHtml(pin.label)}</span>
          <span class="list-sub">${escapeHtml(sub)}</span>
        </span>
        <span class="list-chevron list-chevron-external" aria-hidden="true">↗</span>
      </a>
      <div class="wallet-card-footer">
        <button type="button" class="wallet-card-footer-btn wallet-pin-remove" data-id="${escapeHtml(pin.id)}">Remove</button>
      </div>`;
    pinList.appendChild(li);
  }

  pinList.querySelectorAll(".wallet-pin-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = btn.getAttribute("data-id");
      savePins(loadPins().filter((p) => p.id !== id));
      renderPinList();
      applyHubSearch();
    });
  });
}

function renderList() {
  const entries = loadWallet();
  if (!listEl) return;
  listEl.innerHTML = "";

  if (entries.length === 0) {
    listEl.hidden = true;
    if (emptyEl) {
      emptyEl.hidden = false;
      emptyEl.innerHTML =
        'No saved cards yet. <a href="/create/">Create one</a> or return after create while keys are still in this tab.';
    }
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  listEl.hidden = false;

  for (const entry of entries) {
    const li = document.createElement("li");
    li.className = "wallet-card-item";
    li.dataset.hubSearchable = searchHaystack(entry);
    const sub = walletEntrySubtitle(entry);
    const status = entry.status === "revoked" ? "Revoked" : "Active";
    li.innerHTML = `
      <button type="button" class="wallet-card-main wallet-activate" data-id="${escapeHtml(entry.id)}">
        <span class="list-icon list-icon-tone-trust" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </span>
        <span class="list-content">
          <span class="list-title">${escapeHtml(entry.label)}</span>
          <span class="list-sub">${escapeHtml(sub)}</span>
        </span>
        <span class="wallet-card-meta">${escapeHtml(status)}</span>
        <span class="list-chevron" aria-hidden="true">›</span>
      </button>
      <div class="wallet-card-footer">
        <button type="button" class="wallet-card-footer-btn wallet-remove" data-id="${escapeHtml(entry.id)}">Remove</button>
      </div>`;
    listEl.appendChild(li);
  }

  listEl.querySelectorAll(".wallet-activate").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const entry = loadWallet().find((e) => e.id === id);
      if (!entry) return;
      activateWalletEntry(entry);
      location.href = createdUrlForEntry(entry);
    });
  });

  listEl.querySelectorAll(".wallet-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      saveWallet(loadWallet().filter((e) => e.id !== id));
      renderList();
      updateActiveBanner();
      applyHubSearch();
    });
  });
}

function applyHubSearch() {
  searchQuery = (searchInput?.value ?? "").trim().toLowerCase();
  applyDeviceHubSearch(hubEl, searchQuery);

  const pins = loadPins();
  if (pinsEmpty) {
    if (pins.length === 0) {
      pinsEmpty.hidden = true;
    } else {
      const anyPin = [...(pinList?.querySelectorAll("[data-hub-searchable]") || [])].some(
        (el) => !el.hidden
      );
      pinsEmpty.hidden = anyPin;
      pinsEmpty.textContent = searchQuery ? "No matches" : "No pins yet";
      if (!searchQuery && pins.length > 0) pinsEmpty.hidden = true;
    }
  }

  const entries = loadWallet();
  if (emptyEl && entries.length > 0) {
    const anyCard = [...(listEl?.querySelectorAll("[data-hub-searchable]") || [])].some(
      (el) => !el.hidden
    );
    if (searchQuery && !anyCard) {
      emptyEl.hidden = false;
      emptyEl.textContent = "No saved cards match your search.";
    } else {
      emptyEl.hidden = true;
    }
    listEl.hidden = searchQuery ? !anyCard : false;
  }
}

function updateActiveBanner() {
  const session = getTabSession();
  const hasKeys = !!(session?.profile_id && session?.owner_private_key_b58);

  if (tabHint) {
    tabHint.hidden = hasKeys;
  }

  if (!activeBanner || !activeText) return;
  if (!hasKeys) {
    activeBanner.hidden = true;
    return;
  }
  const label =
    session.wallet_label ||
    (session.handle ? `@${session.handle}` : session.profile_id.slice(0, 12));
  activeBanner.hidden = false;
  activeText.textContent = `Tab Keys Active · ${label}`;
}

if (searchInput) {
  searchInput.addEventListener("input", applyHubSearch);
  searchInput.addEventListener("search", applyHubSearch);
  searchInput.addEventListener("change", applyHubSearch);
}

if (pinForm) {
  pinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const label = pinLabel?.value ?? "";
    const url = pinUrl?.value ?? "";
    const created = createPinEntry(label, url, loadPins());
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
    renderPinList();
    applyHubSearch();
  });
}

function prefillSaveLabel(session) {
  if (!saveLabel || !session) return;
  saveLabel.value = defaultWalletLabel(session);
}

const session = getTabSession();
if (saveForm && saveGroup && session?.owner_private_key_b58 && session?.profile_id) {
  saveGroup.hidden = false;
  prefillSaveLabel(session);
  saveForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const label = saveLabel?.value?.trim() || "";
    const result = saveSessionToWallet(session, label);
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
          : "Saved on this device only."
    );
    if (!result.already && !result.updated) {
      logDeviceActivity("saved", label || defaultWalletLabel(session));
    }
    prefillSaveLabel(session);
    renderList();
    applyHubSearch();
  });
} else if (saveGroup) {
  saveGroup.hidden = true;
}

updateActiveBanner();
renderPinList();
renderList();
applyHubSearch();
