/**
 * City-agnostic network graph — nodes, unlock edges, automation thresholds.
 * Shared logic: worker/scripts/network-graph-core.mjs
 */

import {
  buildNetworkGraphIndexes as buildNetworkGraphIndexesCore,
  contributeModeForNode as contributeModeForNodeCore,
  contributableNodeIds as contributableNodeIdsCore,
  finaleNodeId as finaleNodeIdCore,
  fragmentNodeIds as fragmentNodeIdsCore,
  isUnlockEdgeSatisfied as isUnlockEdgeSatisfiedCore,
  publicUnlockEdges as publicUnlockEdgesCore,
  quorumNodeIds as quorumNodeIdsCore,
  relayCaptureNodeIds as relayCaptureNodeIdsCore,
  relayCapturePlayerEnabled as relayCapturePlayerEnabledCore,
  relayDecayHours as relayDecayHoursCore,
  validateNetworkGraph as validateNetworkGraphCore,
  witnessScarcityNodeId as witnessScarcityNodeIdCore,
} from "../../scripts/network-graph-core.mjs";

export type NetworkGraphNode = {
  node_id: string;
  object_id: string;
  role: string;
  district: string;
  label: string;
};

export type NetworkGraphEdge = {
  from: string;
  to: string;
  label: string;
};

export type NetworkGraphAutomation = {
  quorum_nodes?: string[];
  fragment_nodes?: string[];
  finale_node?: string;
  witness_scarcity_node?: string;
  /** Signal War relay capture (**SW-03**) */
  relay_capture_nodes?: string[];
  /** Player-initiated capture on relay_capture_nodes — false at **SW-S1** (operator flips only). */
  relay_capture_player_enabled?: boolean;
  /** Hours until relay hold decays (**SW-05**) */
  relay_decay_hours?: number;
};

export type NetworkGraphConfig = {
  nodes: NetworkGraphNode[];
  unlock_edges: NetworkGraphEdge[];
  automation?: NetworkGraphAutomation;
};

export type NetworkGraphIndexes = {
  objectToNode: Map<string, string>;
  nodeToObject: Map<string, string>;
  nodeIds: Set<string>;
  edgesByFrom: Map<string, NetworkGraphEdge[]>;
};

const graphCache = new WeakMap<NetworkGraphConfig, NetworkGraph>();

export function buildNetworkGraphIndexes(
  config: NetworkGraphConfig
): NetworkGraphIndexes {
  return buildNetworkGraphIndexesCore(config) as NetworkGraphIndexes;
}

export function validateNetworkGraph(config: NetworkGraphConfig): {
  ok: boolean;
  issues: string[];
} {
  return validateNetworkGraphCore(config);
}

export class NetworkGraph {
  readonly indexes: NetworkGraphIndexes;

  constructor(readonly config: NetworkGraphConfig) {
    this.indexes = buildNetworkGraphIndexes(config);
  }

  nodeIdForObject(objectId: string): string | null {
    return this.indexes.objectToNode.get(objectId) ?? null;
  }

  objectIdForNode(nodeId: string): string | null {
    return this.indexes.nodeToObject.get(nodeId) ?? null;
  }

  unlockEdgesFrom(nodeId: string): NetworkGraphEdge[] {
    return this.indexes.edgesByFrom.get(nodeId) ?? [];
  }

  vouchTargetsFrom(nodeId: string): string[] {
    return this.unlockEdgesFrom(nodeId).map((edge) => edge.to);
  }

  quorumNodeIds(): string[] {
    return quorumNodeIdsCore(this.config.automation);
  }

  fragmentNodeIds(): string[] {
    return fragmentNodeIdsCore(this.config.automation);
  }

  finaleNodeId(): string {
    return finaleNodeIdCore(this.config.automation) ?? "";
  }

  witnessScarcityNodeId(): string {
    return witnessScarcityNodeIdCore(this.config.automation) ?? "";
  }

  relayCaptureNodeIds(): string[] {
    return relayCaptureNodeIdsCore(this.config.automation);
  }

  relayCapturePlayerEnabled(): boolean {
    return relayCapturePlayerEnabledCore(this.config.automation);
  }

  relayDecayHours(): number {
    return relayDecayHoursCore(this.config.automation);
  }

  contributableNodeIds(): string[] {
    return contributableNodeIdsCore(this.config);
  }

  contributeModeForNode(
    nodeId: string
  ): "quorum" | "fragment" | "scarcity" | "capture" | "reinforce" | null {
    return contributeModeForNodeCore(this.config, nodeId);
  }
}

export function networkGraphFromConfig(config: NetworkGraphConfig): NetworkGraph {
  let graph = graphCache.get(config);
  if (!graph) {
    graph = new NetworkGraph(config);
    graphCache.set(config, graph);
  }
  return graph;
}

export function isUnlockEdgeSatisfied(
  unlockedBy: string[],
  fromNodeId: string
): boolean {
  return isUnlockEdgeSatisfiedCore(unlockedBy, fromNodeId);
}

export type UnlockEdgePublicRow = NetworkGraphEdge & { satisfied: boolean };

export function publicUnlockEdges(
  edges: NetworkGraphEdge[],
  unlockedByForNode: (nodeId: string) => string[]
): UnlockEdgePublicRow[] {
  return publicUnlockEdgesCore(edges, unlockedByForNode) as UnlockEdgePublicRow[];
}
