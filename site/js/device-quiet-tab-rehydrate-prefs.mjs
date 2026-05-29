/**
 * Quiet tab rehydrate device prefs (D10 Tier 2).
 * @see docs/QUIET_TAB_REHYDRATE.md
 */

export const QUIET_TAB_REHYDRATE_KEY = "hc_quiet_tab_rehydrate";
export const LAST_ACTIVE_PROFILE_KEY = "hc_last_active_profile_id";
export const QUIET_TAB_REHYDRATED_PROFILE_KEY = "hc_quiet_tab_rehydrated_profile";
export const QUIET_TAB_REHYDRATE_CHANGED = "hc-quiet-tab-rehydrate-changed";

/**
 * @param {string | null} stored `localStorage` value for {@link QUIET_TAB_REHYDRATE_KEY}
 */
export function quietTabRehydrateEnabledFromStorage(stored) {
  if (stored === "0") return false;
  return true;
}

export function isQuietTabRehydrateEnabled() {
  return quietTabRehydrateEnabledFromStorage(localStorage.getItem(QUIET_TAB_REHYDRATE_KEY));
}

/** @param {boolean} on */
export function setQuietTabRehydrateEnabled(on) {
  localStorage.setItem(QUIET_TAB_REHYDRATE_KEY, on ? "1" : "0");
}

export function getLastActiveProfileId() {
  try {
    const id = localStorage.getItem(LAST_ACTIVE_PROFILE_KEY);
    return id && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

/** @param {string | null | undefined} profileId */
export function setLastActiveProfileId(profileId) {
  try {
    const pid = typeof profileId === "string" ? profileId.trim() : "";
    if (!pid) {
      localStorage.removeItem(LAST_ACTIVE_PROFILE_KEY);
    } else {
      localStorage.setItem(LAST_ACTIVE_PROFILE_KEY, pid);
    }
  } catch {
    /* ignore */
  }
}

/** @param {string} profileId */
export function clearLastActiveProfileIfProfile(profileId) {
  if (getLastActiveProfileId() === profileId) {
    setLastActiveProfileId(null);
  }
}

/** @returns {string | null} Profile quietly rehydrated into this tab this load (Tier 3). */
export function getQuietTabRehydratedProfile() {
  try {
    const id = sessionStorage.getItem(QUIET_TAB_REHYDRATED_PROFILE_KEY);
    return id && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

/** @param {string} profileId */
export function setQuietTabRehydratedProfile(profileId) {
  try {
    const pid = typeof profileId === "string" ? profileId.trim() : "";
    if (!pid) {
      sessionStorage.removeItem(QUIET_TAB_REHYDRATED_PROFILE_KEY);
    } else {
      sessionStorage.setItem(QUIET_TAB_REHYDRATED_PROFILE_KEY, pid);
    }
  } catch {
    /* ignore */
  }
}

export function initQuietTabRehydrateToggle() {
  const btn = document.getElementById("device-quiet-tab-rehydrate-toggle");
  if (!btn) return;

  function sync() {
    const on = isQuietTabRehydrateEnabled();
    const title = btn.querySelector(".list-title");
    const sub = btn.querySelector(".list-sub");
    if (title && sub) {
      title.textContent = "Open last object in new tabs";
      sub.textContent = on
        ? "On · new tabs continue your last object (default)"
        : "Off · pick an object when you open a new tab";
    } else {
      btn.textContent = on
        ? "Open last object in new tabs · on (default)"
        : "Open last object in new tabs · off";
    }
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  sync();
  btn.addEventListener("click", () => {
    setQuietTabRehydrateEnabled(!isQuietTabRehydrateEnabled());
    sync();
    window.dispatchEvent(new Event(QUIET_TAB_REHYDRATE_CHANGED));
  });
}
