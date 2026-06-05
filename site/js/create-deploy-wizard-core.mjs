/**
 * Deploy-intent create wizard (step 12).
 * @see docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md § Step 12
 */

import {
  createdAddObjectFocus,
  createdAddObjectHref,
  listGeneralRootsWithKeys,
  pickPreferredGeneralRoot,
} from "./create-flow-convergence-core.mjs";
import {
  CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
  CHILD_OBJECT_TYPE_STATUS_PLATE,
  parseLostItemRelayChildFields,
  parseStatusPlateChildFields,
} from "./created-child-object-core.mjs";

/** @typedef {"standard" | "redirect_live" | "root_and_child"} DeploySubmitStrategy */

/**
 * @param {URLSearchParams} searchParams
 */
export function isDeployWizardIntent(searchParams) {
  if (searchParams.get("intent") === "deploy") return true;
  const template = searchParams.get("template");
  return template === "status_plate" || template === "lost_item";
}

/**
 * Launch door 1 deploy room (`?intent=deploy`) — hide cross-room create UI.
 * Field-kit deep links (`?template=`) stay on the legacy convergence path.
 * @param {URLSearchParams} searchParams
 */
export function isDeployRoomCreateIntent(searchParams) {
  return searchParams.get("intent") === "deploy";
}

/**
 * Room entry (`?intent=deploy|wear|game`) — hide shared taxonomy / cross-room blocks.
 * @param {URLSearchParams} searchParams
 */
export function isCreateRoomIsolatedIntent(searchParams) {
  const intent = searchParams.get("intent");
  return intent === "deploy" || intent === "wear" || intent === "game" || intent === "general";
}

/**
 * @param {string} handle
 */
export function generalRootManifestoForDeploy(handle) {
  const normalized = String(handle || "").trim().replace(/^@/, "");
  if (!normalized) return "Live objects on the network";
  return `Live objects · @${normalized}`;
}

/**
 * @param {string} template
 */
export function childObjectTypeForDeployTemplate(template) {
  if (template === "lost_item_relay") return CHILD_OBJECT_TYPE_LOST_ITEM_RELAY;
  return CHILD_OBJECT_TYPE_STATUS_PLATE;
}

/**
 * @param {string} template
 * @param {{ objectLabel: string, statusLine: string, relayItem: string, relayMessage: string }} fields
 */
export function parseDeployChildFields(template, fields) {
  if (template === "lost_item_relay") {
    return parseLostItemRelayChildFields(fields.relayItem, fields.relayMessage);
  }
  return parseStatusPlateChildFields(fields.objectLabel, fields.statusLine);
}

/**
 * @param {{
 *   searchParams: URLSearchParams;
 *   template: string;
 *   walletEntries: unknown[];
 * }} ctx
 * @returns {DeploySubmitStrategy}
 */
export function resolveDeploySubmitStrategy(ctx) {
  const { searchParams, template, walletEntries } = ctx;
  const isPilot = template === "status_plate" || template === "lost_item_relay";
  if (!isDeployWizardIntent(searchParams) || !isPilot) {
    return "standard";
  }
  const preferredRoot = pickPreferredGeneralRoot(listGeneralRootsWithKeys(walletEntries));
  if (preferredRoot) {
    return "redirect_live";
  }
  return "root_and_child";
}

/**
 * @param {Record<string, unknown>} rootEntry
 * @param {string} template
 * @param {string} [origin]
 */
export function createdLiveAddObjectHref(rootEntry, template, origin = "https://humanity.llc") {
  return createdAddObjectHref(rootEntry, template, origin);
}

/**
 * @param {string} template
 */
export function deployCreatedFocusHash(template) {
  return createdAddObjectFocus(template) || "";
}

/**
 * @param {string} template
 * @param {DeploySubmitStrategy} strategy
 */
export function deploySubmitButtonLabel(template, strategy) {
  if (strategy === "redirect_live") {
    return "Continue on Live";
  }
  if (strategy === "root_and_child") {
    return "Deploy object & QR";
  }
  return null;
}
