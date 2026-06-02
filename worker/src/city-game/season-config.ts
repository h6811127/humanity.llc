import seasonJson from "../../../site/data/city-game-cr-season-01.json";

export type SeasonContributeCode = {
  code: string;
  epoch: string;
};

export type SeasonNodeRow = {
  node_id: string;
  object_id: string;
  role: string;
  district: string;
  label: string;
};

export type SeasonUnlockEdge = {
  from: string;
  to: string;
  label: string;
};

export type SeasonAutomation = {
  quorum_nodes?: string[];
  fragment_nodes?: string[];
  finale_node?: string;
  witness_scarcity_node?: string;
};

export type CrSeasonConfig = {
  season_id: string;
  nodes: SeasonNodeRow[];
  unlock_edges: SeasonUnlockEdge[];
  contribute_codes?: Record<string, SeasonContributeCode>;
  automation?: SeasonAutomation;
};

export const CR_SEASON_01 = seasonJson as CrSeasonConfig;

const objectToNode = new Map(
  CR_SEASON_01.nodes.map((n) => [n.object_id, n.node_id] as const)
);

const nodeToObject = new Map(
  CR_SEASON_01.nodes.map((n) => [n.node_id, n.object_id] as const)
);

export function seasonNodeIdForObject(objectId: string): string | null {
  return objectToNode.get(objectId) ?? null;
}

export function seasonObjectIdForNode(nodeId: string): string | null {
  return nodeToObject.get(nodeId) ?? null;
}

export function seasonContributeCode(nodeId: string): SeasonContributeCode | null {
  const entry = CR_SEASON_01.contribute_codes?.[nodeId];
  if (!entry?.code?.trim()) return null;
  return { code: entry.code.trim(), epoch: entry.epoch?.trim() ?? CR_SEASON_01.season_id };
}

export function seasonQuorumNodeIds(): string[] {
  return CR_SEASON_01.automation?.quorum_nodes ?? ["node_04"];
}

export function seasonFragmentNodeIds(): string[] {
  return CR_SEASON_01.automation?.fragment_nodes ?? [];
}

export function seasonFinaleNodeId(): string {
  return CR_SEASON_01.automation?.finale_node ?? "node_13";
}

export function seasonContributableNodeIds(): string[] {
  const ids = new Set([...seasonQuorumNodeIds(), ...seasonFragmentNodeIds()]);
  return [...ids];
}

export function seasonUnlockEdgesFrom(nodeId: string): SeasonUnlockEdge[] {
  return CR_SEASON_01.unlock_edges.filter((e) => e.from === nodeId);
}

export function normalizeSiteCode(raw: string): string {
  return raw.trim().toUpperCase();
}
