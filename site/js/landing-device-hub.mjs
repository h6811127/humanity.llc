/**
 * Landing device hub: saved rows with actions, pins, notice row, backup import.
 */
import { applyDeviceHubSearch } from "./device-hub-search.mjs";
import { initHubBackupImport } from "./device-hub-import.mjs";
import { activateWalletEntry, createdUrlForEntry, getTabSession } from "./device-keys.mjs";
import { loadPins, pinHaystack } from "./device-pins.mjs";
import {
  loadWallet,
  saveWallet,
  walletEntrySubtitle,
} from "./device-wallet.mjs";
import { tabNoticeCount } from "./device-counts.mjs";

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
const noticeGroup = document.getElementById("device-hub-notice-group");
const searchInput = document.getElementById("device-hub-search");
const searchStatus = document.getElementById("device-hub-search-status");
const deviceHub = document.getElementById("device-hub");
const emptyHint = document.getElementById("device-hub-empty-hint");

function scanUrlForEntry(entry) {
  if (entry.scan_url) return entry.scan_url;
  const base = `${location.origin}/c/${encodeURIComponent(entry.profile_id)}`;
  return entry.qr_id ? `${base}?q=${encodeURIComponent(entry.qr_id)}` : base;
}

function renderNoticeRow() {
  if (!noticeGroup) return;
  const show = tabNoticeCount() > 0;
  noticeGroup.hidden = !show;
  if (!show) return;

  const session = getTabSession();
  const label = session?.handle
    ? `@${session.handle}`
    : session?.profile_id?.slice(0, 12) || "This tab";
  const url = new URL("/created/", location.origin);
  if (session?.profile_id) url.searchParams.set("profile_id", session.profile_id);
  if (session?.qr_id) url.searchParams.set("qr_id", session.qr_id);

  noticeGroup.innerHTML = `
    <ul class="list list-compact">
      <li class="list-row list-action device-hub-notice-row" data-hub-searchable="notice save tab keys">
        <a href="${escapeHtml(url.href)}">
          <span class="list-icon list-icon-tone-red" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
          </span>
          <span class="list-content">
            <span class="list-title">Keys in this tab · Save on this device</span>
            <span class="list-sub">${escapeHtml(label)} — tap to open /created/</span>
          </span>
          <span class="list-chevron" aria-hidden="true">›</span>
        </a>
      </li>
    </ul>`;
}

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
    li.className = "hub-card-item";
    li.dataset.hubSearchable = walletHaystack(entry);
    const sub = walletEntrySubtitle(entry);
    const scan = scanUrlForEntry(entry);
    li.innerHTML = `
      <div class="hub-card-head">
        <span class="list-icon list-icon-tone-trust" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </span>
        <span class="list-content">
          <span class="list-title">${escapeHtml(entry.label)}</span>
          <span class="list-sub">${escapeHtml(sub)}</span>
        </span>
      </div>
      <div class="hub-card-actions">
        <div class="hub-card-actions-primary">
          <button type="button" class="hub-card-action hub-use-keys" data-id="${escapeHtml(entry.id)}">Use keys</button>
          <a class="hub-card-action hub-open-scan" href="${escapeHtml(scan)}" target="_blank" rel="noopener noreferrer">Open scan</a>
        </div>
        <details class="hub-card-menu">
          <summary class="hub-card-menu-btn" aria-label="More">⋯</summary>
          <div class="hub-card-menu-panel">
            <button type="button" class="hub-card-menu-item hub-relabel" data-id="${escapeHtml(entry.id)}">Relabel</button>
            <button type="button" class="hub-card-menu-item hub-remove" data-id="${escapeHtml(entry.id)}">Remove from device</button>
          </div>
        </details>
      </div>`;
    savedList.appendChild(li);
  }

  savedList.querySelectorAll(".hub-use-keys").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const entry = loadWallet().find((e) => e.id === id);
      if (!entry) return;
      activateWalletEntry(entry);
      location.href = createdUrlForEntry(entry);
    });
  });

  savedList.querySelectorAll(".hub-relabel").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const entry = loadWallet().find((e) => e.id === id);
      if (!entry) return;
      const next = window.prompt("Label for this card", entry.label);
      if (next == null || !next.trim()) return;
      const entries = loadWallet();
      const idx = entries.findIndex((e) => e.id === id);
      if (idx < 0) return;
      entries[idx] = { ...entries[idx], label: next.trim() };
      saveWallet(entries);
      renderSavedRows();
      notifyHubChanged();
    });
  });

  savedList.querySelectorAll(".hub-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (!window.confirm("Remove this card from this device? Keys stay in any other tab until you close it.")) {
        return;
      }
      saveWallet(loadWallet().filter((e) => e.id !== id));
      renderSavedRows();
      renderNoticeRow();
      notifyHubChanged();
    });
  });
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
  const hasData =
    loadWallet().length > 0 || loadPins().length > 0 || tabNoticeCount() > 0;
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

export function focusHubSearch() {
  searchInput?.focus({ preventScroll: true });
  deviceHub?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

window.addEventListener("hc-focus-hub-search", () => focusHubSearch());

initHubBackupImport(
  document.getElementById("hub-import-form"),
  document.getElementById("hub-import-status")
);

renderNoticeRow();
renderSavedRows();
renderPinRows();
applySearchFilter();
refreshEmptyHint();
notifyHubChanged();

if (searchInput) {
  searchInput.addEventListener("input", applySearchFilter);
}

window.addEventListener("storage", (e) => {
  if (e.key === "hc_wallet" || e.key === "hc_device_pins" || e.key === "hc_created") {
    renderNoticeRow();
    renderSavedRows();
    renderPinRows();
    applySearchFilter();
    notifyHubChanged();
  }
});
