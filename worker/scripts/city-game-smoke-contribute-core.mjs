/**
 * Pure helpers for local autonomous contribute spine smoke.
 * Keep response shapes aligned with worker/src/resolver/game-contribute.ts.
 */

import { extractScanMain, hasRenderedClass } from "./city-game-smoke-local-core.mjs";

export const CABINET_UNLOCKED_PUBLIC_STATE = "Unlocked together — ask the mural what remembers winter";
export const FINALE_OPEN_PUBLIC_STATE = "Finale switch live — the alley arch is waking";

/**
 * @param {string} apiOrigin
 * @param {string} profileId
 * @param {string} objectId
 */
export function gameContributeEndpoint(apiOrigin, profileId, objectId) {
  return `${apiOrigin}/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/objects/${encodeURIComponent(objectId)}/game-contribute`;
}

/**
 * @param {number} index
 */
export function synthContributorIp(index) {
  const octet = (index % 254) + 1;
  return `203.0.113.${octet}`;
}

/**
 * @param {number} progress
 * @param {number} target
 */
export function remainingQuorumContributions(progress, target) {
  if (!Number.isFinite(progress) || !Number.isFinite(target)) return 0;
  return Math.max(0, Math.ceil(target - progress));
}

/**
 * @param {string} html
 */
export function parseContributeProgressFromScanHtml(html) {
  const main = extractScanMain(html);
  const match = main.match(
    /id="scan-game-contribute-progress"[^>]*>\s*(\d+)\s*\/\s*(\d+)\s*</i
  );
  if (!match) return null;
  return {
    progress: Number(match[1]),
    target: Number(match[2]),
  };
}

/**
 * @param {string} html
 */
export function hasContributeBlockInScanHtml(html) {
  const main = extractScanMain(html);
  return (
    hasRenderedClass(main, "scan-game-contribute") ||
    /id="scan-game-contribute"/.test(main)
  );
}

/**
 * @param {unknown} body
 */
export function readQuorumContributeResponse(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, reason: "empty contribute response" };
  }
  const json = /** @type {Record<string, unknown>} */ (body);
  if (typeof json.error === "string") {
    return { ok: false, reason: json.error, message: json.message };
  }
  return {
    ok: true,
    quorumComplete: json.quorum_complete === true,
    collectiveProgress: Number(json.collective_progress),
    collectiveTarget: Number(json.collective_target),
    unlockedNodes: Array.isArray(json.unlocked_nodes) ? json.unlocked_nodes.map(String) : [],
  };
}

/**
 * @param {unknown} body
 */
export function readWitnessContributeResponse(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, reason: "empty contribute response" };
  }
  const json = /** @type {Record<string, unknown>} */ (body);
  if (typeof json.error === "string") {
    return { ok: false, reason: json.error, message: json.message };
  }
  return {
    ok: true,
    passIssued: json.pass_issued === true,
    scarcityRemaining: Number(json.scarcity_remaining),
    witnessDepleted: json.witness_depleted === true,
    vouchTargets: Array.isArray(json.vouch_targets) ? json.vouch_targets.map(String) : [],
  };
}

/**
 * @param {unknown} body
 */
export function readFragmentContributeResponse(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, reason: "empty contribute response" };
  }
  const json = /** @type {Record<string, unknown>} */ (body);
  if (typeof json.error === "string") {
    return { ok: false, reason: json.error, message: json.message };
  }
  return {
    ok: true,
    finaleOpen: json.finale_open === true,
    fragmentsRegistered: Number(json.fragments_registered),
    fragmentsRequired: Number(json.fragments_required),
    unlockedNodes: Array.isArray(json.unlocked_nodes) ? json.unlocked_nodes.map(String) : [],
  };
}

/**
 * @param {string} html
 */
export function assessCabinetUnlockedScanHtml(html) {
  const main = extractScanMain(html);
  if (main.includes("Locked until River Lantern quorum")) {
    return { ok: false, reason: "node_07: cabinet still locked before quorum" };
  }
  if (!main.includes("Unlocked together")) {
    return { ok: false, reason: "node_07: expected unlocked cabinet copy after quorum" };
  }
  if (!main.includes("River Lantern")) {
    return { ok: false, reason: "node_07: missing River Lantern unlock reference" };
  }
  return { ok: true };
}

/**
 * @param {string} html
 */
export function assessFinaleOpenScanHtml(html) {
  const main = extractScanMain(html);
  if (hasRenderedClass(main, "scan-game-dormant-note")) {
    return { ok: false, reason: "node_13: finale still dormant after fragment lattice" };
  }
  if (!main.includes("Finale switch live")) {
    return { ok: false, reason: "node_13: expected finale-open public state" };
  }
  return { ok: true };
}

/**
 * @param {Array<{ node_id?: string; object_id?: string; qr_id?: string; local_scan_url?: string; scan_url?: string }>} nodes
 * @param {string} nodeId
 */
export function resolveSeedScanNode(nodes, nodeId) {
  const row = nodes.find((node) => node.node_id === nodeId);
  if (!row?.object_id || !row.qr_id) return null;
  return {
    nodeId,
    objectId: row.object_id,
    qrId: row.qr_id,
    localScanUrl: row.local_scan_url ?? null,
    scanUrl: row.scan_url ?? null,
  };
}

/**
 * @param {Array<{ node_id?: string; object_id?: string; qr_id?: string; site_code?: string }>} nodes
 * @param {Record<string, { code?: string }>} seasonCodes
 * @param {string} nodeId
 */
export function resolveSeedContributeNode(nodes, seasonCodes, nodeId) {
  const row = resolveSeedScanNode(nodes, nodeId);
  if (!row) return null;
  const siteCode =
    nodes.find((node) => node.node_id === nodeId)?.site_code ??
    seasonCodes[nodeId]?.code ??
    null;
  if (!siteCode) return null;
  return {
    ...row,
    siteCode: siteCode.trim().toUpperCase(),
  };
}
