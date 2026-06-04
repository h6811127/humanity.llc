/**
 * City-agnostic network graph — shared by worker TS, season scripts, and seed tools.
 * Keep in sync with worker/src/live-object/network-graph.ts (thin TS wrapper).
 */

/**
 * @param {import("../../worker/src/live-object/network-graph.ts").NetworkGraphConfig} config
 */
export function buildNetworkGraphIndexes(config) {
  const objectToNode = new Map();
  const nodeToObject = new Map();
  const nodeIds = new Set();
  for (const node of config.nodes ?? []) {
    nodeIds.add(node.node_id);
    objectToNode.set(node.object_id, node.node_id);
    nodeToObject.set(node.node_id, node.object_id);
  }
  const edgesByFrom = new Map();
  for (const edge of config.unlock_edges ?? []) {
    const list = edgesByFrom.get(edge.from) ?? [];
    list.push(edge);
    edgesByFrom.set(edge.from, list);
  }
  return { objectToNode, nodeToObject, nodeIds, edgesByFrom };
}

/**
 * @param {import("../../worker/src/live-object/network-graph.ts").NetworkGraphConfig} config
 */
export function validateNetworkGraph(config) {
  const issues = [];
  if (!Array.isArray(config.nodes) || config.nodes.length === 0) {
    issues.push("nodes must be a non-empty array.");
  }
  if (!Array.isArray(config.unlock_edges)) {
    issues.push("unlock_edges must be an array.");
  }

  const nodeIds = new Set();
  const objectIds = new Set();
  for (const node of config.nodes ?? []) {
    if (!node.node_id?.trim()) issues.push("node missing node_id.");
    if (!node.object_id?.trim()) {
      issues.push(`node ${node.node_id}: missing object_id.`);
    }
    if (nodeIds.has(node.node_id)) {
      issues.push(`duplicate node_id: ${node.node_id}`);
    }
    if (objectIds.has(node.object_id)) {
      issues.push(`duplicate object_id: ${node.object_id}`);
    }
    nodeIds.add(node.node_id);
    objectIds.add(node.object_id);
  }

  for (const edge of config.unlock_edges ?? []) {
    if (!edge.from || !edge.to) {
      issues.push("unlock_edges entry missing from/to.");
      continue;
    }
    if (!nodeIds.has(edge.from)) {
      issues.push(`unlock_edges unknown from: ${edge.from}`);
    }
    if (!nodeIds.has(edge.to)) {
      issues.push(`unlock_edges unknown to: ${edge.to}`);
    }
  }

  return { ok: issues.length === 0, issues };
}

/** @param {import("../../worker/src/live-object/network-graph.ts").NetworkGraphAutomation | undefined} automation */
export function quorumNodeIds(automation) {
  return Array.isArray(automation?.quorum_nodes) ? [...automation.quorum_nodes] : [];
}

/** @param {import("../../worker/src/live-object/network-graph.ts").NetworkGraphAutomation | undefined} automation */
export function fragmentNodeIds(automation) {
  return Array.isArray(automation?.fragment_nodes) ? [...automation.fragment_nodes] : [];
}

/** @param {import("../../worker/src/live-object/network-graph.ts").NetworkGraphAutomation | undefined} automation */
export function finaleNodeId(automation) {
  const id = automation?.finale_node;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

/** @param {import("../../worker/src/live-object/network-graph.ts").NetworkGraphAutomation | undefined} automation */
export function witnessScarcityNodeId(automation) {
  const id = automation?.witness_scarcity_node;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

/** @param {import("../../worker/src/live-object/network-graph.ts").NetworkGraphAutomation | undefined} automation */
export function relayCaptureNodeIds(automation) {
  return Array.isArray(automation?.relay_capture_nodes)
    ? [...automation.relay_capture_nodes]
    : [];
}

/** When false, relay_capture_nodes are operator-flip only (**SW-S1**). Default true if unset. */
export function relayCapturePlayerEnabled(automation) {
  return automation?.relay_capture_player_enabled !== false;
}

/** @param {import("../../worker/src/live-object/network-graph.ts").NetworkGraphAutomation | undefined} automation */
export function relayDecayHours(automation) {
  const hours = automation?.relay_decay_hours;
  if (typeof hours === "number" && Number.isFinite(hours) && hours > 0) {
    return Math.min(Math.floor(hours), 24 * 14);
  }
  return 24;
}

/**
 * @param {import("../../worker/src/live-object/network-graph.ts").NetworkGraphConfig} config
 */
export function contributableNodeIds(config) {
  const ids = new Set([
    ...quorumNodeIds(config.automation),
    ...fragmentNodeIds(config.automation),
    ...relayCaptureNodeIds(config.automation),
  ]);
  const scarcity = witnessScarcityNodeId(config.automation);
  if (scarcity) ids.add(scarcity);
  return [...ids].sort();
}

/**
 * @param {import("../../worker/src/live-object/network-graph.ts").NetworkGraphConfig} config
 * @param {string} nodeId
 * @returns {"quorum" | "fragment" | "scarcity" | "capture" | "reinforce" | null}
 */
export function contributeModeForNode(config, nodeId) {
  const auto = config.automation;
  if (!auto) return null;
  if (auto.quorum_nodes?.includes(nodeId)) return "quorum";
  if (auto.fragment_nodes?.includes(nodeId)) return "fragment";
  if (auto.witness_scarcity_node === nodeId) return "scarcity";
  if (
    relayCapturePlayerEnabled(auto) &&
    auto.relay_capture_nodes?.includes(nodeId)
  ) {
    return "capture";
  }
  return null;
}

/**
 * @param {import("../../worker/src/live-object/network-graph.ts").NetworkGraphConfig} config
 * @param {string} objectId
 */
export function nodeIdForObject(config, objectId) {
  const indexes = buildNetworkGraphIndexes(config);
  return indexes.objectToNode.get(objectId) ?? null;
}

/**
 * @param {import("../../worker/src/live-object/network-graph.ts").NetworkGraphConfig} config
 * @param {string} nodeId
 */
export function objectIdForNode(config, nodeId) {
  const indexes = buildNetworkGraphIndexes(config);
  return indexes.nodeToObject.get(nodeId) ?? null;
}

/**
 * @param {import("../../worker/src/live-object/network-graph.ts").NetworkGraphConfig} config
 * @param {string} nodeId
 */
export function unlockEdgesFrom(config, nodeId) {
  const indexes = buildNetworkGraphIndexes(config);
  return indexes.edgesByFrom.get(nodeId) ?? [];
}

/**
 * @param {string[]} unlockedBy
 * @param {string} fromNodeId
 */
export function isUnlockEdgeSatisfied(unlockedBy, fromNodeId) {
  return unlockedBy.includes(fromNodeId);
}

/**
 * @param {import("../../worker/src/live-object/network-graph.ts").NetworkGraphEdge[]} edges
 * @param {(nodeId: string) => string[]} unlockedByForNode
 */
export function publicUnlockEdges(edges, unlockedByForNode) {
  return edges.map((edge) => ({
    ...edge,
    satisfied: isUnlockEdgeSatisfied(unlockedByForNode(edge.to), edge.from),
  }));
}
