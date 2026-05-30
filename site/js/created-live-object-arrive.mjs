/**
 * Live object card Settle on /created/ (Register A).
 * @see docs/MERCH_VISUAL_CHOREOGRAPHY.md § Beat 4
 */
import {
  CREATED_LIVE_ARRIVE_VISIBLE_CLASS,
  CREATED_LIVE_OBJECT_MIN_ARRIVE_MS,
  CREATED_LIVE_OBJECT_PENDING_CLASS,
  CREATED_LIVE_OBJECT_ROW_STAGGER_MS,
  CREATED_LIVE_OBJECT_SETTLED_CLASS,
  CREATED_LIVE_OBJECT_SETTLE_PULSE_CLASS,
} from "./created-live-object-card-core.mjs";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * @param {HTMLElement | null | undefined} cardEl
 */
export function resetCreatedLiveObjectArrive(cardEl) {
  if (!cardEl) return;
  cardEl.classList.remove(CREATED_LIVE_OBJECT_PENDING_CLASS, CREATED_LIVE_OBJECT_SETTLED_CLASS);
  for (const el of cardEl.querySelectorAll(".created-live-arrive-item")) {
    el.classList.remove(CREATED_LIVE_ARRIVE_VISIBLE_CLASS);
    el.hidden = true;
  }
}

function revealItem(el, instant) {
  if (!el) return;
  el.hidden = false;
  el.classList.add(CREATED_LIVE_ARRIVE_VISIBLE_CLASS);
  if (instant) return;
}

/**
 * @param {HTMLElement | null | undefined} cardEl
 */
export function settleCreatedLiveObjectInstant(cardEl) {
  if (!cardEl) return;
  for (const el of cardEl.querySelectorAll(".created-live-arrive-item")) {
    revealItem(el, true);
  }
  cardEl.classList.remove(CREATED_LIVE_OBJECT_PENDING_CLASS);
  cardEl.classList.add(CREATED_LIVE_OBJECT_SETTLED_CLASS);
  window.dispatchEvent(
    new CustomEvent("hc-created-live-object-settled", { detail: { instant: true } })
  );
}

/**
 * @param {HTMLElement | null | undefined} cardEl
 */
export async function runCreatedLiveObjectArrive(cardEl) {
  if (!cardEl || cardEl.classList.contains(CREATED_LIVE_OBJECT_SETTLED_CLASS)) return;

  const reduced = prefersReducedMotion();
  const items = [...cardEl.querySelectorAll(".created-live-arrive-item")].filter((el) => {
    if (el.id === "created-live-manifesto-teaser" && !el.textContent?.trim()) return false;
    if (el.id === "created-live-object-handle" && !el.textContent?.trim()) return false;
    if (el.id === "created-live-object-status-chip" && el.hidden) return false;
    return true;
  });

  cardEl.classList.add(CREATED_LIVE_OBJECT_PENDING_CLASS);
  cardEl.classList.remove(CREATED_LIVE_OBJECT_SETTLED_CLASS);

  for (const el of cardEl.querySelectorAll(".created-live-arrive-item")) {
    el.hidden = true;
    el.classList.remove(CREATED_LIVE_ARRIVE_VISIBLE_CLASS);
  }

  if (reduced) {
    settleCreatedLiveObjectInstant(cardEl);
    return;
  }

  await new Promise((r) => setTimeout(r, CREATED_LIVE_OBJECT_MIN_ARRIVE_MS));

  items.forEach((el, i) => {
    window.setTimeout(
      () => revealItem(el, false),
      i * CREATED_LIVE_OBJECT_ROW_STAGGER_MS
    );
  });

  const staggerEnd = items.length * CREATED_LIVE_OBJECT_ROW_STAGGER_MS;
  window.setTimeout(() => {
    cardEl.classList.remove(CREATED_LIVE_OBJECT_PENDING_CLASS);
    cardEl.classList.add(CREATED_LIVE_OBJECT_SETTLED_CLASS);
    cardEl.classList.add(CREATED_LIVE_OBJECT_SETTLE_PULSE_CLASS);
    cardEl.addEventListener(
      "animationend",
      () => cardEl.classList.remove(CREATED_LIVE_OBJECT_SETTLE_PULSE_CLASS),
      { once: true }
    );
    window.dispatchEvent(
      new CustomEvent("hc-created-live-object-settled", { detail: { instant: false } })
    );
  }, staggerEnd + 40);
}
