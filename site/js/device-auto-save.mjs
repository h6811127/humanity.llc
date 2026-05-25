/**
 * Optional auto-save: write new tab keys to hc_wallet without a manual Save tap.
 */
export const AUTO_SAVE_KEY = "hc_auto_save_device";

export function isAutoSaveEnabled() {
  return localStorage.getItem(AUTO_SAVE_KEY) === "1";
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
    btn.textContent = on
      ? "Auto-save on · new cards stay on this device"
      : "Auto-save off · save after each create";
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  sync();
  btn.addEventListener("click", () => {
    setAutoSaveEnabled(!isAutoSaveEnabled());
    sync();
    window.dispatchEvent(new Event("hc-auto-save-changed"));
  });
}
