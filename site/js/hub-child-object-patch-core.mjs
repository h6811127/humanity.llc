/**
 * Pure helpers for incremental hub child-object row updates (RC-16 · RC-17).
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md
 */
import {
  hubChildObjectStatusLine,
  hubChildObjectTitle,
} from "./hub-child-object-row-core.mjs";

/**
 * @param {Array<{ object_id?: string }>} rows
 */
export function childObjectRowSignature(rows) {
  return rows
    .map((row) => String(row.object_id ?? "").trim())
    .filter(Boolean)
    .sort()
    .join("|");
}

/**
 * @param {string} before
 * @param {string} after
 */
export function childObjectRowsUnchanged(before, after) {
  return before === after;
}

/**
 * Stable signature for in-place child row updates (skip replaceWith when unchanged).
 * @param {Record<string, unknown>} childRow
 */
export function childObjectRowRenderSignature(childRow) {
  const objectId = String(childRow.object_id ?? "").trim();
  const status = hubChildObjectStatusLine({
    publicState: childRow.public_state,
    scanUrl: typeof childRow.scan_url === "string" ? childRow.scan_url : "",
    status: childRow.status,
  });
  return `${objectId}\t${hubChildObjectTitle(childRow)}\t${status.label}\t${status.tone}`;
}

/**
 * @param {string[]} existingIds
 * @param {string[]} nextIds
 */
export function childObjectPatchPlan(existingIds, nextIds) {
  const existing = new Set(existingIds.filter(Boolean));
  const next = new Set(nextIds.filter(Boolean));
  const toRemove = [...existing].filter((id) => !next.has(id));
  const toAdd = [...next].filter((id) => !existing.has(id));
  const toKeep = [...next].filter((id) => existing.has(id));
  return { toRemove, toAdd, toKeep, changed: toRemove.length > 0 || toAdd.length > 0 };
}

/**
 * @param {HTMLElement | null} savedList
 * @param {string} profileId
 */
export function hubChildObjectRowElementsForProfile(savedList, profileId) {
  if (!savedList || !profileId) return [];
  return [
    ...savedList.querySelectorAll(
      `li[data-parent-profile-id="${CSS.escape(profileId)}"][data-child-object-id]`
    ),
  ];
}
