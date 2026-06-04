/**
 * WS-SCALE SC-3 — production wave-open mint planning (testable).
 */
import { buildAllGameNodeTemplates } from "./city-game-node-defaults.mjs";
import {
  SUMMER_OPEN_NODE_COUNT,
  SUMMER_WAVE_OPEN_NODE_COUNT,
} from "./city-game-summer-scale-core.mjs";
import { INSTALL_QA_REQUIRED_NODE_COUNT } from "./city-game-smoke-local-core.mjs";

export const PRODUCTION_WAVE_OPEN_MIN = 16;

/**
 * @param {string} nodeId
 */
export function waveNodeNum(nodeId) {
  const m = /^node_(\d+)$/.exec(String(nodeId));
  return m ? Number(m[1]) : 0;
}

/**
 * @param {Array<{ node_id: string }>} seasonNodes
 * @param {string} seasonId
 * @param {Set<string>} existingIds
 * @param {number} [waveMin]
 */
export function waveOpenMintTemplates(seasonNodes, seasonId, existingIds, waveMin = PRODUCTION_WAVE_OPEN_MIN) {
  return buildAllGameNodeTemplates(seasonNodes, seasonId).filter(
    (t) => waveNodeNum(t.node_id) >= waveMin && !existingIds.has(t.node_id)
  );
}

/**
 * @param {{
 *   season: { season_id: string; nodes: Array<{ node_id: string }> };
 *   seed: { profile_id?: string; owner_private_key_b58?: string; owner_public_key?: string; nodes?: Array<{ node_id?: string }> };
 *   waveMin?: number;
 * }} input
 */
export function planProductionWaveOpenMint(input) {
  const issues = [];
  const warnings = [];

  const profileId = input.seed?.profile_id?.trim() ?? "";
  const priv = input.seed?.owner_private_key_b58?.trim() ?? "";
  const pub = input.seed?.owner_public_key?.trim() ?? "";
  if (!profileId || !priv || !pub) {
    issues.push("Production seed missing profile_id / owner keys");
  }

  const existingIds = new Set(
    (input.seed?.nodes ?? []).map((n) => n.node_id).filter(Boolean)
  );
  const existingCount = existingIds.size;
  const templates = waveOpenMintTemplates(
    input.season.nodes ?? [],
    input.season.season_id,
    existingIds,
    input.waveMin ?? PRODUCTION_WAVE_OPEN_MIN
  );

  const urlCount = (input.seed?.nodes ?? []).filter(
    (n) => n.node_id && (n.scan_url || n.local_scan_url)
  ).length;

  if (existingCount < 15) {
    warnings.push(
      `Production seed has ${existingCount} rows — expected spine mint (15) before wave-open`
    );
  }

  const ready =
    issues.length === 0 &&
    templates.length > 0 &&
    existingCount < SUMMER_WAVE_OPEN_NODE_COUNT;

  return {
    ready,
    profileId,
    existingCount,
    urlCount,
    pendingCount: templates.length,
    pendingNodeIds: templates.map((t) => t.node_id),
    pendingTemplates: templates,
    targetTotal: SUMMER_WAVE_OPEN_NODE_COUNT,
    issues,
    warnings,
  };
}
