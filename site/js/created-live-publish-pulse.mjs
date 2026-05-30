/**
 * Publish pulse on live object card after manifesto update (Beat 5).
 * @see docs/MERCH_VISUAL_CHOREOGRAPHY.md § Beat 5
 */
import {
  CREATED_LIVE_OBJECT_PUBLISH_PULSE_CLASS,
  CREATED_LIVE_PUBLISH_CONFIRM,
} from "./created-live-object-card-core.mjs";

/**
 * @param {HTMLElement | null | undefined} cardEl
 */
export function runCreatedLivePublishPulse(cardEl) {
  if (!cardEl) return;

  const confirmEl = document.getElementById("created-live-publish-confirm");
  if (confirmEl) {
    confirmEl.textContent = CREATED_LIVE_PUBLISH_CONFIRM;
    confirmEl.hidden = false;
    window.setTimeout(() => {
      confirmEl.hidden = true;
    }, 5000);
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  cardEl.classList.add(CREATED_LIVE_OBJECT_PUBLISH_PULSE_CLASS);
  cardEl.addEventListener(
    "animationend",
    () => cardEl.classList.remove(CREATED_LIVE_OBJECT_PUBLISH_PULSE_CLASS),
    { once: true }
  );
}
