/**
 * Path 2 live check data-arriving on scan pages (L2 Settle + L1 dot sync).
 * @see docs/SCAN_PAGE_TRUST_UI.md
 */
import {
  SCAN_ARRIVE_CHECKING_LABEL,
  SCAN_ARRIVE_MIN_CHECKING_MS,
  SCAN_ARRIVE_ROW_STAGGER_MS,
  SCAN_ARRIVE_SETTLE_MS,
} from "./scan-live-check-arrive-core.mjs";

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

async function runArriveSequence(hero) {
  const reduced = prefersReducedMotion();
  const label = resolvedLabel(hero);
  const statusEl = statusLabelEl(hero);
  const items = [...hero.querySelectorAll(".scan-arrive-item")];

  if (reduced) {
    settleInstant(hero);
    return;
  }

  if (statusEl) statusEl.textContent = SCAN_ARRIVE_CHECKING_LABEL;

  await new Promise((r) => setTimeout(r, SCAN_ARRIVE_MIN_CHECKING_MS));

  if (statusEl && label) statusEl.textContent = label;

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

export function initScanLiveCheckArrive() {
  const hero = heroEl();
  if (!hero || !hero.classList.contains(PENDING_CLASS)) return;
  void runArriveSequence(hero);
}

initScanLiveCheckArrive();
