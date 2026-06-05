/**
 * Focus routing for /created/?deploy_success=1 after root_and_child deploy.
 */

import {
  DEPLOY_ENDPOINT_PARAM,
  DEPLOY_ENDPOINT_SECTION_IDS,
  DEPLOY_OBJECT_ID_PARAM,
  DEPLOY_SUCCESS_PARAM,
  deployEndpointTypeFromParams,
  deploySuccessHubSubcopy,
  deploySuccessHubSummaryTitle,
  deploySuccessObjectIdFromParams,
  deployEndpointScanFocusTarget,
  isDeploySuccessLanding,
  readDeploySuccessPresentationState,
  writeDeploySuccessPresentationState,
} from "./created-deploy-success-focus-core.mjs";
import { childObjectHubFocusHash } from "./hub-child-object-row-core.mjs";

/**
 * Hide add-object form chrome for the minted endpoint type (list row stays visible).
 * @param {"status_plate" | "lost_item_relay"} endpointType
 */
export function suppressDeploySuccessAddChrome(endpointType) {
  const sectionId = DEPLOY_ENDPOINT_SECTION_IDS[endpointType];
  const section = sectionId ? document.getElementById(sectionId) : null;
  if (!(section instanceof HTMLElement)) return;
  section.hidden = false;
  for (const el of section.querySelectorAll("[data-child-object-add-chrome]")) {
    if (el instanceof HTMLElement) el.hidden = true;
  }
}

/**
 * @param {"status_plate" | "lost_item_relay"} endpointType
 */
export function syncDeploySuccessHubPresentation(endpointType) {
  const hub = document.getElementById("child-object-add-hub");
  if (hub instanceof HTMLDetailsElement) {
    hub.hidden = false;
    hub.open = true;
  }
  const summary = hub?.querySelector(".created-child-object-add-hub-summary");
  if (summary instanceof HTMLElement) {
    summary.textContent = deploySuccessHubSummaryTitle(endpointType);
  }
  const sub = document.getElementById("child-object-add-hub-sub");
  if (sub instanceof HTMLElement) {
    sub.textContent = deploySuccessHubSubcopy(endpointType);
  }
  document.body.dataset.createdDeploySuccess = endpointType;
}

/** Re-apply hub + add-form suppression after child-object refresh/sync. */
export function reapplyDeploySuccessPresentationChrome() {
  const state = readDeploySuccessPresentationState();
  if (!state?.endpointType) {
    document.body.removeAttribute("data-created-deploy-success");
    return false;
  }
  suppressDeploySuccessAddChrome(state.endpointType);
  syncDeploySuccessHubPresentation(state.endpointType);
  return true;
}

/**
 * @param {string} objectId
 */
function scrollDeploySuccessEndpointIntoView(objectId) {
  const row = document.querySelector(`[data-object-id="${CSS.escape(objectId)}"]`);
  if (!(row instanceof HTMLElement)) return false;
  const list = row.closest("ul");
  if (list instanceof HTMLElement) list.hidden = false;
  const target = deployEndpointScanFocusTarget(row);
  (target instanceof HTMLElement ? target : row).scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
  row.classList.add("child-object-endpoint-row--deploy-focus");
  window.setTimeout(() => {
    row.classList.remove("child-object-endpoint-row--deploy-focus");
  }, 2400);
  return true;
}

/**
 * @param {string} objectId
 * @param {number} [attempt]
 */
function tryScrollDeploySuccessEndpoint(objectId, attempt = 0) {
  if (scrollDeploySuccessEndpointIntoView(objectId)) return;
  if (attempt < 10) window.setTimeout(() => tryScrollDeploySuccessEndpoint(objectId, attempt + 1), 200);
}

/**
 * @param {(tabId: string) => void} select
 * @param {URLSearchParams} [searchParams]
 * @param {{
 *   hash?: string;
 *   refreshEndpoints?: () => void | Promise<void>;
 *   profileId?: string | null;
 * }} [opts]
 */
export function applyDeploySuccessFocus(select, searchParams, opts = {}) {
  const params = searchParams ?? new URLSearchParams(location.search);
  if (!isDeploySuccessLanding(params)) return false;

  const objectId = deploySuccessObjectIdFromParams(params);
  const endpointType = deployEndpointTypeFromParams(params);
  if (!objectId || !endpointType) return false;

  const profileId = opts.profileId?.trim() || params.get("profile_id")?.trim() || undefined;
  writeDeploySuccessPresentationState({ profileId, objectId, endpointType });

  select("now");
  suppressDeploySuccessAddChrome(endpointType);
  syncDeploySuccessHubPresentation(endpointType);

  void Promise.resolve(opts.refreshEndpoints?.()).then(() => {
    reapplyDeploySuccessPresentationChrome();
    tryScrollDeploySuccessEndpoint(objectId);
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => tryScrollDeploySuccessEndpoint(objectId));
  });

  const url = new URL(location.href);
  let changed = false;
  for (const key of [DEPLOY_SUCCESS_PARAM, DEPLOY_ENDPOINT_PARAM, DEPLOY_OBJECT_ID_PARAM]) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed) {
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  const expectedHash = childObjectHubFocusHash(objectId);
  if (location.hash.replace(/^#/, "") !== expectedHash) {
    history.replaceState(null, "", `${location.pathname}${location.search}#${expectedHash}`);
  }

  return true;
}
