/**
 * Focus routing for /created/?deploy_success=1 after root_and_child deploy.
 */

import {
  DEPLOY_ENDPOINT_PARAM,
  DEPLOY_ENDPOINT_SECTION_IDS,
  DEPLOY_OBJECT_ID_PARAM,
  DEPLOY_SUCCESS_PARAM,
  deployEndpointTypeFromParams,
  deploySuccessObjectIdFromParams,
  deployEndpointScanFocusTarget,
  isDeploySuccessLanding,
} from "./created-deploy-success-focus-core.mjs";
import { childObjectHubFocusHash } from "./hub-child-object-row-core.mjs";

/**
 * @param {(tabId: string) => void} select
 * @param {URLSearchParams} [searchParams]
 * @param {{
 *   hash?: string;
 *   refreshEndpoints?: () => void | Promise<void>;
 * }} [opts]
 */
export function applyDeploySuccessFocus(select, searchParams, opts = {}) {
  const params = searchParams ?? new URLSearchParams(location.search);
  if (!isDeploySuccessLanding(params)) return false;

  const objectId = deploySuccessObjectIdFromParams(params);
  const endpointType = deployEndpointTypeFromParams(params);
  if (!objectId || !endpointType) return false;

  select("now");
  void opts.refreshEndpoints?.();

  const sectionId = DEPLOY_ENDPOINT_SECTION_IDS[endpointType];
  const section = sectionId ? document.getElementById(sectionId) : null;
  if (section instanceof HTMLElement) {
    section.hidden = false;
    for (const el of section.querySelectorAll("[data-child-object-add-chrome]")) {
      if (el instanceof HTMLElement) el.hidden = true;
    }
  }

  const hub = document.getElementById("child-object-add-hub");
  if (hub instanceof HTMLDetailsElement) {
    hub.hidden = false;
    hub.open = true;
  }

  const scrollToRow = () => {
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
  };

  const tryScroll = (attempt = 0) => {
    if (scrollToRow()) return;
    if (attempt < 10) window.setTimeout(() => tryScroll(attempt + 1), 200);
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => tryScroll());
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
