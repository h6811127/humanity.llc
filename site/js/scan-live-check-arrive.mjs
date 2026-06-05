/**
 * Path 2 live check data-arriving on scan pages (L2 Settle + L1 dot sync).
 * Phase 1: network status JSON gate before trusting SSR (scan-live-truth).
 * @see docs/SCAN_PAGE_TRUST_UI.md
 */
import {
  SCAN_ARRIVE_CHECKING_LABEL,
  SCAN_ARRIVE_MIN_CHECKING_MS,
  SCAN_ARRIVE_ROW_STAGGER_MS,
  SCAN_ARRIVE_SETTLE_MS,
  shouldSkipScanArriveCheckingPhase,
} from "./scan-live-check-arrive-core.mjs";
import { shouldBypassSsrFastPath } from "./scan-live-truth-core.mjs";
import {
  applyConfirmedScanTruth,
  fetchScanLiveTruth,
  handleScanTruthMismatch,
  showScanTruthUnverified,
} from "./scan-live-truth.mjs";

const PENDING_CLASS = "scan-live-check--pending";
const SETTLED_CLASS = "scan-live-check--settled";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function heroEl() {
  return document.getElementById("scan-safety-header");
}

function resolvedLabel(hero) {
  const strip = hero?.querySelector(".scan-arrive-strip");
  return strip?.dataset?.arriveLabel?.trim() || null;
}

function statusLabelEl(hero) {
  return hero?.querySelector(".scan-arrive-status-label");
}

function navigationType() {
  const entry = performance.getEntriesByType("navigation")[0];
  return entry && "type" in entry ? String(entry.type) : null;
}

function revealItem(el, reduced) {
  if (!el) return;
  el.classList.add("scan-arrive-item--visible");
  if (reduced) return;
  el.classList.remove("scan-arrive-item--hidden");
}

function settleHeroPulse(hero, reduced) {
  if (!hero || reduced) return;
  hero.classList.add("scan-safety--pulse");
  hero.addEventListener(
    "animationend",
    function onEnd() {
      hero.classList.remove("scan-safety--pulse");
      hero.removeEventListener("animationend", onEnd);
    },
    { once: true }
  );
}

function syncDotSettle(reduced) {
  if (reduced) return;
  const btn = document.getElementById("scan-page-dot-btn");
  if (!btn) return;
  btn.classList.add("scan-page-dot--settle");
  btn.addEventListener(
    "animationend",
    () => btn.classList.remove("scan-page-dot--settle"),
    { once: true }
  );
}

function revealLimits(hero, reduced) {
  for (const el of hero?.querySelectorAll(".scan-arrive-limits") ?? []) {
    el.classList.add("scan-arrive-limits--visible");
    if (!reduced) el.classList.remove("scan-arrive-limits--hidden");
  }
}

function settleInstant(hero) {
  const label = resolvedLabel(hero);
  const statusEl = statusLabelEl(hero);
  if (statusEl && label) statusEl.textContent = label;

  for (const el of hero?.querySelectorAll(".scan-arrive-item") ?? []) {
    revealItem(el, true);
  }
  revealLimits(hero, true);
  hero?.classList.remove(PENDING_CLASS);
  hero?.classList.add(SETTLED_CLASS);
  window.dispatchEvent(new CustomEvent("hc-scan-live-check-settled", { detail: { instant: true } }));
}

/**
 * @param {HTMLElement} hero
 * @param {{
 *   truthVerified?: boolean,
 *   forceRevalidate?: boolean,
 * }} opts
 */
async function runArriveSequence(hero, opts = {}) {
  const reduced = prefersReducedMotion();
  const label = resolvedLabel(hero);
  const statusEl = statusLabelEl(hero);
  const items = [...hero.querySelectorAll(".scan-arrive-item")];
  const skipChecking = shouldSkipScanArriveCheckingPhase({
    arriveLabel: label,
    statusText: statusEl?.textContent,
    online: navigator.onLine !== false,
    truthVerified: opts.truthVerified === true,
    forceRevalidate: opts.forceRevalidate === true,
  });

  if (reduced) {
    settleInstant(hero);
    return;
  }

  if (!skipChecking) {
    if (statusEl) statusEl.textContent = SCAN_ARRIVE_CHECKING_LABEL;
    await new Promise((r) => setTimeout(r, SCAN_ARRIVE_MIN_CHECKING_MS));
    if (statusEl && label) statusEl.textContent = label;
  } else if (statusEl && label && statusEl.textContent?.trim() !== label) {
    statusEl.textContent = label;
  }

  items.forEach((el, i) => {
    window.setTimeout(() => revealItem(el, false), i * SCAN_ARRIVE_ROW_STAGGER_MS);
  });

  const staggerEnd = items.length * SCAN_ARRIVE_ROW_STAGGER_MS;
  window.setTimeout(() => {
    settleHeroPulse(hero, false);
    syncDotSettle(false);
    revealLimits(hero, false);
    hero.classList.remove(PENDING_CLASS);
    hero.classList.add(SETTLED_CLASS);
    window.dispatchEvent(
      new CustomEvent("hc-scan-live-check-settled", { detail: { instant: false } })
    );
  }, staggerEnd + 40);
}

/**
 * @param {HTMLElement} hero
 * @param {{ persisted?: boolean }} [opts]
 */
async function gateScanLiveTruth(hero, opts = {}) {
  if (!hero.dataset.profileId || !hero.dataset.qrId) {
    return { truthVerified: false, forceRevalidate: false };
  }

  const truth = await fetchScanLiveTruth(hero);
  const forceRevalidate = shouldBypassSsrFastPath({
    persisted: opts.persisted === true,
    navigationType: navigationType(),
  });

  if (!truth.ok) {
    showScanTruthUnverified();
    return { truthVerified: false, forceRevalidate: true };
  }

  if (!truth.match) {
    const action = handleScanTruthMismatch(hero, truth);
    if (action === "reload") {
      return { truthVerified: false, forceRevalidate: true, reloading: true };
    }
    return {
      truthVerified: false,
      forceRevalidate: true,
      arriveLabel: truth.arriveLabel,
    };
  }

  applyConfirmedScanTruth(hero, truth);
  return {
    truthVerified: true,
    forceRevalidate,
    arriveLabel: truth.arriveLabel,
  };
}

export async function initScanLiveCheckArrive(opts = {}) {
  const hero = heroEl();
  if (!hero || !hero.classList.contains(PENDING_CLASS)) return;

  const gate = await gateScanLiveTruth(hero, opts);
  if (gate.reloading) return;

  await runArriveSequence(hero, {
    truthVerified: gate.truthVerified,
    forceRevalidate: gate.forceRevalidate,
  });
}

void initScanLiveCheckArrive();

window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  const hero = heroEl();
  if (!hero) return;
  void (async () => {
    const gate = await gateScanLiveTruth(hero, { persisted: true });
    if (gate.reloading) return;
    const statusEl = statusLabelEl(hero);
    const label = gate.arriveLabel || resolvedLabel(hero);
    if (statusEl && label) statusEl.textContent = label;
  })();
});
