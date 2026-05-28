/**
 * Device appearance: light vs pure-black dark (OLED-friendly).
 * Preference: localStorage `hc_theme` = `light` | `dark`.
 */

const STORAGE_KEY = "hc_theme";

/** @returns {'light' | 'dark'} */
export function getThemePreference() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** @param {'light' | 'dark'} theme */
export function setThemePreference(theme) {
  const next = theme === "dark" ? "dark" : "light";
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  applyTheme(next);
  window.dispatchEvent(new CustomEvent("hc-theme-changed", { detail: { theme: next } }));
}

/** @param {'light' | 'dark'} theme */
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.dataset.theme = "dark";
    root.style.colorScheme = "dark";
  } else {
    delete root.dataset.theme;
    root.style.colorScheme = "light";
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#000000" : "#ffffff");
  syncThemeToggleButtons(theme);
}

function themeToggleLabel(theme) {
  return theme === "dark"
    ? "Appearance · dark (OLED black)"
    : "Appearance · light";
}

function syncThemeToggleButtons(theme) {
  const pref = theme ?? getThemePreference();
  document.querySelectorAll("[data-device-theme-toggle]").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.setAttribute("aria-pressed", pref === "dark" ? "true" : "false");
    const title = btn.querySelector(".list-title");
    const sub = btn.querySelector(".list-sub");
    if (title && sub) {
      title.textContent = "Appearance";
      sub.textContent =
        pref === "dark" ? "Dark · OLED black" : "Light · default";
    } else {
      btn.textContent = themeToggleLabel(pref);
    }
  });
}

export function mountThemeToggles() {
  document.querySelectorAll("[data-device-theme-toggle]").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn.dataset.themeBound === "1") return;
    btn.dataset.themeBound = "1";
    btn.addEventListener("click", () => {
      const next = getThemePreference() === "dark" ? "light" : "dark";
      setThemePreference(next);
    });
  });
  syncThemeToggleButtons(getThemePreference());
}

function initTheme() {
  applyTheme(getThemePreference());
  mountThemeToggles();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountThemeToggles);
  }
}

initTheme();
