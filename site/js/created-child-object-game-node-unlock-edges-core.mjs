/**
 * Phase E — unlock_edges browser editor (self-serve season metadata draft).
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § Phase E · unlock_edges
 */

import { validateNetworkGraph } from "./network-graph-core.mjs";
import { resolveSeasonTemplateRows } from "./city-game-season-template-core.mjs";
import { isActiveGameNodeRow } from "./created-child-object-game-node-core.mjs";

/**
 * @param {Array<Record<string, unknown>>} registeredRows
 * @param {Array<{ node_id: string; label: string; object_id: string }>} templateRows
 */
export function resolveUnlockEdgeNodeOptions(registeredRows, templateRows) {
  const active = registeredRows.filter(isActiveGameNodeRow);
  const byObjectId = new Map(
    active.map((row) => [String(row.object_id ?? "").trim(), row]).filter(([id]) => id)
  );

  /** @type {Array<{ node_id: string; label: string; registered: boolean }>} */
  const options = [];
  for (const template of templateRows) {
    const objectId = String(template.object_id ?? "").trim();
    if (!objectId || !byObjectId.has(objectId)) continue;
    const row = byObjectId.get(objectId);
    options.push({
      node_id: template.node_id,
      label:
        (typeof row?.public_label === "string" && row.public_label.trim()) ||
        template.label ||
        template.node_id,
      registered: true,
    });
  }

  return options.sort((a, b) => a.node_id.localeCompare(b.node_id, undefined, { numeric: true }));
}

/**
 * @param {unknown} edge
 */
export function normalizeUnlockEdgeDraftRow(edge) {
  if (!edge || typeof edge !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (edge);
  const from = String(row.from ?? "").trim();
  const to = String(row.to ?? "").trim();
  if (!from || !to) return null;
  const label = String(row.label ?? "").trim();
  return { from, to, ...(label ? { label } : {}) };
}

/**
 * @param {unknown} edges
 */
export function normalizeUnlockEdgesDraft(edges) {
  if (!Array.isArray(edges)) return [];
  return edges.map(normalizeUnlockEdgeDraftRow).filter(Boolean);
}

/**
 * @param {Array<{ node_id: string; object_id: string }>} templateRows
 * @param {ReturnType<typeof normalizeUnlockEdgesDraft>} unlockEdges
 */
export function validateUnlockEdgesDraft(templateRows, unlockEdges) {
  const nodes = templateRows.map((row) => ({
    node_id: row.node_id,
    object_id: row.object_id,
  }));
  return validateNetworkGraph({ nodes, unlock_edges: unlockEdges });
}

/**
 * @param {Record<string, unknown> | null | undefined} seasonBody
 * @param {string} seasonId
 * @param {unknown} draftEdges
 */
export function resolveUnlockEdgesForEditor(seasonBody, seasonId, draftEdges) {
  const fromDraft = normalizeUnlockEdgesDraft(draftEdges);
  if (fromDraft.length) return fromDraft;
  const fromSeason = normalizeUnlockEdgesDraft(
    seasonBody && typeof seasonBody === "object" ? seasonBody.unlock_edges : []
  );
  if (fromSeason.length) return fromSeason;
  const templateRows = resolveSeasonTemplateRows(seasonBody, seasonId);
  if (templateRows.length >= 2) {
    return [
      {
        from: templateRows[0].node_id,
        to: templateRows[1].node_id,
        label: "",
      },
    ];
  }
  return [];
}

/**
 * @param {string} seasonId
 */
export function suggestedSeasonMetadataDraftFilename(seasonId) {
  const safe = String(seasonId ?? "season")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `city-game-${safe}-metadata-draft.json`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {Record<string, unknown> | null | undefined} draft
 * @param {string} profileId
 */
export function buildSeasonMetadataDraftExport(season, draft, profileId) {
  const merged = { ...season };
  if (profileId) merged.season_root_profile_id = profileId;
  if (draft?.window && typeof draft.window === "object") {
    merged.window = {
      ...(season.window && typeof season.window === "object" ? season.window : {}),
      .../** @type {Record<string, unknown>} */ (draft.window),
    };
  }
  if (typeof draft?.status === "string" && draft.status.trim()) {
    merged.status = draft.status.trim();
  }
  if (Array.isArray(draft?.districts)) {
    merged.districts = draft.districts.filter((d) => typeof d === "string" && d.trim());
  }
  if (draft && "unlock_edges" in draft) {
    merged.unlock_edges = normalizeUnlockEdgesDraft(draft.unlock_edges);
  }
  return merged;
}
