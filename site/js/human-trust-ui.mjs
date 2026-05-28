/**
 * Browser UI helpers for human verification labels (V-001 / M6).
 * Keep icon tones aligned with worker/src/resolver/verification-display.ts.
 */

const SHIELD_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

const PEOPLE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

/**
 * @param {{ label?: string | null, subtitle?: string | null, state?: string | null }} ht
 * @returns {{ toneClass: string, svg: string }}
 */
export function humanTrustIconMeta(ht) {
  const label = ht?.label ?? "";
  const state = ht?.state ?? "";
  const subtitle = ht?.subtitle ?? "";

  if (label === "Steward" || state === "steward") {
    return { toneClass: "list-icon-tone-green", svg: SHIELD_SVG };
  }
  if (
    label === "Vouched Human" ||
    state === "verified_human" ||
    label === "Ceremony-Vouched Human"
  ) {
    return { toneClass: "list-icon-tone-trust", svg: SHIELD_SVG };
  }
  if (subtitle.includes(" of 3 vouches") || subtitle.includes(" of 3 ")) {
    return { toneClass: "list-icon-tone-purple", svg: PEOPLE_SVG };
  }
  if (label === "Suspended" || state === "suspended") {
    return { toneClass: "list-icon-tone-orange", svg: SHIELD_SVG };
  }
  if (label === "Verification revoked" || state === "revoked") {
    return { toneClass: "list-icon-tone-red", svg: SHIELD_SVG };
  }
  return { toneClass: "list-icon-tone-blue", svg: PEOPLE_SVG };
}

/**
 * @param {HTMLElement | null} iconEl container with class list-icon
 * @param {{ label?: string | null, subtitle?: string | null, state?: string | null }} ht
 */
export function applyHumanTrustIconToElement(iconEl, ht) {
  if (!iconEl) return;
  const { toneClass, svg } = humanTrustIconMeta(ht);
  iconEl.className = `list-icon ${toneClass}`;
  iconEl.innerHTML = svg;
}

/**
 * Wallet / hub pill for verification (separate from card/QR network chip).
 * @param {{ label?: string | null, state?: string | null }} input
 * @returns {{ label: string, tone: string }}
 */
export function verificationTrustChip(input) {
  const label = input?.label ?? "";
  const state = input?.state ?? "";

  if (state === "steward" || label === "Steward") {
    return { label: "Steward", tone: "steward" };
  }
  if (state === "verified_human" || label === "Vouched Human") {
    return { label: "Vouched Human", tone: "vouched" };
  }
  if (state === "suspended" || label === "Suspended") {
    return { label: "Suspended", tone: "warn" };
  }
  if (state === "revoked" || label === "Verification revoked") {
    return { label: "Revoked", tone: "warn" };
  }
  if (label && label !== "Registered" && label !== "Unknown") {
    return { label, tone: "muted" };
  }
  return { label: "Registered", tone: "muted" };
}

/** @param {string | null | undefined} state */
export function isEligibleVoucherState(state) {
  return state === "verified_human" || state === "steward";
}
