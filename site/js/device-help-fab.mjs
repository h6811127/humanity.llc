/**
 * Small fixed help link on device shell pages (landing, hub, wallet, create, created).
 */

const HELP_HREF = "/help/";
const FAB_ID = "device-help-fab";

const SHELL_PATHS = new Set(["/", "/wallet", "/created", "/create"]);

function isShellPage() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  return SHELL_PATHS.has(path);
}

function ensureFab() {
  if (!isShellPage() || document.getElementById(FAB_ID)) return;

  const link = document.createElement("a");
  link.id = FAB_ID;
  link.className = "device-help-fab";
  link.href = HELP_HREF;
  link.setAttribute("aria-label", "Help and guides");
  link.title = "Help";
  link.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <path d="M12 17h.01"/>
    </svg>`;
  document.body.appendChild(link);
}

ensureFab();
