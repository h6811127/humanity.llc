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
