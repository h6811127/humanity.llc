/**
 * Auto-save: write new tab keys to hc_wallet without a manual Save tap.
 * Default on until the user turns it off (`hc_auto_save_device` = "0").
 * @see docs/CARD_WORKSPACE_PHASE0.md
 */
export const AUTO_SAVE_KEY = "hc_auto_save_device";
export const AUTO_SAVE_FAILED_KEY = "hc_auto_save_failed";

/** @param {string} profileId */
export function markAutoSaveFailed(profileId) {
  if (!profileId) return;
  try {
    const raw = sessionStorage.getItem(AUTO_SAVE_FAILED_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[profileId] = Date.now();
    sessionStorage.setItem(AUTO_SAVE_FAILED_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** @param {string} profileId */
export function clearAutoSaveFailed(profileId) {
  if (!profileId) return;
  try {
    const raw = sessionStorage.getItem(AUTO_SAVE_FAILED_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    delete map[profileId];
    if (!Object.keys(map).length) {
      sessionStorage.removeItem(AUTO_SAVE_FAILED_KEY);
    } else {
      sessionStorage.setItem(AUTO_SAVE_FAILED_KEY, JSON.stringify(map));
    }
  } catch {
    /* ignore */
  }
}

/** @param {string | null | undefined} profileId */
export function isAutoSaveFailed(profileId) {
  if (!profileId) return false;
  try {
    const raw = sessionStorage.getItem(AUTO_SAVE_FAILED_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw);
    return Object.prototype.hasOwnProperty.call(map, profileId);
  } catch {
    return false;
  }
}

/**
 * @param {string | null} stored `localStorage` value for {@link AUTO_SAVE_KEY}
 */
export function autoSaveEnabledFromStorage(stored) {
  if (stored === "0") return false;
  return true;
}

export function isAutoSaveEnabled() {
  return autoSaveEnabledFromStorage(localStorage.getItem(AUTO_SAVE_KEY));
}

/** @param {boolean} on */
export function setAutoSaveEnabled(on) {
  localStorage.setItem(AUTO_SAVE_KEY, on ? "1" : "0");
}

export function initAutoSaveToggle() {
  const btn = document.getElementById("device-auto-save-toggle");
  if (!btn) return;

  function sync() {
    const on = isAutoSaveEnabled();
    const title = btn.querySelector(".list-title");
    const sub = btn.querySelector(".list-sub");
    if (title && sub) {
      title.textContent = "Auto-save";
      sub.textContent = on
        ? "On · new cards stay on this device (default)"
        : "Off · save manually after each create";
    } else {
      btn.textContent = on
        ? "Auto-save on · new cards stay on this device (default)"
        : "Auto-save off · save manually after each create";
    }
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  sync();
  btn.addEventListener("click", () => {
    setAutoSaveEnabled(!isAutoSaveEnabled());
    sync();
    window.dispatchEvent(new Event("hc-auto-save-changed"));
  });
}
