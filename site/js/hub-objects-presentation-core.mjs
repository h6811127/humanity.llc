/**
 * Hub “My objects” presentation (PRODUCT_POSITIONING step 13).
 * Object rows lead; account/@handle de-emphasized; game seasons collapsed by default.
 * @see docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md § Step 13
 * @see docs/ROOT_CARD_AND_CHILD_OBJECTS.md § Product UX presentation (step 19b)
 */

import { verificationTrustChip } from "./human-trust-ui.mjs";
import {
  hubCardTitle,
  isMeaningfulHubVerificationChip,
} from "./device-hub-card-row-core.mjs";
import {
  hubChildObjectRootHandle,
  isGeneralRootWalletEntry,
} from "./hub-child-object-row-core.mjs";

/** @typedef {"card" | "account_line"} HubRootPresentationMode */

/**
 * @param {Array<Record<string, unknown>>} entries
 */
export function countGeneralRootWalletEntries(entries) {
  return entries.filter((entry) => isGeneralRootWalletEntry(entry)).length;
}

/**
 * Object-first group when a general root has deployed child objects.
 * @param {Record<string, unknown>} entry
 * @param {number} childRowCount
 */
export function shouldUseObjectFirstHubGroup(entry, childRowCount) {
  return isGeneralRootWalletEntry(entry) && childRowCount > 0;
}

/**
 * @param {Record<string, unknown>} entry
 * @param {number} childRowCount
 * @returns {HubRootPresentationMode}
 */
export function hubRootPresentationMode(entry, childRowCount) {
  return shouldUseObjectFirstHubGroup(entry, childRowCount) ? "account_line" : "card";
}

/**
 * Compact account row title — custom label or neutral “Your account”, not bare @handle.
 * @param {Record<string, unknown>} entry
 */
export function hubAccountLineTitle(entry) {
  const label = String(entry?.label || "").trim();
  const rawHandle = entry?.handle ? String(entry.handle).replace(/^@/, "").trim() : "";
  const handleNorm = rawHandle.toLowerCase();
  const labelNorm = label.replace(/^@/, "").toLowerCase();

  if (label && handleNorm && labelNorm && labelNorm !== handleNorm) {
    return label;
  }
  if (label && !label.startsWith("@")) {
    return label;
  }
  return "Your account";
}

/**
 * @param {{
 *   entry: Record<string, unknown>,
 *   verificationLabel?: string | null,
 *   verificationState?: string | null,
 *   includeVerification?: boolean,
 * }} ctx
 */
export function hubAccountLineIdentity(ctx) {
  const handle = hubChildObjectRootHandle(ctx.entry);
  /** @type {string[]} */
  const parts = ["Account"];
  if (handle) parts.push(handle);
  let verifyTone = "muted";
  if (ctx.includeVerification !== false) {
    const chip = verificationTrustChip({
      label: ctx.verificationLabel,
      state: ctx.verificationState,
    });
    if (isMeaningfulHubVerificationChip(chip)) {
      parts.push(chip.label);
      verifyTone = chip.tone;
    }
  }
  const text = parts.join(" · ");
  return { text, verifyTone, visible: text.length > 0 };
}

/**
 * Root card row title — unchanged for flat pilots and roots without children.
 * @param {Record<string, unknown>} entry
 * @param {number} childRowCount
 */
export function hubRootRowTitle(entry, childRowCount) {
  if (hubRootPresentationMode(entry, childRowCount) === "account_line") {
    return hubAccountLineTitle(entry);
  }
  return hubCardTitle(entry);
}

/**
 * @param {URLSearchParams | string} search
 * @param {string} [hash]
 */
export function hasExplicitGameSeasonContext(search, hash = "") {
  const params =
    search instanceof URLSearchParams ? search : new URLSearchParams(String(search || ""));
  const focus = params.get("focus") || "";
  if (focus === "game-season-setup" || focus === "game") return true;
  if (params.get("season_id")) return true;
  const bareHash = String(hash || "").replace(/^#/, "");
  return bareHash === "game-season-setup";
}

/**
 * Game season / collection limits stay collapsed until multi-root or explicit season context.
 * @param {{
 *   generalRootCount: number,
 *   explicitSeasonContext?: boolean,
 *   hasGameSeasonContent?: boolean,
 *   multiSeasonHint?: boolean,
 * }} ctx
 */
export function shouldExpandHostedGameSeasonPanel(ctx) {
  if (!ctx.hasGameSeasonContent && !ctx.multiSeasonHint) return false;
  if (ctx.multiSeasonHint) return true;
  if (ctx.explicitSeasonContext) return true;
  return ctx.generalRootCount > 1;
}

