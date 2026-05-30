/**
 * Thanks mint activation card coordinator on /shop/thanks/.
 */
import {
  THANKS_ACTIVATION_CTA_HREF,
  THANKS_ACTIVATION_CTA_LABEL,
  THANKS_ACTIVATION_EYEBROW,
  THANKS_ACTIVATION_HEADLINE,
  THANKS_ACTIVATION_LEAD,
} from "./shop-thanks-activation-core.mjs";
import {
  resetThanksActivationArrive,
  runThanksActivationArrive,
} from "./shop-thanks-activation-arrive.mjs";

const section = document.getElementById("shop-thanks-activation-section");
const card = document.getElementById("shop-thanks-activation-card");
const eyebrowEl = document.getElementById("shop-thanks-activation-eyebrow");
const headlineEl = document.getElementById("shop-thanks-activation-headline");
const leadEl = document.getElementById("shop-thanks-activation-lead");
const ctaEl = document.getElementById("shop-thanks-activation-cta");

function syncActivationCopy() {
  if (eyebrowEl) eyebrowEl.textContent = THANKS_ACTIVATION_EYEBROW;
  if (headlineEl) headlineEl.textContent = THANKS_ACTIVATION_HEADLINE;
  if (leadEl) leadEl.textContent = THANKS_ACTIVATION_LEAD;
  if (ctaEl instanceof HTMLAnchorElement) {
    ctaEl.textContent = THANKS_ACTIVATION_CTA_LABEL;
    ctaEl.href = THANKS_ACTIVATION_CTA_HREF;
  }
}

export function hideThanksActivationCard() {
  if (section instanceof HTMLElement) section.hidden = true;
  if (card instanceof HTMLElement) resetThanksActivationArrive(card);
}

export function showThanksActivationCard() {
  if (!(section instanceof HTMLElement) || !(card instanceof HTMLElement)) return;
  section.hidden = false;
  void runThanksActivationArrive(card);
}

export function initThanksActivationCard() {
  syncActivationCopy();
  hideThanksActivationCard();
}

initThanksActivationCard();
