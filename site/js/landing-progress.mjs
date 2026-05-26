/**
 * Landing progress strip — legend + single Continue CTA.
 * @see docs/LANDING_PROGRESS_STRIP.md
 */
import {
  PINS_KEY,
  resolveLandingContinue,
  SETUP_DONE_KEY,
  WALLET_KEY,
  parseSetupDoneMap,
} from "./landing-progress-core.mjs";

function loadWallet() {
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadPins() {
  try {
    const raw = localStorage.getItem(PINS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadSetupDone() {
  try {
    const raw = localStorage.getItem(SETUP_DONE_KEY);
    return parseSetupDoneMap(raw ? JSON.parse(raw) : {});
  } catch {
    return {};
  }
}

function loadTabSession() {
  try {
    const raw = sessionStorage.getItem("hc_created");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Tab has signing keys not yet in `hc_wallet` (same rule as device-status). */
function hasUnsavedTabKeys(session) {
  const profileId =
    typeof session?.profile_id === "string" ? session.profile_id.trim() : "";
  if (!profileId || !session?.owner_private_key_b58) return false;
  return !loadWallet().some((e) => e.profile_id === profileId);
}

function applyProgressState() {
  const steps = document.querySelectorAll(".landing-progress-step");
  const continueEl = document.getElementById("landing-progress-continue");
  if (!steps.length || !continueEl) return;

  const wallet = loadWallet();
  const session = loadTabSession();
  const unsaved = hasUnsavedTabKeys(session);
  const state = resolveLandingContinue({
    wallet,
    pins: loadPins(),
    setupDone: loadSetupDone(),
    unsavedTabKeys: unsaved,
    session: unsaved
      ? {
          profile_id: session?.profile_id ?? null,
          qr_id: session?.qr_id ?? null,
          scan_url: session?.scan_url ?? null,
        }
      : session
        ? { profile_id: session.profile_id ?? null, qr_id: session.qr_id ?? null }
        : null,
  });

  for (const step of steps) {
    step.classList.remove("is-next", "is-done");
  }

  for (const n of state.legendDone) {
    const step = document.querySelector(`.landing-progress-step[data-legend-step="${n}"]`);
    step?.classList.add("is-done");
  }

  if (state.legendStep && (wallet.length > 0 || unsaved)) {
    const active = document.querySelector(
      `.landing-progress-step[data-legend-step="${state.legendStep}"]`
    );
    active?.classList.add("is-next");
  }

  continueEl.href = state.href;
  continueEl.textContent = state.label;
}

applyProgressState();

window.addEventListener("storage", (e) => {
  if (
    e.key === WALLET_KEY ||
    e.key === PINS_KEY ||
    e.key === SETUP_DONE_KEY ||
    e.key === "hc_created"
  ) {
    applyProgressState();
  }
});

window.addEventListener("hc-device-hub-changed", applyProgressState);
window.addEventListener("pageshow", applyProgressState);
window.addEventListener("focus", applyProgressState);
