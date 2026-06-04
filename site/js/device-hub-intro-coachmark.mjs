/**
 * First-visit coachmark: points new users at the status dot to open the device hub.
 * @see docs/DEVICE_HUB_INTRO_COACHMARK.md
 * @see docs/HUB_STRANGER_ONBOARDING.md
 */
import { isAutoSaveEnabled, isAutoSaveFailed } from "./device-auto-save.mjs";
import { tabNoticeCountFromState } from "./device-counts-core.mjs";
import { isHubStrangerEmptyState } from "./device-hub-stranger-empty-core.mjs";
import { HUB_INTRO_BODY_STRANGER } from "./device-ownership-copy-core.mjs?v=89";
import { loadPins } from "./device-pins.mjs";
import { getWalletCount, isWalletSaved } from "./device-wallet.mjs";

export const HUB_INTRO_STORAGE_KEY = "hc_device_hub_intro_dismissed";
export const HUB_INTRO_SEEN_STORAGE_KEY = "hc_device_hub_intro_seen";

const INTRO_ID = "device-hub-intro-coachmark";
const DISMISS_ID = "device-hub-intro-dismiss";
const SHOW_DELAY_MS = 700;
const INTRO_BODY_DEFAULT =
  "One tap on the status dot opens everything saved on this device-cards, keys, and notices.";

/** @type {HTMLElement | null} */
let root = null;
/** @type {number | null} */
let showTimer = null;

export function isHubIntroDismissed() {
  try {
    return localStorage.getItem(HUB_INTRO_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function hasSeenHubIntro() {
  try {
    return localStorage.getItem(HUB_INTRO_SEEN_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markHubIntroSeen() {
  try {
    localStorage.setItem(HUB_INTRO_SEEN_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function dismissHubIntro() {
  try {
    localStorage.setItem(HUB_INTRO_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
  hideHubIntroCoachmark();
}

/**
 * @param {{
 *   hasHub?: boolean,
 *   isWalletPage?: boolean,
 *   statusLoadError?: boolean,
 *   hubSheetOpen?: boolean,
 *   inboxOpen?: boolean,
 *   dismissed?: boolean,
 *   seen?: boolean,
 * }} ctx
 */
export function shouldShowHubIntro(ctx) {
  if (!ctx.hasHub || ctx.isWalletPage || ctx.statusLoadError) return false;
  if (ctx.dismissed ?? isHubIntroDismissed()) return false;
  if (ctx.seen ?? hasSeenHubIntro()) return false;
  if (ctx.hubSheetOpen || ctx.inboxOpen) return false;
  return true;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readVisibilityContext() {
  const topChrome = document.getElementById("top-chrome");
  return {
    hasHub: Boolean(document.getElementById("device-hub")),
    isWalletPage: document.body.classList.contains("page-wallet"),
    statusLoadError: topChrome?.hasAttribute("data-device-status-error") ?? false,
    hubSheetOpen: document.body.classList.contains("device-hub-sheet-open"),
    inboxOpen: document.body.classList.contains("device-inbox-sheet-open"),
  };
}

function tabNoticeCountForCoachmark() {
  try {
    const raw = sessionStorage.getItem("hc_created");
    const session = raw ? JSON.parse(raw) : null;
    if (!session?.profile_id) return 0;
    return tabNoticeCountFromState(session, isWalletSaved(session.profile_id), {
      autoSaveEnabled: isAutoSaveEnabled(),
      autoSaveFailed: isAutoSaveFailed(session.profile_id),
    });
  } catch {
    return 0;
  }
}

function hubIntroUsesStrangerCopy() {
  return isHubStrangerEmptyState({
    walletCount: getWalletCount(),
    pinCount: loadPins().length,
    inboxActionCount: tabNoticeCountForCoachmark(),
  });
}

function syncHubIntroCopy(rootEl) {
  const bodyEl = rootEl.querySelector(".device-hub-intro-body");
  if (!bodyEl) return;
  bodyEl.textContent = hubIntroUsesStrangerCopy()
    ? HUB_INTRO_BODY_STRANGER
    : INTRO_BODY_DEFAULT;
}

function ensureCoachmarkMarkup() {
  const cluster = document.querySelector(".shell-status-cluster");
  if (!cluster || document.getElementById(INTRO_ID)) return;

  const el = document.createElement("div");
  el.id = INTRO_ID;
  el.className = "device-hub-intro-coachmark";
  el.hidden = true;
  el.setAttribute("role", "complementary");
  el.setAttribute("aria-labelledby", "device-hub-intro-title");
  el.innerHTML = `
    <div class="device-hub-intro-caret" aria-hidden="true"></div>
    <p class="device-hub-intro-eyebrow">Welcome</p>
    <p class="device-hub-intro-title" id="device-hub-intro-title">Meet your device hub</p>
    <p class="device-hub-intro-body">
      ${INTRO_BODY_DEFAULT}
    </p>
    <p class="device-hub-intro-cta" aria-hidden="true">Tap the dot above</p>
    <button type="button" class="device-hub-intro-dismiss" id="${DISMISS_ID}">
      Got it
    </button>
  `;
  cluster.appendChild(el);

  el.querySelector(`#${DISMISS_ID}`)?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dismissHubIntro();
  });
}

export function hideHubIntroCoachmark() {
  if (showTimer != null) {
    window.clearTimeout(showTimer);
    showTimer = null;
  }
  root = document.getElementById(INTRO_ID);
  if (!root) return;
  root.hidden = true;
  document.body.classList.remove("device-hub-intro-visible");
  document.querySelector(".shell-status-cluster")?.classList.remove("shell-status-cluster--hub-intro");
}

export function showHubIntroCoachmark() {
  root = document.getElementById(INTRO_ID);
  if (!root || !shouldShowHubIntro(readVisibilityContext())) return;
  syncHubIntroCopy(root);
  // First-visit means show once even if user does not tap "Got it".
  markHubIntroSeen();
  root.hidden = false;
  document.body.classList.add("device-hub-intro-visible");
  document.querySelector(".shell-status-cluster")?.classList.add("shell-status-cluster--hub-intro");
}

export function syncHubIntroVisibility() {
  if (!shouldShowHubIntro(readVisibilityContext())) {
    hideHubIntroCoachmark();
    return;
  }
  if (!document.getElementById(INTRO_ID)) {
    ensureCoachmarkMarkup();
  }
  if (root?.hidden === false) return;
  if (showTimer != null) return;
  showHubIntroCoachmark();
}

function scheduleHubIntro() {
  if (!shouldShowHubIntro(readVisibilityContext())) return;
  ensureCoachmarkMarkup();
  if (showTimer != null) return;
  const delay = prefersReducedMotion() ? 120 : SHOW_DELAY_MS;
  showTimer = window.setTimeout(() => {
    showTimer = null;
    showHubIntroCoachmark();
  }, delay);
}

/**
 * Mount coachmark DOM and schedule first display on hub shell pages.
 */
export function initHubIntroCoachmark() {
  if (!document.getElementById("device-hub")) return;
  ensureCoachmarkMarkup();
  scheduleHubIntro();

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (root?.hidden === false) dismissHubIntro();
  });

  window.addEventListener("hc-hub-sheet-close", () => syncHubIntroVisibility());
}

/** Persist dismiss when the user opens the device hub. */
export function onHubOpenedFromIntro() {
  dismissHubIntro();
}
