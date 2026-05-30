/**
 * Thanks mint activation Settle on /shop/thanks/ (Register A).
 * @see docs/MERCH_VISUAL_CHOREOGRAPHY.md § Beat 4
 */
import {
  THANKS_ACTIVATION_ARRIVE_VISIBLE_CLASS,
  THANKS_ACTIVATION_MIN_ARRIVE_MS,
  THANKS_ACTIVATION_PENDING_CLASS,
  THANKS_ACTIVATION_ROW_STAGGER_MS,
  THANKS_ACTIVATION_SETTLED_CLASS,
  THANKS_ACTIVATION_SETTLE_PULSE_CLASS,
} from "./shop-thanks-activation-core.mjs";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * @param {HTMLElement | null | undefined} cardEl
 */
export function resetThanksActivationArrive(cardEl) {
  if (!cardEl) return;
  cardEl.classList.remove(THANKS_ACTIVATION_PENDING_CLASS, THANKS_ACTIVATION_SETTLED_CLASS);
  cardEl.classList.remove(THANKS_ACTIVATION_SETTLE_PULSE_CLASS);
  for (const el of cardEl.querySelectorAll(".shop-thanks-arrive-item")) {
    el.classList.remove(THANKS_ACTIVATION_ARRIVE_VISIBLE_CLASS);
    el.hidden = true;
  }
}

function revealItem(el, instant) {
  if (!el) return;
  el.hidden = false;
  el.classList.add(THANKS_ACTIVATION_ARRIVE_VISIBLE_CLASS);
  if (instant) return;
}

/**
 * @param {HTMLElement | null | undefined} cardEl
 */
export function settleThanksActivationInstant(cardEl) {
  if (!cardEl) return;
  for (const el of cardEl.querySelectorAll(".shop-thanks-arrive-item")) {
    revealItem(el, true);
  }
  cardEl.classList.remove(THANKS_ACTIVATION_PENDING_CLASS);
  cardEl.classList.add(THANKS_ACTIVATION_SETTLED_CLASS);
  window.dispatchEvent(
    new CustomEvent("hc-shop-thanks-activation-settled", { detail: { instant: true } })
  );
}

/**
 * @param {HTMLElement | null | undefined} cardEl
 */
export async function runThanksActivationArrive(cardEl) {
  if (!cardEl || cardEl.classList.contains(THANKS_ACTIVATION_SETTLED_CLASS)) return;

  const reduced = prefersReducedMotion();
  const items = [...cardEl.querySelectorAll(".shop-thanks-arrive-item")];

  cardEl.classList.add(THANKS_ACTIVATION_PENDING_CLASS);
  cardEl.classList.remove(THANKS_ACTIVATION_SETTLED_CLASS);

  for (const el of cardEl.querySelectorAll(".shop-thanks-arrive-item")) {
    el.hidden = true;
    el.classList.remove(THANKS_ACTIVATION_ARRIVE_VISIBLE_CLASS);
  }

  if (reduced) {
    settleThanksActivationInstant(cardEl);
    return;
  }

  await new Promise((r) => setTimeout(r, THANKS_ACTIVATION_MIN_ARRIVE_MS));

  items.forEach((el, i) => {
    window.setTimeout(() => revealItem(el, false), i * THANKS_ACTIVATION_ROW_STAGGER_MS);
  });

  const staggerEnd = items.length * THANKS_ACTIVATION_ROW_STAGGER_MS;
  window.setTimeout(() => {
    cardEl.classList.remove(THANKS_ACTIVATION_PENDING_CLASS);
    cardEl.classList.add(THANKS_ACTIVATION_SETTLED_CLASS);
    cardEl.classList.add(THANKS_ACTIVATION_SETTLE_PULSE_CLASS);
    cardEl.addEventListener(
      "animationend",
      () => cardEl.classList.remove(THANKS_ACTIVATION_SETTLE_PULSE_CLASS),
      { once: true }
    );
    window.dispatchEvent(
      new CustomEvent("hc-shop-thanks-activation-settled", { detail: { instant: false } })
    );
  }, staggerEnd + 40);
}
