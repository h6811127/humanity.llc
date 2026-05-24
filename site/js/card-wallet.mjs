/**
 * Device-local saved cards (keys) + Phase 2 pinned public scan links.
 */
import { applyDeviceHubSearch } from "./device-hub-search.mjs";
import {
  createPinEntry,
  loadPins,
  pinHaystack,
  savePins,
} from "./device-pins.mjs";
import {
  loadWallet,
  saveSessionToWallet,
  saveWallet,
} from "./device-wallet.mjs";

function loadActiveSession() {
  try {
    const raw = sessionStorage.getItem("hc_created");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function activateEntry(entry) {
  sessionStorage.setItem(
    "hc_created",
    JSON.stringify({
      profile_id: entry.profile_id,
      qr_id: entry.qr_id,
      handle: entry.handle,
      manifesto_line: entry.manifesto_line,
      scan_url: entry.scan_url,
      owner_public_key_b58: entry.owner_public_key_b58,
      owner_private_key_b58: entry.owner_private_key_b58,
      recovery_public_key_b58: entry.recovery_public_key_b58,
      recovery_private_key_b58: entry.recovery_private_key_b58,
      qr_expires_at: entry.qr_expires_at,
      status: entry.status || "active",
      verification: entry.verification,
      issued_vouches: entry.issued_vouches || [],
      wallet_label: entry.label,
    })
  );
}

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
    const sub = entry.manifesto_line || entry.handle || entry.profile_id;
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
      activateEntry(entry);
      const url = new URL("/created/", location.origin);
      url.searchParams.set("profile_id", entry.profile_id);
      if (entry.qr_id) url.searchParams.set("qr_id", entry.qr_id);
      location.href = url.href;
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
  const session = loadActiveSession();
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
  activeText.textContent = `Keys active in this tab: ${label}`;
}

if (searchInput) {
  searchInput.addEventListener("input", applyHubSearch);
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
    if (pinUrl) pinUrl.value = "";
    if (pinLabel) pinLabel.value = "";
    setStatus(pinStatus, "Pinned on this device only.");
    renderPinList();
    applyHubSearch();
  });
}

const session = loadActiveSession();
if (saveForm && saveGroup && session?.owner_private_key_b58 && session?.profile_id) {
  saveGroup.hidden = false;
  if (saveLabel) {
    saveLabel.placeholder = session.handle ? `@${session.handle}` : "Personal card";
  }
  saveForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const label = saveLabel?.value?.trim() || "";
    const result = saveSessionToWallet(session, label);
    if ("error" in result) {
      setStatus(saveStatus, result.error, true);
      return;
    }
    setStatus(saveStatus, "Saved on this device only.");
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
