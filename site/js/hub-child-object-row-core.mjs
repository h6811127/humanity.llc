/**
 * Hub nested child-object row copy (pure helpers).
 * @see docs/HUB_CARD_ROW_UX.md Phase 6 · docs/ROOT_CARD_AND_CHILD_OBJECTS.md
 */

import { inferPilotTemplate } from "./manifesto-display.mjs";
import { readChildObjectRows } from "./child-object-store-core.mjs";
import { hubCardTitle } from "./device-hub-card-row-core.mjs";

export const CHILD_OBJECT_TYPE_STATUS_PLATE = "status_plate";
export const CHILD_OBJECT_TYPE_LOST_ITEM_RELAY = "lost_item_relay";
export const CHILD_OBJECT_STATUS_DISABLED = "disabled";

export const CHILD_OBJECT_HUB_FOCUS_PREFIX = "child-object-";

/**
 * @param {string} objectId
 */
export function childObjectHubFocusHash(objectId) {
  return `${CHILD_OBJECT_HUB_FOCUS_PREFIX}${objectId}`;
}

/**
 * @param {string} [hash] location.hash or bare key
 */
export function childObjectIdFromHubFocusHash(hash = "") {
  const key = String(hash).replace(/^#/, "");
  if (!key.startsWith(CHILD_OBJECT_HUB_FOCUS_PREFIX)) return null;
  const objectId = key.slice(CHILD_OBJECT_HUB_FOCUS_PREFIX.length);
  return objectId || null;
}

const OBJECT_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>';

/**
 * @param {Record<string, unknown> | null | undefined} entry
 */
export function isGeneralRootWalletEntry(entry) {
  const explicit = typeof entry?.pilot_template === "string" ? entry.pilot_template.trim() : "";
  const pilot =
    explicit ||
    (typeof entry?.manifesto_line === "string"
      ? inferPilotTemplate(String(entry.manifesto_line))
      : "general");
  return pilot === "general";
}

/**
 * @param {boolean} fullRows
 * @param {boolean} previewRows
 */
export function shouldRenderHubChildObjectRows(fullRows, previewRows) {
  return fullRows || !previewRows;
}

/**
 * @param {unknown} objectType
 */
export function hubChildObjectTypeMeta(objectType) {
  const type = typeof objectType === "string" ? objectType.trim() : "";
  if (type === CHILD_OBJECT_TYPE_STATUS_PLATE) {
    return { label: "Status plate", tone: "status-plate", manageLabel: "Update status" };
  }
  if (type === CHILD_OBJECT_TYPE_LOST_ITEM_RELAY) {
    return { label: "Lost item", tone: "lost-item", manageLabel: "Update message" };
  }
  return { label: "Object", tone: "general", manageLabel: "Manage on card" };
}

/**
 * @param {Record<string, unknown> | null | undefined} entry
 */
export function hubChildObjectRootHandle(entry) {
  const rawHandle = entry?.handle ? String(entry.handle).replace(/^@/, "").trim() : "";
  if (rawHandle) return `@${rawHandle}`;
  const title = hubCardTitle(entry ?? {});
  if (title.startsWith("@")) return title;
  const profileId = typeof entry?.profile_id === "string" ? entry.profile_id : "";
  return profileId ? `${profileId.slice(0, 12)}…` : "this root";
}

/**
 * @param {{ objectTypeLabel: string, rootHandle: string }} ctx
 */
export function hubChildObjectIdentityLine(ctx) {
  return `${ctx.objectTypeLabel} · under ${ctx.rootHandle}`;
}

/**
 * @param {{
 *   publicState?: string | null,
 *   scanUrl?: string | null,
 *   status?: string | null,
 * }} ctx
 * @returns {{ label: string, tone: 'ok' | 'warn' | 'muted' }}
 */
export function hubChildObjectStatusLine(ctx) {
  const status = typeof ctx.status === "string" ? ctx.status.trim() : "";
  const publicState = typeof ctx.publicState === "string" ? ctx.publicState.trim() : "";
  const scanUrl = typeof ctx.scanUrl === "string" ? ctx.scanUrl.trim() : "";

  if (status === CHILD_OBJECT_STATUS_DISABLED || status === "revoked") {
    return { label: "Disabled on network", tone: "warn" };
  }
  if (publicState && scanUrl) {
    return { label: publicState, tone: "ok" };
  }
  if (publicState) {
    return { label: `${publicState} · No scan link yet`, tone: "muted" };
  }
  if (scanUrl) {
    return { label: "Scan link ready", tone: "ok" };
  }
  return { label: "Not published yet", tone: "muted" };
}

/**
 * @param {Record<string, unknown>} childRow
 */
export function hubChildObjectTitle(childRow) {
  const label = typeof childRow.public_label === "string" ? childRow.public_label.trim() : "";
  return label || "Child object";
}

/**
 * @param {Record<string, unknown>} parentEntry
 * @param {Record<string, unknown>} childRow
 */
export function hubChildObjectSearchHaystack(parentEntry, childRow) {
  const meta = hubChildObjectTypeMeta(childRow.object_type);
  return [
    hubChildObjectTitle(childRow),
    meta.label,
    hubChildObjectRootHandle(parentEntry),
    hubCardTitle(parentEntry),
    parentEntry.profile_id,
    childRow.object_id,
    childRow.public_state,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * @param {Pick<Storage, "getItem">} storage
 * @param {string} profileId
 */
export function listHubChildObjectsForDisplay(storage, profileId) {
  return readChildObjectRows(storage, profileId).filter(
    (row) => row.status !== "revoked" && row.status !== CHILD_OBJECT_STATUS_DISABLED
  );
}

export function hubChildObjectIconHtml() {
  return `<span class="list-icon list-icon-tone-slate" aria-hidden="true">${OBJECT_ICON_SVG}</span>`;
}
