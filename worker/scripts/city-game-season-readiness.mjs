/**
 * Cedar Rapids season config readiness checks (Phase C/D gates).
 */

const NODE_ID_RE = /^node_\d{2}$/;
const OBJECT_ID_RE = /^obj_cr_node_\d{2}_[a-z0-9_]+$/;

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

  if (Array.isArray(s.unlock_edges)) {
    for (const edge of s.unlock_edges) {
      if (!edge?.from || !edge?.to) {
        issues.push("unlock_edges entry missing from/to.");
        continue;
      }
      if (!nodeIds.has(edge.from)) issues.push(`unlock_edges unknown from: ${edge.from}`);
      if (!nodeIds.has(edge.to)) issues.push(`unlock_edges unknown to: ${edge.to}`);
    }
  } else {
    issues.push("unlock_edges must be an array.");
  }

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
  }

  return {
    ready: issues.length === 0,
    issues,
    warnings,
  };
}
