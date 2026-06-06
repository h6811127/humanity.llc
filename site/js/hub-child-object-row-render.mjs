/**
 * DOM builders for hub nested child rows and /created/ collection rows.
 */

import { childObjectRowRenderSignature } from "./hub-child-object-patch-core.mjs";
import {
  hubChildObjectIconHtml,
  hubChildObjectIdentityLine,
  hubChildObjectRootHandle,
  hubChildObjectSearchHaystack,
  hubChildObjectStatusLine,
  hubChildObjectTitle,
  hubChildObjectTypeMeta,
} from "./hub-child-object-row-core.mjs";
import { escapeHubRowHtml, hubChildObjectRowInnerHtml } from "./hub-child-object-row-render-core.mjs";
import { collectionRowIdentityLabel } from "./created-collection-core.mjs";
import { createdTagsCollectionRowIdentity } from "./created-tags-collection-core.mjs";
import { buildStewardScanPreviewHrefFromWindow } from "./pwa-scan-handoff.mjs";
import { stewardScanLinkHtmlAttrs } from "./pwa-scan-handoff-core.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";

/**
 * @param {Record<string, unknown>} parentEntry
 * @param {Record<string, unknown>} childRow
 * @param {{ fullRows: boolean, expandedRows: boolean, objectLeading?: boolean, escapeHtml?: (s: string) => string, stewardScanHref?: (url: string) => string, stewardScanAnchorAttrs?: () => string }} ctx
 */
export function buildHubChildObjectRowElement(parentEntry, childRow, ctx) {
  const escapeHtml = ctx.escapeHtml ?? escapeHubRowHtml;
  const stewardScanHref = ctx.stewardScanHref ?? buildStewardScanPreviewHrefFromWindow;
  const stewardScanAnchorAttrs =
    ctx.stewardScanAnchorAttrs ??
    (() => stewardScanLinkHtmlAttrs(readStandaloneModeFromWindow(window)));

  const meta = hubChildObjectTypeMeta(childRow.object_type);
  const identity = hubChildObjectIdentityLine({
    objectTypeLabel: meta.label,
    rootHandle: hubChildObjectRootHandle(parentEntry),
  });
  const scanUrl = typeof childRow.scan_url === "string" ? childRow.scan_url : "";
  const status = hubChildObjectStatusLine({
    publicState: childRow.public_state,
    scanUrl,
    status: childRow.status,
  });
  const li = document.createElement("li");
  const layoutClass = ctx.objectLeading ? "hub-card-item--leading-object" : "hub-card-item--nested";
  li.className = `hub-card-item ${layoutClass} hub-card-item--${meta.tone}${
    ctx.fullRows ? "" : " hub-card-item--summary"
  }`;
  li.dataset.hubSearchable = hubChildObjectSearchHaystack(parentEntry, childRow);
  li.dataset.parentProfileId = String(parentEntry.profile_id ?? "");
  li.dataset.objectId = String(childRow.object_id ?? "");
  li.dataset.childObjectId = String(childRow.object_id ?? "");
  if (!ctx.fullRows) li.dataset.summaryRow = "1";

  const actionData = `data-profile-id="${escapeHtml(String(parentEntry.profile_id ?? ""))}" data-child-object-id="${escapeHtml(String(childRow.object_id ?? ""))}"`;
  const scanAction = scanUrl
    ? `<a class="hub-card-action hub-open-scan" href="${escapeHtml(stewardScanHref(scanUrl))}"${stewardScanAnchorAttrs()}>Open scan</a>`
    : "";
  const actionsHtml =
    ctx.fullRows || ctx.expandedRows
      ? `<div class="hub-card-actions">
        <div class="hub-card-actions-primary">
          <button type="button" class="hub-card-action hub-child-manage" ${actionData}>${escapeHtml(meta.manageLabel)}</button>
          ${scanAction}
        </div>
      </div>`
      : "";

  li.innerHTML = hubChildObjectRowInnerHtml({
    title: hubChildObjectTitle(childRow),
    identity,
    statusLabel: status.label,
    statusTone: status.tone,
    actionsHtml,
    iconHtml: hubChildObjectIconHtml(),
  });
  li.dataset.childRenderSig = childObjectRowRenderSignature(childRow);
  return li;
}

/**
 * Tappable read-only row for /created/ Collection shelf.
 *
 * @param {Record<string, unknown>} childRow
 * @param {{ activeRoom?: string | null }} [ctx]
 */
export function buildCreatedCollectionRowElement(childRow, ctx = {}) {
  const objectType = typeof childRow.object_type === "string" ? childRow.object_type : "";
  const meta = hubChildObjectTypeMeta(objectType);
  const scanUrl = typeof childRow.scan_url === "string" ? childRow.scan_url : "";
  const status = hubChildObjectStatusLine({
    publicState: childRow.public_state,
    scanUrl,
    status: childRow.status,
  });
  const identity = collectionRowIdentityLabel(childRow, ctx.activeRoom);

  const li = document.createElement("li");
  li.className = `hub-card-item hub-card-item--${meta.tone} created-collection-row`;
  li.dataset.objectId = String(childRow.object_id ?? "");
  li.dataset.objectType = objectType;
  li.tabIndex = 0;
  li.setAttribute("role", "button");

  li.innerHTML = hubChildObjectRowInnerHtml({
    title: hubChildObjectTitle(childRow),
    identity,
    statusLabel: status.label,
    statusTone: status.tone,
    iconHtml: hubChildObjectIconHtml(),
  });
  li.dataset.childRenderSig = childObjectRowRenderSignature(childRow);
  return li;
}

/**
 * Read-only or tappable row for /created/ Attached QRs (tags collection).
 *
 * @param {Record<string, unknown>} childRow
 * @param {{ rootHandle?: string | null; interactive?: boolean }} [ctx]
 */
export function buildCreatedTagsCollectionRowElement(childRow, ctx = {}) {
  const objectType = typeof childRow.object_type === "string" ? childRow.object_type : "";
  const meta = hubChildObjectTypeMeta(objectType);
  const scanUrl = typeof childRow.scan_url === "string" ? childRow.scan_url : "";
  const status = hubChildObjectStatusLine({
    publicState: childRow.public_state,
    scanUrl,
    status: childRow.status,
  });
  const identity = createdTagsCollectionRowIdentity(objectType, ctx.rootHandle);

  const li = document.createElement("li");
  li.className = `hub-card-item hub-card-item--${meta.tone} created-tags-collection-row`;
  li.dataset.objectId = String(childRow.object_id ?? "");
  li.dataset.objectType = objectType;

  const interactive = ctx.interactive === true;
  if (interactive) {
    li.classList.add("created-tags-collection-row--interactive");
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    li.setAttribute("aria-haspopup", "dialog");
    li.setAttribute("aria-controls", "created-tags-manage-panel");
  } else {
    li.setAttribute("aria-readonly", "true");
  }

  li.innerHTML = hubChildObjectRowInnerHtml({
    title: hubChildObjectTitle(childRow),
    identity,
    statusLabel: status.label,
    statusTone: status.tone,
    iconHtml: hubChildObjectIconHtml(),
  });
  li.dataset.childRenderSig = childObjectRowRenderSignature(childRow);
  return li;
}
