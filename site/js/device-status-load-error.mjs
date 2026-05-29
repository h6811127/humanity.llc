/**
 * Bootstrap-only status dot coach card when device-status.mjs fails to load.
 * @see docs/STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md § Load-error dot explainer
 * @see docs/PRODUCT_LANGUAGE_STRATEGY.md — Layer 2 outcome copy
 */

export const STATUS_LOAD_ERROR_POPOVER_ID = "device-status-load-error-popover";
export const STATUS_LOAD_ERROR_DISMISS_ID = "device-status-load-error-dismiss";

export const STATUS_LOAD_ERROR_ARIA_LABEL =
  "Device controls failed to load. See details below the status dot.";

/** @type {{ kicker: string, now: string, why: string, next: string }} */
export const STATUS_LOAD_ERROR_EXPLAINER = {
  kicker: "Controls couldn't load",
  now: "Device controls didn't finish loading in this browser.",
  why: "Part of this page failed to download—often a bad connection or stale cache.",
  next: "Refresh this page. If it keeps happening, try a hard refresh or another network.",
};

export const STATUS_LOAD_ERROR_REFRESH_LABEL = "Refresh page";
export const STATUS_LOAD_ERROR_DISMISS_LABEL = "Got it";

const SHOW_DELAY_MS = 500;

/** @type {number | null} */
let showTimer = null;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

function ensureLoadErrorCoachCard() {
  const existing = document.getElementById(STATUS_LOAD_ERROR_POPOVER_ID);
  if (existing) return existing;

  const cluster = document.querySelector(".shell-status-cluster");
  if (!cluster) return null;

  const card = document.createElement("div");
  card.id = STATUS_LOAD_ERROR_POPOVER_ID;
  card.className = "device-status-load-error-coachmark";
  card.hidden = true;
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-labelledby", "device-status-load-error-title");
  card.innerHTML = `
    <div class="device-hub-intro-caret" aria-hidden="true"></div>
    <p class="device-hub-intro-eyebrow">Status</p>
    <p class="device-hub-intro-title" id="device-status-load-error-title">${escapeHtml(STATUS_LOAD_ERROR_EXPLAINER.kicker)}</p>
    <div class="device-dot-explainer device-dot-explainer--popover">
      ${renderStatusLoadErrorExplainerHtml()}
    </div>
    <button type="button" class="device-hub-intro-dismiss" id="${STATUS_LOAD_ERROR_DISMISS_ID}" data-status-load-error-action="dismiss">
      ${escapeHtml(STATUS_LOAD_ERROR_DISMISS_LABEL)}
    </button>`;
  cluster.appendChild(card);
  return card;
}

function setLoadErrorCoachCardOpen(open) {
  const card = document.getElementById(STATUS_LOAD_ERROR_POPOVER_ID);
  const dotBtn = document.getElementById("brand-status-dot-btn");
  if (!(card instanceof HTMLElement)) return;

  card.hidden = !open;
  dotBtn?.setAttribute("aria-expanded", open ? "true" : "false");
  document.body.classList.toggle("device-status-load-error-visible", open);
}

function isLoadErrorCoachCardOpen() {
  const card = document.getElementById(STATUS_LOAD_ERROR_POPOVER_ID);
  return card instanceof HTMLElement && !card.hidden;
}

function scheduleLoadErrorCoachCard() {
  if (isLoadErrorCoachCardOpen()) return;
  if (showTimer != null) return;
  const delay = prefersReducedMotion() ? 120 : SHOW_DELAY_MS;
  showTimer = window.setTimeout(() => {
    showTimer = null;
    setLoadErrorCoachCardOpen(true);
  }, delay);
}

/**
 * Mark chrome in error state and show load-error coach card.
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

  ensureLoadErrorCoachCard();
  scheduleLoadErrorCoachCard();

  if (dotBtn instanceof HTMLButtonElement && dotBtn.dataset.statusLoadErrorWired !== "1") {
    dotBtn.dataset.statusLoadErrorWired = "1";
    dotBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      setLoadErrorCoachCardOpen(!isLoadErrorCoachCardOpen());
    });
  }

  if (document.documentElement.dataset.statusLoadErrorDocWired !== "1") {
    document.documentElement.dataset.statusLoadErrorDocWired = "1";

    document.addEventListener("click", (event) => {
      if (!isLoadErrorCoachCardOpen()) return;
      if (!(event.target instanceof Element)) return;
      if (
        event.target.closest(
          `#${STATUS_LOAD_ERROR_POPOVER_ID}, #brand-status-dot-btn`
        )
      ) {
        return;
      }
      setLoadErrorCoachCardOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isLoadErrorCoachCardOpen()) {
        setLoadErrorCoachCardOpen(false);
      }
    });

    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const action = event.target.closest("[data-status-load-error-action]");
      if (!action) return;
      const kind = action.getAttribute("data-status-load-error-action");
      if (kind === "refresh") {
        window.location.reload();
        return;
      }
      if (kind === "dismiss") {
        setLoadErrorCoachCardOpen(false);
      }
    });
  }

  console.error("[humanity] Device status module failed to load:", technicalMessage);
}
