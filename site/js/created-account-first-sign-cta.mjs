/**
 * First-session CTA for general accounts — scroll to sign add (P0.2).
 */

import { mountChildObjectAddHubSections } from "./created-child-object-add-hub.mjs";
import {
  CREATED_ACCOUNT_FIRST_SIGN_CTA_LABEL,
  CONTROL_ACCOUNT_HERO_LEAD,
} from "./created-fresh-presentation-core.mjs";
import { isFirstControlSessionActive } from "./created-first-session-containment-core.mjs";
import {
  STEWARD_ROOM_DOORS,
  writePersistedStewardActiveRoom,
} from "./steward-active-room-core.mjs";

export { CREATED_ACCOUNT_FIRST_SIGN_CTA_LABEL, CONTROL_ACCOUNT_HERO_LEAD };

/**
 * @param {{
 *   mode: string;
 *   outcomeKind: string;
 *   profileId: string | null | undefined;
 *   sessionStorage?: Pick<Storage, "getItem"> | null;
 * }} ctx
 */
export function shouldShowAccountFirstSignCta(ctx) {
  if (ctx.mode !== "control" || ctx.outcomeKind !== "account") return false;
  if (!ctx.profileId) return false;
  return isFirstControlSessionActive(ctx.profileId, ctx.sessionStorage ?? null);
}

/** @type {readonly string[]} */
export const SIGN_ADD_SECTION_IDS = ["child-object-add-hub", "child-object-add-status-plate"];

/**
 * Reveal sign add section inside the hub (hub stays collapsed).
 * @param {string | null | undefined} profileId
 * @returns {HTMLElement | null} Sign add section when focused
 */
export function focusSignAddSection(profileId) {
  mountChildObjectAddHubSections();
  const hub = document.getElementById("child-object-add-hub");
  const section = document.getElementById("child-object-add-status-plate");
  if (profileId) {
    writePersistedStewardActiveRoom(profileId, STEWARD_ROOM_DOORS);
  }
  if (hub instanceof HTMLElement) {
    hub.hidden = false;
    if (hub instanceof HTMLDetailsElement) {
      hub.removeAttribute("open");
    }
  }
  if (section instanceof HTMLElement) {
    section.hidden = false;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return section instanceof HTMLElement ? section : null;
}

/**
 * @param {{
 *   mode: string;
 *   outcomeKind: string;
 *   profileId: string | null | undefined;
 *   sessionStorage?: Pick<Storage, "getItem"> | null;
 * }} ctx
 */
export function syncCreatedAccountFirstSignCta(ctx) {
  const btn = document.getElementById("created-account-first-sign-cta");
  if (!(btn instanceof HTMLButtonElement)) return;
  const show = shouldShowAccountFirstSignCta(ctx);
  btn.hidden = !show;
  if (show) btn.textContent = CREATED_ACCOUNT_FIRST_SIGN_CTA_LABEL;
}

/**
 * @param {() => void} onClick
 */
export function wireCreatedAccountFirstSignCtaClick(onClick) {
  const btn = document.getElementById("created-account-first-sign-cta");
  if (!(btn instanceof HTMLButtonElement) || btn.dataset.wired === "1") return;
  btn.dataset.wired = "1";
  btn.addEventListener("click", onClick);
}
