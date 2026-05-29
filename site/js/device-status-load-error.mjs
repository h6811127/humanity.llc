/**
 * Bootstrap-only status dot explainer when device-status.mjs fails to load.
 * @see docs/STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md § Load-error dot explainer
 * @see docs/PRODUCT_LANGUAGE_STRATEGY.md — Layer 2 outcome copy
 */

export const STATUS_LOAD_ERROR_POPOVER_ID = "device-status-load-error-popover";

export const STATUS_LOAD_ERROR_ARIA_LABEL =
  "Device controls failed to load. Tap for details.";

/** @type {{ kicker: string, now: string, why: string, next: string }} */
export const STATUS_LOAD_ERROR_EXPLAINER = {
  kicker: "Controls couldn't load",
  now: "Device controls didn't finish loading in this browser.",
  why: "Part of this page failed to download—often a bad connection or stale cache.",
  next: "Refresh this page. If it keeps happening, try a hard refresh or another network.",
};

export const STATUS_LOAD_ERROR_REFRESH_LABEL = "Refresh page";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * @param {{ kicker: string, now: string, why: string, next: string }} explainer
 */
export function renderStatusLoadErrorExplainerHtml(explainer = STATUS_LOAD_ERROR_EXPLAINER) {
  return `
    <p class="device-dot-explainer-kicker">${escapeHtml(explainer.kicker)}</p>
    <p class="device-dot-explainer-line"><strong>Now:</strong> ${escapeHtml(explainer.now)}</p>
    <p class="device-dot-explainer-line"><strong>Why:</strong> ${escapeHtml(explainer.why)}</p>
    <p class="device-dot-explainer-line"><strong>Next:</strong> ${escapeHtml(explainer.next)}</p>
    <button type="button" class="device-dot-explainer-action" data-status-load-error-action="refresh">${escapeHtml(STATUS_LOAD_ERROR_REFRESH_LABEL)}</button>`;
}

function ensureLoadErrorPopover() {
  const existing = document.getElementById(STATUS_LOAD_ERROR_POPOVER_ID);
  if (existing) return existing;

  const cluster = document.querySelector(".shell-status-cluster");
  if (!cluster) return null;

  const popover = document.createElement("div");
  popover.id = STATUS_LOAD_ERROR_POPOVER_ID;
  popover.className = "brand-status-popover device-hub-glance-popover";
  popover.hidden = true;
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", STATUS_LOAD_ERROR_EXPLAINER.kicker);

  const panel = document.createElement("div");
  panel.className = "device-dot-explainer device-dot-explainer--popover";
  panel.innerHTML = renderStatusLoadErrorExplainerHtml();
  popover.appendChild(panel);
  cluster.appendChild(popover);
  return popover;
}

function setLoadErrorPopoverOpen(open) {
  const popover = document.getElementById(STATUS_LOAD_ERROR_POPOVER_ID);
  const dotBtn = document.getElementById("brand-status-dot-btn");
  if (!(popover instanceof HTMLElement)) return;

  popover.hidden = !open;
  dotBtn?.setAttribute("aria-expanded", open ? "true" : "false");
}

function isLoadErrorPopoverOpen() {
  const popover = document.getElementById(STATUS_LOAD_ERROR_POPOVER_ID);
  return popover instanceof HTMLElement && !popover.hidden;
}

/**
 * Mark chrome in error state and wire dot tap → load-error explainer.
 * @param {string} technicalMessage
 */
export function wireStatusLoadErrorDot(technicalMessage) {
  const chrome = document.getElementById("top-chrome");
  const dotBtn = document.getElementById("brand-status-dot-btn");
  if (chrome) {
    chrome.dataset.deviceStatusError = "1";
  }
  if (dotBtn instanceof HTMLButtonElement) {
    dotBtn.setAttribute("aria-label", STATUS_LOAD_ERROR_ARIA_LABEL);
    dotBtn.setAttribute("aria-expanded", "false");
    dotBtn.setAttribute("aria-controls", STATUS_LOAD_ERROR_POPOVER_ID);
  }

  ensureLoadErrorPopover();

  if (dotBtn instanceof HTMLButtonElement && dotBtn.dataset.statusLoadErrorWired !== "1") {
    dotBtn.dataset.statusLoadErrorWired = "1";
    dotBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      setLoadErrorPopoverOpen(!isLoadErrorPopoverOpen());
    });
  }

  if (document.documentElement.dataset.statusLoadErrorDocWired !== "1") {
    document.documentElement.dataset.statusLoadErrorDocWired = "1";

    document.addEventListener("click", (event) => {
      if (!isLoadErrorPopoverOpen()) return;
      if (!(event.target instanceof Element)) return;
      if (event.target.closest(`#${STATUS_LOAD_ERROR_POPOVER_ID}, #brand-status-dot-btn`)) {
        return;
      }
      setLoadErrorPopoverOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isLoadErrorPopoverOpen()) {
        setLoadErrorPopoverOpen(false);
      }
    });

    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const action = event.target.closest("[data-status-load-error-action]");
      if (!action) return;
      const kind = action.getAttribute("data-status-load-error-action");
      if (kind === "refresh") {
        window.location.reload();
      }
    });
  }

  console.error("[humanity] Device status module failed to load:", technicalMessage);
}
