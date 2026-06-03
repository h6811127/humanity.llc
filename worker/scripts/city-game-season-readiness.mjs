/**
 * Cedar Rapids season config readiness checks (Phase C/D gates).
 */

import { validateMapLayout } from "../../site/js/city-game-map-board-core.mjs";
import {
  contributableNodeIds,
  validateNetworkGraph,
} from "./network-graph-core.mjs";
import { validateMobileLoreEnrollmentList } from "./city-game-mobile-lore-core.mjs";

const NODE_ID_RE = /^node_\d{2}$/;
const OBJECT_ID_RE = /^obj_cr_node_\d{2}_[a-z0-9_]+$/;

const SPINE_UNLOCK_EDGES = [
  ["node_04", "node_07"],
  ["node_10", "node_07"],
  ["node_09", "node_13"],
  ["node_11", "node_13"],
  ["node_01", "node_13"],
];

function sameStringSet(a, b) {
  const left = [...new Set(a)].sort();
  const right = [...new Set(b)].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * @param {Record<string, unknown>} season
 * @param {Set<string>} nodeIds
 * @param {string[]} issues
 * @param {string[]} warnings
 */
function validateAutonomousSpine(season, nodeIds, issues, warnings) {
  const auto = season.automation;
  if (!auto || typeof auto !== "object") {
    issues.push("automation block required for autonomous v1 spine.");
    return;
  }

  const automation = /** @type {Record<string, unknown>} */ (auto);
  if (!sameStringSet(automation.quorum_nodes ?? [], ["node_04"])) {
    issues.push('automation.quorum_nodes must be ["node_04"].');
  }
  if (!sameStringSet(automation.fragment_nodes ?? [], ["node_09", "node_11", "node_01"])) {
    issues.push('automation.fragment_nodes must include node_09, node_11, node_01.');
  }
  if (automation.finale_node !== "node_13") {
    issues.push('automation.finale_node must be "node_13".');
  }
  if (automation.witness_scarcity_node !== "node_10") {
    issues.push('automation.witness_scarcity_node must be "node_10".');
  }

  const edgeKeys = new Set(
    (Array.isArray(season.unlock_edges) ? season.unlock_edges : []).map(
      (edge) => `${edge?.from}->${edge?.to}`
    )
  );
  for (const [from, to] of SPINE_UNLOCK_EDGES) {
    if (!edgeKeys.has(`${from}->${to}`)) {
      issues.push(`unlock_edges missing spine edge ${from} → ${to}.`);
    }
  }

  const codes = season.contribute_codes ?? {};
  if (!codes || typeof codes !== "object") {
    issues.push("contribute_codes required for autonomous contribute nodes.");
    return;
  }

  for (const nodeId of contributableNodeIds(season)) {
    if (!nodeIds.has(nodeId)) {
      issues.push(`${nodeId}: listed in automation but missing from nodes[].`);
      continue;
    }
    const entry = /** @type {{ code?: string; epoch?: string }} | undefined */ (codes[nodeId]);
    if (!entry?.code?.trim()) {
      issues.push(`${nodeId}: missing contribute_codes.code.`);
      continue;
    }
    if (entry.epoch && entry.epoch !== season.season_id) {
      warnings.push(`${nodeId}: contribute_codes.epoch differs from season_id.`);
    }
  }
}

/**
 * @param {unknown} season
 * @param {{ requireLaunch?: boolean }} [opts]
 */
export function cityGameSeasonReadiness(season, opts = {}) {
  const issues = [];
  const warnings = [];

  if (!season || typeof season !== "object") {
    return { ready: false, issues: ["Season config must be an object."], warnings };
  }

  const s = season;
  if (s.season_id !== "cr_season_01_wake") {
    warnings.push(`Unexpected season_id: ${String(s.season_id)}`);
  }
  if (!Array.isArray(s.nodes) || s.nodes.length !== 15) {
    issues.push(`Expected 15 nodes, found ${Array.isArray(s.nodes) ? s.nodes.length : 0}.`);
  }

  const nodeIds = new Set();
  if (Array.isArray(s.nodes)) {
    for (const row of s.nodes) {
      if (!row?.node_id || !NODE_ID_RE.test(row.node_id)) {
        issues.push(`Invalid node_id: ${String(row?.node_id)}`);
        continue;
      }
      if (nodeIds.has(row.node_id)) {
        issues.push(`Duplicate node_id: ${row.node_id}`);
      }
      nodeIds.add(row.node_id);
      if (!row.object_id || !OBJECT_ID_RE.test(row.object_id)) {
        issues.push(`${row.node_id}: missing or invalid object_id.`);
      }
      if (!row.role || !row.district || !row.label) {
        issues.push(`${row.node_id}: missing role, district, or label.`);
      }
    }
  }

  issues.push(
    ...validateNetworkGraph({
      nodes: Array.isArray(s.nodes) ? s.nodes : [],
      unlock_edges: Array.isArray(s.unlock_edges) ? s.unlock_edges : [],
      automation: s.automation,
    }).issues
  );

  if (!s.rules_path || s.rules_path !== "/play/cedar-rapids/") {
    warnings.push(`rules_path should be /play/cedar-rapids/ (got ${String(s.rules_path)}).`);
  }

  if (!s.season_root_profile_id) {
    if (opts.requireLaunch) {
      issues.push("season_root_profile_id must be set before launch.");
    } else {
      warnings.push("season_root_profile_id not set — run npm run city-game:season-root.");
    }
  }

  if (!s.window?.starts_at || !s.window?.ends_at) {
    if (opts.requireLaunch) {
      issues.push("window.starts_at and window.ends_at must be set before launch.");
    } else {
      warnings.push("Season window dates not set (OK pre-launch).");
    }
  }

  if (!Array.isArray(s.mobile_lore_enrollment)) {
    issues.push("mobile_lore_enrollment must be an array (empty OK).");
  } else {
    issues.push(...validateMobileLoreEnrollmentList(s.mobile_lore_enrollment));
  }

  validateAutonomousSpine(s, nodeIds, issues, warnings);

  issues.push(...validateMapLayout(s));

  if (s.bulletin_schedule?.entries?.length && (!s.window?.starts_at || !s.window?.ends_at)) {
    warnings.push(
      "bulletin_schedule relative slots need window.starts_at before launch (hour-0 slots still apply in local dev)."
    );
  }

  if (s.route_window_schedule?.entries?.length) {
    if (!s.route_window_schedule.timezone?.trim()) {
      warnings.push("route_window_schedule.timezone should be set (defaults to America/Chicago).");
    }
    if (!s.window?.starts_at || !s.window?.ends_at) {
      warnings.push(
        "route_window_schedule local-hour slots need window.starts_at before launch (local-hour slots still apply in local dev)."
      );
    }
  }

  return {
    ready: issues.length === 0,
    issues,
    warnings,
  };
}
