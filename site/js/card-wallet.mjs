/**
 * Device-local saved cards (keys stay in this browser only — never uploaded).
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

function saveWallet(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

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

const listEl = document.getElementById("wallet-list");
const emptyEl = document.getElementById("wallet-empty");
const saveForm = document.getElementById("wallet-save-form");
const saveStatus = document.getElementById("wallet-save-status");
const saveLabel = document.getElementById("wallet-save-label");

function setSaveStatus(msg, isError = false) {
  if (!saveStatus) return;
  saveStatus.hidden = !msg;
  saveStatus.textContent = msg;
  saveStatus.className = isError ? "form-status error" : "form-status";
}

function entryFromSession(session, label) {
  return {
    id: `${session.profile_id}_${Date.now()}`,
    label: label.trim() || `@${session.handle || session.profile_id.slice(0, 8)}`,
    saved_at: new Date().toISOString(),
    profile_id: session.profile_id,
    qr_id: session.qr_id,
    handle: session.handle,
    manifesto_line: session.manifesto_line,
    scan_url: session.scan_url,
    owner_public_key_b58: session.owner_public_key_b58,
    owner_private_key_b58: session.owner_private_key_b58,
    recovery_public_key_b58: session.recovery_public_key_b58,
    recovery_private_key_b58: session.recovery_private_key_b58,
    qr_expires_at: session.qr_expires_at,
    status: session.status,
    verification: session.verification,
    issued_vouches: session.issued_vouches,
  };
}

function renderList() {
  const entries = loadWallet();
  if (!listEl) return;
  listEl.innerHTML = "";

  if (entries.length === 0) {
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;

  for (const entry of entries) {
    const li = document.createElement("li");
    li.className = "list-row wallet-row";
    li.innerHTML = `
      <span class="list-icon list-icon-tone-trust" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </span>
      <span class="list-content">
        <span class="list-title">${escapeHtml(entry.label)}</span>
        <span class="list-sub mono">${escapeHtml(entry.profile_id)}</span>
      </span>
      <div class="wallet-row-actions">
        <button type="button" class="btn-secondary wallet-activate" data-id="${escapeHtml(entry.id)}">Use keys</button>
        <button type="button" class="btn-secondary wallet-remove" data-id="${escapeHtml(entry.id)}">Remove</button>
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
    });
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const session = loadActiveSession();
if (saveForm && session?.owner_private_key_b58 && session?.profile_id) {
  saveForm.hidden = false;
  if (saveLabel) {
    saveLabel.placeholder = session.handle ? `@${session.handle}` : "Personal card";
  }
  saveForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const label = saveLabel?.value?.trim() || "";
    const entries = loadWallet();
    const duplicate = entries.some((x) => x.profile_id === session.profile_id);
    if (duplicate) {
      setSaveStatus("This card is already saved. Remove the old entry first.", true);
      return;
    }
    entries.unshift(entryFromSession(session, label));
    saveWallet(entries);
    setSaveStatus("Saved on this device only.");
    renderList();
  });
} else if (saveForm) {
  saveForm.hidden = true;
}

renderList();
