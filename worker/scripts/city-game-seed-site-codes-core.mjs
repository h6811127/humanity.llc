/**
 * Pure helpers for exporting physical site codes from season config into seed output.
 * Graph automation: worker/scripts/network-graph-core.mjs
 */

import {
  contributeModeForNode as contributeModeForNodeCore,
  contributableNodeIds,
} from "./network-graph-core.mjs";

/**
 * @param {import("../../site/data/city-game-cr-season-01.json")} season
 * @param {string} nodeId
 * @returns {"quorum" | "fragment" | "scarcity" | null}
 */
export function contributeModeForNode(season, nodeId) {
  return contributeModeForNodeCore(season, nodeId);
}

/**
 * @param {import("../../site/data/city-game-cr-season-01.json")} season
 * @returns {string[]}
 */
export function seasonContributableNodeIds(season) {
  return contributableNodeIds(season);
}

/**
 * @param {import("../../site/data/city-game-cr-season-01.json")} season
 * @param {Array<{ node_id: string; public_label?: string; object_id?: string; scan_url?: string; local_scan_url?: string }>} nodeRows
 */
export function buildSeedSiteCodeRows(season, nodeRows) {
  const codes = season.contribute_codes ?? {};
  const nodeById = new Map(nodeRows.map((row) => [row.node_id, row]));
  const labelById = new Map(
    (season.nodes ?? []).map((node) => [node.node_id, node.label ?? node.node_id])
  );

  return seasonContributableNodeIds(season).map((nodeId) => {
    const entry = codes[nodeId];
    const seeded = nodeById.get(nodeId);
    const mode = contributeModeForNode(season, nodeId);
    return {
      node_id: nodeId,
      public_label: seeded?.public_label ?? labelById.get(nodeId) ?? nodeId,
      site_code: entry?.code?.trim().toUpperCase() ?? null,
      epoch: entry?.epoch?.trim() ?? season.season_id,
      contribute_mode: mode,
      ...(seeded?.object_id ? { object_id: seeded.object_id } : {}),
      ...(seeded?.scan_url ? { scan_url: seeded.scan_url } : {}),
      ...(seeded?.local_scan_url ? { local_scan_url: seeded.local_scan_url } : {}),
    };
  });
}

/**
 * @param {import("../../site/data/city-game-cr-season-01.json")} season
 * @param {Array<Record<string, unknown>>} nodeRows
 */
export function attachSiteCodesToSeedNodes(season, nodeRows) {
  const codes = season.contribute_codes ?? {};
  return nodeRows.map((row) => {
    const entry = codes[row.node_id];
    const mode = contributeModeForNode(season, row.node_id);
    if (!entry?.code?.trim() && !mode) return row;
    return {
      ...row,
      ...(entry?.code?.trim()
        ? {
            site_code: entry.code.trim().toUpperCase(),
            contribute_epoch: entry.epoch?.trim() ?? season.season_id,
          }
        : {}),
      ...(mode ? { contribute_mode: mode } : {}),
    };
  });
}

/**
 * @param {ReturnType<typeof buildSeedSiteCodeRows>} rows
 * @returns {string[]}
 */
export function missingSeedSiteCodeWarnings(rows) {
  return rows
    .filter((row) => !row.site_code)
    .map((row) => `${row.node_id}: missing contribute_codes entry in season JSON`);
}
