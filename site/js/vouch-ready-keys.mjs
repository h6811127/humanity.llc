/**
 * Device settings for scan-first vouching (default card + opt-in auto-activate).
 * @see docs/VOUCH_READY_KEYS_DESIGN.md
 */

export const DEFAULT_VOUCH_PROFILE_KEY = "hc_default_vouch_profile_id";
export const VOUCH_AUTO_ACTIVATE_KEY = "hc_vouch_auto_activate";

export function getDefaultVouchProfileId() {
  try {
    const id = localStorage.getItem(DEFAULT_VOUCH_PROFILE_KEY);
    return id && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

export function isVouchAutoActivateEnabled() {
  try {
    return localStorage.getItem(VOUCH_AUTO_ACTIVATE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isDefaultVouchProfile(profileId) {
  if (!profileId) return false;
  return getDefaultVouchProfileId() === profileId;
}

/**
 * @param {string | null} profileId
 */
export function setDefaultVouchProfile(profileId) {
  try {
    if (!profileId) {
      localStorage.removeItem(DEFAULT_VOUCH_PROFILE_KEY);
      localStorage.removeItem(VOUCH_AUTO_ACTIVATE_KEY);
    } else {
      localStorage.setItem(DEFAULT_VOUCH_PROFILE_KEY, profileId);
      localStorage.setItem(VOUCH_AUTO_ACTIVATE_KEY, "1");
    }
    window.dispatchEvent(new Event("hc-vouch-ready-changed"));
  } catch {
    /* ignore */
  }
}

/** @param {string} profileId */
export function clearDefaultVouchIfProfile(profileId) {
  if (isDefaultVouchProfile(profileId)) {
    setDefaultVouchProfile(null);
  }
}
