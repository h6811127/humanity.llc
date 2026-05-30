/**
 * Pure helpers for incremental hub child-object row updates (RC-16).
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md
 */

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
