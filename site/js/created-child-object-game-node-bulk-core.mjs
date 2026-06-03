import {
  bulkRegisterProgressLabel,
  parseBulkTemplateLabel,
  pendingBulkTemplateRows,
} from "./city-game-season-template-core.mjs";

export {
  annotateTemplateRegistrationState,
  bulkRegisterProgressLabel,
  defaultObjectIdForSeasonNode,
  enrichTemplateRow,
  parseBulkTemplateLabel,
  pendingBulkTemplateRows,
  resolveSeasonTemplateRows,
  STARTER_S1_NODE_TEMPLATE,
} from "./city-game-season-template-core.mjs";

/**
 * @param {Array<{ node_id: string; label: string; registered?: boolean }>} editorRows
 * @param {Array<{ node_id: string; label: string; registered?: boolean; selected?: boolean }>} templateRows
 */
export function mergeBulkEditorRows(templateRows, editorRows) {
  const byId = new Map(editorRows.map((row) => [row.node_id, row]));
  return templateRows.map((row) => {
    const edited = byId.get(row.node_id);
    return {
      ...row,
      label: edited?.label ?? row.label,
      selected: edited?.selected ?? !row.registered,
    };
  });
}

/**
 * @param {Array<{ node_id: string; label: string; registered?: boolean; selected?: boolean }>} rows
 */
export function summarizeBulkTemplateRows(rows) {
  const total = rows.length;
  const registered = rows.filter((row) => row.registered).length;
  const pending = pendingBulkTemplateRows(rows).length;
  return { total, registered, pending };
}
