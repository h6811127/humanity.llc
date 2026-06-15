/**
 * Deploy-intent create wizard (step 12).
 * @see docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md § Step 12
 */

import {
  createdAddObjectFocus,
  createdAddObjectHref,
  generalRootDisplayLabel,
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
/** @typedef {"status_plate" | "lost_item_relay"} DeployObjectTemplate */

/**
 * First step for Simple Object Create: choose what the QR is attached to.
 * @type {ReadonlyArray<{
 *   template: DeployObjectTemplate;
 *   title: string;
 *   sub: string;
 * }>}
 */
export const DEPLOY_OBJECT_TYPE_OPTIONS = [
  {
    template: "status_plate",
    title: "QR sign",
    sub: "For a door, desk, shelf, booth, or place with status people should read.",
  },
  {
    template: "lost_item_relay",
    title: "Return tag",
    sub: "For keys, bags, tools, or gear where finders can send a message.",
  },
];

/**
 * @param {string | null | undefined} template
 * @returns {DeployObjectTemplate}
 */
export function normalizeDeployObjectTemplate(template) {
  return template === "lost_item_relay" ? "lost_item_relay" : "status_plate";
}

/**
 * @param {string | null | undefined} template
 */
export function deployObjectTypeOptionByTemplate(template) {
  const normalized = normalizeDeployObjectTemplate(template);
  return (
    DEPLOY_OBJECT_TYPE_OPTIONS.find((option) => option.template === normalized) ??
    DEPLOY_OBJECT_TYPE_OPTIONS[0]
  );
}

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
  if (!normalized) return "What scanners see";
  return `What scanners see · @${normalized}`;
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
  const { searchParams, template, walletEntries, gateBypass = false } = ctx;
  const isPilot = template === "status_plate" || template === "lost_item_relay";
  if (!isDeployWizardIntent(searchParams) || !isPilot) {
    return "standard";
  }
  if (gateBypass) {
    return "root_and_child";
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
 * @param {Record<string, unknown> | null | undefined} [preferredRoot]
 */
export function deploySubmitButtonLabel(template, strategy, preferredRoot) {
  const handle =
    preferredRoot && typeof preferredRoot === "object"
      ? generalRootDisplayLabel(preferredRoot)
      : "";
  if (strategy === "redirect_live") {
    if (template === "lost_item_relay") {
      return handle ? `Open ${handle} to add return tag` : "Open Live to add return tag";
    }
    return handle ? `Open ${handle} to add sign` : "Open Live to add sign";
  }
  if (strategy === "root_and_child") {
    return "Create sign & QR";
  }
  return null;
}
