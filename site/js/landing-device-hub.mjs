/**
 * Landing device hub: inject saved wallet rows + filter hub via local search only.
 */
const STORAGE_KEY = "hc_wallet";

function loadWallet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

function haystack(entry) {
  return [entry.label, entry.handle, entry.manifesto_line, entry.profile_id]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const savedGroup = document.getElementById("device-hub-saved-group");
const savedList = document.getElementById("device-hub-wallet-list");
const searchInput = document.getElementById("device-hub-search");

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
    li.dataset.hubSearchable = haystack(entry);
    const sub = entry.manifesto_line || entry.handle || "Saved on this device";
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

function applySearchFilter() {
  const q = (searchInput?.value || "").trim().toLowerCase();
  const hub = document.getElementById("device-hub");
  if (!hub) return;

  hub.querySelectorAll("[data-hub-searchable]").forEach((el) => {
    const text = (el.dataset.hubSearchable || "").toLowerCase();
    const match = !q || text.includes(q);
    el.hidden = !match;
  });

  if (savedGroup) {
    const anySavedVisible =
      q === "" ||
      [...(savedList?.querySelectorAll("[data-hub-searchable]") || [])].some((el) => !el.hidden);
    savedGroup.hidden = loadWallet().length === 0 || !anySavedVisible;
  }
}

renderSavedRows();
applySearchFilter();

if (searchInput) {
  searchInput.addEventListener("input", applySearchFilter);
}
