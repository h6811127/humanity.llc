/**
 * Cedar Rapids season footprint gate for verify:city-game.
 * Main ships the 15-node Signal War pilot; wave-open (40) validation lives in local scale WIP.
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § Node scale
 */

import { relayCaptureNodeIds } from "./network-graph-core.mjs";

/** Registry count on origin/main pilot season JSON. */
export const SUMMER_OPEN_NODE_COUNT = 15;

/** Wave-open merge target (nodes 16–40) — not the pilot verify gate. */
export const SUMMER_WAVE_OPEN_NODE_COUNT = 40;

/** Spine rows (node_01–node_15) have no node_class on the pilot. */
export const SUMMER_SPINE_NODE_COUNT = 15;

/** @deprecated Alias — use SUMMER_SPINE_NODE_COUNT */
export const PILOT_SEASON_NODE_COUNT = SUMMER_SPINE_NODE_COUNT;

/** @type {Record<string, number>} */
export const SUMMER_OPEN_NODE_CLASS_MIN = {};

const NODE_ID_RE = /^node_(\d{2})$/;
const WAVE_OPEN_MIN = 16;
const WAVE_OPEN_MAX = 40;

/**
 * @param {Array<{ node_id?: string; node_class?: string; install_wave?: string; district?: string; role?: string }>} nodes
 */
export function countNodesByClass(nodes) {
  /** @type {Record<string, number>} */
  const counts = { spine: 0 };
  for (const row of nodes) {
    const cls = row.node_class?.trim();
    if (!cls) {
      counts.spine += 1;
      continue;
    }
    counts[cls] = (counts[cls] ?? 0) + 1;
  }
  return counts;
}

/**
 * @param {Array<{ node_id?: string; district?: string }>} nodes
 */
export function countNodesByDistrict(nodes) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const row of nodes) {
    const d = row.district?.trim();
    if (!d) continue;
    counts[d] = (counts[d] ?? 0) + 1;
  }
  return counts;
}

/**
 * @param {Record<string, unknown>} season
 * @param {number} [targetNodeCount]
 * @returns {{ ok: boolean; issues: string[]; warnings: string[]; summary: Record<string, unknown> }}
 */
export function validateSummerOpenFootprint(
  season,
  targetNodeCount = SUMMER_OPEN_NODE_COUNT
) {
  const issues = [];
  const warnings = [];

  if (season.season_id !== "cr_season_01_wake") {
    warnings.push(`footprint checks target cr_season_01_wake (got ${String(season.season_id)}).`);
  }

  const nodes = Array.isArray(season.nodes) ? season.nodes : [];
  if (nodes.length !== targetNodeCount) {
    issues.push(
      `Expected ${targetNodeCount} nodes in season registry, found ${nodes.length}.`
    );
  }

  const nodeIds = new Set();
  for (const row of nodes) {
    const match = NODE_ID_RE.exec(String(row.node_id ?? ""));
    if (!match) {
      issues.push(`Invalid node_id: ${String(row.node_id)}`);
      continue;
    }
    const num = Number(match[1]);
    if (num < 1 || num > targetNodeCount) {
      issues.push(
        `${row.node_id}: id out of pilot range node_01–node_${String(targetNodeCount).padStart(2, "0")}.`
      );
    }
    if (nodeIds.has(row.node_id)) {
      issues.push(`Duplicate node_id: ${row.node_id}`);
    }
    nodeIds.add(row.node_id);

    if (num >= WAVE_OPEN_MIN && num <= WAVE_OPEN_MAX) {
      if (row.install_wave !== "open") {
        issues.push(`${row.node_id}: wave-open row must have install_wave "open".`);
      }
      if (!row.node_class?.trim()) {
        issues.push(`${row.node_id}: wave-open row must have node_class.`);
      }
    } else if (num <= SUMMER_SPINE_NODE_COUNT && row.node_class) {
      warnings.push(`${row.node_id}: spine row should not set node_class (got ${row.node_class}).`);
    }
  }

  for (let i = 1; i <= targetNodeCount; i += 1) {
    const id = `node_${String(i).padStart(2, "0")}`;
    if (!nodeIds.has(id)) {
      issues.push(`Missing registry row ${id}.`);
    }
  }

  const classCounts = countNodesByClass(nodes);
  if (classCounts.spine !== SUMMER_SPINE_NODE_COUNT) {
    issues.push(
      `Expected ${SUMMER_SPINE_NODE_COUNT} spine rows (no node_class), found ${classCounts.spine}.`
    );
  }
  for (const [cls, min] of Object.entries(SUMMER_OPEN_NODE_CLASS_MIN)) {
    const have = classCounts[cls] ?? 0;
    if (have < min) {
      issues.push(`node_class ${cls}: expected ≥${min}, found ${have}.`);
    }
  }

  const mapNodes = season.map_layout?.nodes;
  if (!mapNodes || typeof mapNodes !== "object") {
    issues.push("map_layout.nodes required for city board.");
  } else {
    for (const id of nodeIds) {
      if (!mapNodes[id]) {
        issues.push(`${id}: missing map_layout.nodes entry.`);
      }
    }
  }

  const relayCapture = relayCaptureNodeIds(season.automation);
  const byId = new Map(nodes.map((n) => [n.node_id, n]));
  for (const nodeId of relayCapture) {
    const row = byId.get(nodeId);
    if (!row) {
      issues.push(`relay_capture_nodes: unknown ${nodeId}.`);
      continue;
    }
    if (row.role !== "relay_gate") {
      issues.push(`${nodeId}: relay_capture_nodes requires role relay_gate (got ${row.role}).`);
    }
    const codes = season.contribute_codes ?? {};
    if (!codes[nodeId]?.code?.trim()) {
      issues.push(`${nodeId}: relay_capture_nodes requires contribute_codes.code.`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    summary: {
      nodeCount: nodes.length,
      classCounts,
      districtCounts: countNodesByDistrict(nodes),
      relayCaptureCount: relayCapture.length,
    },
  };
}

/** @param {Record<string, unknown>} season */
export function validatePilotFootprint(season) {
  return validateSummerOpenFootprint(season, SUMMER_OPEN_NODE_COUNT);
}

/** @param {Record<string, unknown>} season */
export function validateSummerWaveOpenFootprint(season) {
  return validateSummerOpenFootprint(season, SUMMER_WAVE_OPEN_NODE_COUNT);
}

/**
 * Preflight helper — pick pilot (15) vs wave-open (40) validator from registry length.
 * @param {Record<string, unknown>} season
 */
export function validateSeasonFootprintFromRegistry(season) {
  const count = Array.isArray(season.nodes) ? season.nodes.length : 0;
  if (count === SUMMER_WAVE_OPEN_NODE_COUNT) {
    return validateSummerWaveOpenFootprint(season);
  }
  if (count === SUMMER_OPEN_NODE_COUNT) {
    return validatePilotFootprint(season);
  }
  return validateSummerOpenFootprint(season, count);
}
