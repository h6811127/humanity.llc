/**
 * Deploy success landing — focus the endpoint minted by root_and_child create.
 * @see Phase 2 deploy success convergence
 */

import { childObjectHubFocusHash } from "./hub-child-object-row-core.mjs";

export const DEPLOY_SUCCESS_PARAM = "deploy_success";
export const DEPLOY_ENDPOINT_PARAM = "endpoint";
export const DEPLOY_OBJECT_ID_PARAM = "object_id";

/** @typedef {"sign" | "tag"} DeployEndpointOutcomeKind */

/** @type {Record<string, DeployEndpointOutcomeKind>} */
export const DEPLOY_ENDPOINT_OUTCOME = {
  status_plate: "sign",
  lost_item_relay: "tag",
};

/** @type {Record<string, string>} */
export const DEPLOY_ENDPOINT_SECTION_IDS = {
  status_plate: "child-object-add-status-plate",
  lost_item_relay: "child-object-add-lost-item",
};

export const DEPLOY_SUCCESS_PRESENTATION_KEY = "hc_created_deploy_success_v1";

/** @typedef {{ profileId?: string; objectId: string; endpointType: "status_plate" | "lost_item_relay" }} DeploySuccessPresentationState */

/**
 * @param {DeploySuccessPresentationState} state
 * @param {Pick<Storage, "setItem">} [storage]
 */
export function writeDeploySuccessPresentationState(state, storage = sessionStorage) {
  if (!storage || !state?.objectId || !state?.endpointType) return;
  storage.setItem(DEPLOY_SUCCESS_PRESENTATION_KEY, JSON.stringify(state));
}

/**
 * @param {Pick<Storage, "getItem">} [storage]
 * @returns {DeploySuccessPresentationState | null}
 */
export function readDeploySuccessPresentationState(storage = sessionStorage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(DEPLOY_SUCCESS_PRESENTATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const objectId = typeof parsed.objectId === "string" ? parsed.objectId.trim() : "";
    const endpointType = parsed.endpointType;
    if (!objectId) return null;
    if (endpointType !== "status_plate" && endpointType !== "lost_item_relay") return null;
    const profileId =
      typeof parsed.profileId === "string" && parsed.profileId.trim()
        ? parsed.profileId.trim()
        : undefined;
    return { profileId, objectId, endpointType };
  } catch {
    return null;
  }
}

/**
 * @param {Pick<Storage, "removeItem">} [storage]
 */
export function clearDeploySuccessPresentationState(storage = sessionStorage) {
  storage?.removeItem(DEPLOY_SUCCESS_PRESENTATION_KEY);
}

/**
 * @param {import("./steward-child-object-list-policy-core.mjs").ChildObjectListType | string} objectType
 * @param {Pick<Storage, "getItem">} [storage]
 */
export function deploySuccessSuppressesAddForm(objectType, storage = sessionStorage) {
  const state = readDeploySuccessPresentationState(storage);
  return !!state && state.endpointType === objectType;
}

/**
 * @param {"status_plate" | "lost_item_relay"} endpointType
 */
export function deploySuccessHubSummaryTitle(endpointType) {
  if (endpointType === "status_plate") return "Your sign";
  if (endpointType === "lost_item_relay") return "Your tag";
  return "Your endpoint";
}

/**
 * @param {"status_plate" | "lost_item_relay"} endpointType
 */
export function deploySuccessHubSubcopy(endpointType) {
  if (endpointType === "status_plate" || endpointType === "lost_item_relay") {
    return "Print, test scan, or update from here.";
  }
  return "";
}

/**
 * @param {URLSearchParams | string} search
 */
export function isDeploySuccessLanding(search) {
  const params =
    search instanceof URLSearchParams ? search : new URLSearchParams(String(search || ""));
  return params.get(DEPLOY_SUCCESS_PARAM) === "1";
}

/**
 * @param {URLSearchParams | string} search
 * @returns {"status_plate" | "lost_item_relay" | null}
 */
export function deployEndpointTypeFromParams(search) {
  const params =
    search instanceof URLSearchParams ? search : new URLSearchParams(String(search || ""));
  const endpoint = params.get(DEPLOY_ENDPOINT_PARAM)?.trim() || "";
  if (endpoint === "status_plate" || endpoint === "lost_item_relay") return endpoint;
  return null;
}

/**
 * @param {URLSearchParams | string} search
 * @returns {DeployEndpointOutcomeKind | null}
 */
export function deployEndpointOutcomeFromParams(search) {
  const endpointType = deployEndpointTypeFromParams(search);
  if (!endpointType) return null;
  return DEPLOY_ENDPOINT_OUTCOME[endpointType] ?? null;
}

/**
 * @param {URLSearchParams | string} search
 */
export function deploySuccessObjectIdFromParams(search) {
  const params =
    search instanceof URLSearchParams ? search : new URLSearchParams(String(search || ""));
  const objectId = params.get(DEPLOY_OBJECT_ID_PARAM)?.trim() || "";
  return objectId || null;
}

/**
 * @param {{
 *   origin: string;
 *   profileId: string;
 *   qrId?: string | null;
 *   objectId: string;
 *   objectType: "status_plate" | "lost_item_relay";
 * }} input
 */
export function buildDeploySuccessCreatedUrl(input) {
  const url = new URL("/created/", input.origin);
  url.searchParams.set("profile_id", input.profileId);
  if (input.qrId) url.searchParams.set("qr_id", input.qrId);
  url.searchParams.set("fresh", "1");
  url.searchParams.set(DEPLOY_SUCCESS_PARAM, "1");
  url.searchParams.set(DEPLOY_ENDPOINT_PARAM, input.objectType);
  url.searchParams.set(DEPLOY_OBJECT_ID_PARAM, input.objectId);
  url.hash = childObjectHubFocusHash(input.objectId);
  return url.href;
}

/**
 * @param {{
 *   origin: string;
 *   profileId: string;
 *   objectId: string;
 * }} input
 */
export function buildDeployIssueFailedCreatedUrl(input) {
  const url = new URL("/created/", input.origin);
  url.searchParams.set("profile_id", input.profileId);
  url.hash = childObjectHubFocusHash(input.objectId);
  return url.href;
}

/**
 * Scan / test affordances on a child-object list row.
 * @param {ParentNode | null | undefined} row
 */
export function deployEndpointScanFocusTarget(row) {
  if (!row) return null;
  if (!(row instanceof Element)) return null;
  return (
    row.querySelector(".child-object-plate-scan") ||
    row.querySelector(".child-object-relay-scan") ||
    row
  );
}
