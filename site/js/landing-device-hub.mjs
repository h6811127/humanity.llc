/**
 * Landing device hub: Phase 1–2 local search + wallet/pin injection.
 */
import { applyDeviceHubSearch } from "./device-hub-search.mjs";
import { loadPins, pinHaystack } from "./device-pins.mjs";
import { walletEntrySubtitle } from "./device-wallet.mjs";

const WALLET_KEY = "hc_wallet";

function loadWallet() {
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function walletHaystack(entry) {
  return [entry.label, entry.handle, entry.manifesto_line, entry.profile_id]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const savedGroup = document.getElementById("device-hub-saved-group");
const savedList = document.getElementById("device-hub-wallet-list");
const pinsGroup = document.getElementById("device-hub-pins-group");
const pinsList = document.getElementById("device-hub-pins-list");
const searchInput = document.getElementById("device-hub-search");
const searchRoot = document.getElementById("device-hub-search-root");
const searchOpen = document.getElementById("device-hub-search-open");
const searchDrawer = document.getElementById("device-hub-search-drawer");
const searchClose = document.getElementById("device-hub-search-close");
const searchStatus = document.getElementById("device-hub-search-status");
const deviceHub = document.getElementById("device-hub");
const emptyHint = document.getElementById("device-hub-empty-hint");

function renderSavedRows() {
  const entries = loadWallet();
  if (!savedList || !savedGroup) return;

  savedList.innerHTML = "";
  if (entries.length === 0) {
    savedGroup.hidden = true;
    return;
  }

  savedGroup.hidden = false;
  for (const entry of entries) {
    const li = document.createElement("li");
    li.className = "list-row list-action";
    li.dataset.hubSearchable = walletHaystack(entry);
    const sub = walletEntrySubtitle(entry);
    li.innerHTML = `
      <a href="/wallet/">
        <span class="list-icon list-icon-tone-trust" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </span>
        <span class="list-content">
          <span class="list-title">${escapeHtml(entry.label)}</span>
          <span class="list-sub">${escapeHtml(sub)}</span>
        </span>
        <span class="list-chevron" aria-hidden="true">›</span>
      </a>`;
    savedList.appendChild(li);
  }
}

function renderPinRows() {
  const pins = loadPins();
  if (!pinsList || !pinsGroup) return;

  pinsList.innerHTML = "";
  if (pins.length === 0) {
    pinsGroup.hidden = true;
    return;
  }

  pinsGroup.hidden = false;
  for (const pin of pins) {
    const li = document.createElement("li");
    li.className = "list-row list-action device-pin-row";
    li.dataset.hubSearchable = pinHaystack(pin);
    const sub = pin.qr_id
      ? `${pin.profile_id.slice(0, 10)}… · opens scan`
      : `${pin.profile_id.slice(0, 14)}… · card scan`;
    li.innerHTML = `
      <a href="${escapeHtml(pin.scan_url)}" target="_blank" rel="noopener noreferrer">
        <span class="list-icon list-icon-tone-gold" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/></svg>
        </span>
        <span class="list-content">
          <span class="list-title">${escapeHtml(pin.label)}</span>
          <span class="list-sub">${escapeHtml(sub)}</span>
        </span>
        <span class="list-chevron list-chevron-external" aria-hidden="true">↗</span>
      </a>`;
    pinsList.appendChild(li);
  }
}

function refreshEmptyHint() {
  if (!emptyHint) return;
  const hasData = loadWallet().length > 0 || loadPins().length > 0;
  emptyHint.hidden = hasData;
}

function notifyHubChanged() {
  window.dispatchEvent(new Event("hc-device-hub-changed"));
}

function applySearchFilter() {
  const q = searchInput?.value ?? "";
  const { matchCount } = applyDeviceHubSearch(deviceHub, q);
  refreshEmptyHint();

  if (searchStatus) {
    const trimmed = q.trim();
    if (!trimmed) {
      searchStatus.hidden = true;
      searchStatus.textContent = "";
    } else {
      searchStatus.hidden = false;
      searchStatus.textContent =
        matchCount === 0
          ? "No matches on this device."
          : `${matchCount} match${matchCount === 1 ? "" : "es"} on this device`;
    }
  }
}

function setSearchExpanded(open) {
  if (!searchRoot || !searchOpen || !searchDrawer) return;
  searchRoot.classList.toggle("is-expanded", open);
  searchOpen.hidden = open;
  searchOpen.setAttribute("aria-expanded", open ? "true" : "false");
  searchDrawer.hidden = !open;
  if (open) {
    searchInput?.focus();
    deviceHub?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else if (searchInput) {
    searchInput.value = "";
    applySearchFilter();
  }
}

if (searchOpen) {
  searchOpen.addEventListener("click", () => setSearchExpanded(true));
}

if (searchClose) {
  searchClose.addEventListener("click", () => setSearchExpanded(false));
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && searchRoot?.classList.contains("is-expanded")) {
    setSearchExpanded(false);
  }
});

document.addEventListener("click", (e) => {
  if (!searchRoot?.classList.contains("is-expanded")) return;
  const target = e.target;
  if (target instanceof Node && searchRoot.contains(target)) return;
  setSearchExpanded(false);
});

renderSavedRows();
renderPinRows();
applySearchFilter();
refreshEmptyHint();
notifyHubChanged();

if (searchInput) {
  searchInput.addEventListener("input", applySearchFilter);
}

window.addEventListener("storage", (e) => {
  if (e.key === WALLET_KEY || e.key === "hc_device_pins") {
    renderSavedRows();
    renderPinRows();
    applySearchFilter();
    notifyHubChanged();
  }
});
