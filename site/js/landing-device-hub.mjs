/**
 * Landing device hub (Phase 1): inject saved wallet rows + local search filter.
 * Search UI: bottom-left FAB expands to full bar + disclosures (see DEVICE_HUB_AND_LOCAL_SEARCH.md).
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
const searchRoot = document.getElementById("device-hub-search-root");
const searchOpen = document.getElementById("device-hub-search-open");
const searchDrawer = document.getElementById("device-hub-search-drawer");
const searchClose = document.getElementById("device-hub-search-close");
const searchStatus = document.getElementById("device-hub-search-status");
const deviceHub = document.getElementById("device-hub");

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

function countVisibleMatches() {
  const hub = document.getElementById("device-hub");
  if (!hub) return 0;
  return [...hub.querySelectorAll("[data-hub-searchable]")].filter((el) => !el.hidden).length;
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

  if (searchStatus) {
    if (!q) {
      searchStatus.hidden = true;
      searchStatus.textContent = "";
    } else {
      const n = countVisibleMatches();
      searchStatus.hidden = false;
      searchStatus.textContent =
        n === 0
          ? "No matches on this device."
          : `${n} match${n === 1 ? "" : "es"} in On this device`;
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
applySearchFilter();

if (searchInput) {
  searchInput.addEventListener("input", applySearchFilter);
}
