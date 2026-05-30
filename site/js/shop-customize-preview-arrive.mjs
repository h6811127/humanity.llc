/**
 * Customize preview object-forming Settle (Register A).
 * @see docs/MERCH_VISUAL_CHOREOGRAPHY.md § Beat 3
 */
import {
  CUSTOMIZE_PREVIEW_ARRIVE_VISIBLE_CLASS,
  CUSTOMIZE_PREVIEW_MIN_FORMING_MS,
  CUSTOMIZE_PREVIEW_PENDING_CLASS,
  CUSTOMIZE_PREVIEW_ROW_STAGGER_MS,
  CUSTOMIZE_PREVIEW_SETTLED_CLASS,
  CUSTOMIZE_PREVIEW_VESSEL_PULSE_CLASS,
} from "./shop-customize-preview-arrive-core.mjs";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * @param {HTMLElement | null | undefined} mockEl
 */
function previewArriveScope(mockEl) {
  return mockEl?.closest(".shop-customize-preview-wrap") ?? mockEl;
}

/**
 * @param {HTMLElement | null | undefined} mockEl
 */
export function resetCustomizePreviewArrive(mockEl) {
  if (!mockEl) return;
  mockEl.classList.remove(
    CUSTOMIZE_PREVIEW_PENDING_CLASS,
    CUSTOMIZE_PREVIEW_SETTLED_CLASS
  );
  const vessel = mockEl.querySelector(".shop-customize-mock__vessel");
  vessel?.classList.remove(CUSTOMIZE_PREVIEW_VESSEL_PULSE_CLASS);
  const scope = previewArriveScope(mockEl);
  for (const el of scope?.querySelectorAll(".shop-customize-arrive-item") ?? []) {
    el.classList.remove(CUSTOMIZE_PREVIEW_ARRIVE_VISIBLE_CLASS);
    el.hidden = true;
  }
}

function revealArriveItem(el, instant) {
  if (!el) return;
  el.hidden = false;
  el.classList.add(CUSTOMIZE_PREVIEW_ARRIVE_VISIBLE_CLASS);
  if (instant) return;
}

/** @param {Element} el */
function isPreviewArriveItemEligible(el) {
  if (el.id === "shop-customize-preview-handle" && !el.textContent?.trim()) return false;
  if (el.id === "shop-customize-preview-manifesto" && !el.textContent?.trim()) return false;
  return true;
}

/**
 * @param {ParentNode | null | undefined} scope
 */
function previewArriveItems(scope) {
  return [...(scope?.querySelectorAll(".shop-customize-arrive-item") ?? [])].filter(
    isPreviewArriveItemEligible
  );
}

function vesselSettlePulse(vessel, instant) {
  if (!vessel || instant) return;
  vessel.classList.add(CUSTOMIZE_PREVIEW_VESSEL_PULSE_CLASS);
  vessel.addEventListener(
    "animationend",
    () => vessel.classList.remove(CUSTOMIZE_PREVIEW_VESSEL_PULSE_CLASS),
    { once: true }
  );
}

/**
 * @param {HTMLElement | null | undefined} mockEl
 * @param {{ instant?: boolean }} [opts]
 */
export function settleCustomizePreviewInstant(mockEl, opts = {}) {
  if (!mockEl) return;
  const instant = opts.instant ?? prefersReducedMotion();
  const vessel = mockEl.querySelector(".shop-customize-mock__vessel");
  const scope = previewArriveScope(mockEl);
  const items = previewArriveItems(scope);

  mockEl.classList.remove(CUSTOMIZE_PREVIEW_PENDING_CLASS);
  mockEl.classList.add(CUSTOMIZE_PREVIEW_SETTLED_CLASS);

  for (const el of items) {
    revealArriveItem(el, true);
  }

  if (vessel) {
    vessel.hidden = false;
  }

  window.dispatchEvent(
    new CustomEvent("hc-shop-customize-preview-settled", {
      detail: { instant: instant || true },
    })
  );
}

/**
 * @param {HTMLElement | null | undefined} mockEl
 */
export async function runCustomizePreviewArrive(mockEl) {
  if (!mockEl) return;

  const reduced = prefersReducedMotion();
  const vessel = mockEl.querySelector(".shop-customize-mock__vessel");
  const scope = previewArriveScope(mockEl);
  const items = previewArriveItems(scope);

  mockEl.classList.remove(CUSTOMIZE_PREVIEW_SETTLED_CLASS);
  mockEl.classList.add(CUSTOMIZE_PREVIEW_PENDING_CLASS);

  for (const el of items) {
    el.classList.remove(CUSTOMIZE_PREVIEW_ARRIVE_VISIBLE_CLASS);
    el.hidden = true;
  }

  if (reduced) {
    settleCustomizePreviewInstant(mockEl, { instant: true });
    return;
  }

  await new Promise((r) => setTimeout(r, CUSTOMIZE_PREVIEW_MIN_FORMING_MS));

  if (vessel) {
    vessel.hidden = false;
  }

  items.forEach((el, i) => {
    window.setTimeout(
      () => revealArriveItem(el, false),
      i * CUSTOMIZE_PREVIEW_ROW_STAGGER_MS
    );
  });

  const staggerEnd = items.length * CUSTOMIZE_PREVIEW_ROW_STAGGER_MS;
  window.setTimeout(() => {
    vesselSettlePulse(vessel, false);
    mockEl.classList.remove(CUSTOMIZE_PREVIEW_PENDING_CLASS);
    mockEl.classList.add(CUSTOMIZE_PREVIEW_SETTLED_CLASS);
    window.dispatchEvent(
      new CustomEvent("hc-shop-customize-preview-settled", {
        detail: { instant: false },
      })
    );
  }, staggerEnd + 40);
}
