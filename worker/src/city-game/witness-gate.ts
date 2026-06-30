/**
 * Single source of truth for witness vouch gate evaluation (scan + board + fog).
 * Reads witness child docs via `vouch_active_for` — not RelationshipEdge v1 storage.
 */
import type { ChildObjectRow } from "../db/types";
import type { RelationshipEdgeDocument } from "../live-object/relationship-edge-spec";
import {
  RELATIONSHIP_EDGE_KIND_WITNESSES,
  isWitnessRelationshipEdge,
  relationshipEdgePath,
} from "../live-object/relationship-edge-spec";
import type { GameMeta } from "./game-meta";
import { gameMetaFromChildDocumentJson } from "./game-meta";
import {
  resolveGameVouchGate,
  witnessVouchesForNode,
  type GameVouchGate,
} from "./vouch-graph";
import { seasonNodeIdForObject, type CrSeasonConfig } from "./season-config";

export type { GameVouchGate } from "./vouch-graph";
export { resolveGameVouchGate, witnessVouchesForNode } from "./vouch-graph";

export type WitnessGateInput = {
  targetNodeId: string | null;
  gameMeta: GameMeta;
  witnessMetaByNodeId: Record<string, GameMeta>;
  witnessRelationshipEdges?: RelationshipEdgeDocument[] | null;
};

/** Canonical witness gate — edges win when present; else legacy `vouch_requires`. */
export function resolveWitnessGate(input: WitnessGateInput): GameVouchGate | null {
  const activeEdges =
    input.witnessRelationshipEdges?.filter((edge) => edge.status === "active") ?? [];
  if (activeEdges.length > 0) {
    return evaluateWitnessRelationshipGate(
      activeEdges,
      input.targetNodeId,
      input.witnessMetaByNodeId
    );
  }
  return resolveGameVouchGate(
    input.targetNodeId,
    input.gameMeta,
    input.witnessMetaByNodeId
  );
}

function evaluateWitnessRelationshipGate(
  edges: RelationshipEdgeDocument[],
  targetNodeId: string | null,
  witnessMetaByNodeId: Record<string, GameMeta> = {}
): GameVouchGate | null {
  const active = edges.filter(
    (edge) => edge.kind === RELATIONSHIP_EDGE_KIND_WITNESSES && edge.status === "active"
  );
  if (!targetNodeId || !active.length) return null;

  const required = active.map((edge) => relationshipEdgePath(edge).from_node_id);
  const satisfied: string[] = [];
  const pending: string[] = [];

  for (const edge of active) {
    const witnessNodeId = relationshipEdgePath(edge).from_node_id;
    const witnessMeta = witnessMetaByNodeId[witnessNodeId];
    if (witnessMeta && witnessVouchesForNode(witnessMeta, targetNodeId)) {
      satisfied.push(witnessNodeId);
    } else {
      pending.push(witnessNodeId);
    }
  }

  return {
    required,
    satisfied,
    pending,
    met: pending.length === 0,
  };
}

/** Active game_node witness metas indexed by node_id (board snapshot batch). */
export function buildWitnessMetaByNodeId(
  children: Pick<
    ChildObjectRow,
    "object_id" | "object_type" | "status" | "child_object_document_json"
  >[],
  season: CrSeasonConfig
): Record<string, GameMeta> {
  const out: Record<string, GameMeta> = {};
  for (const child of children) {
    if (child.object_type !== "game_node" || child.status !== "active") continue;
    const nodeId = seasonNodeIdForObject(child.object_id, season);
    if (!nodeId) continue;
    const meta = gameMetaFromChildDocumentJson(child.child_object_document_json);
    if (meta) out[nodeId] = meta;
  }
  return out;
}

export function witnessGateRequired(
  meta: GameMeta,
  gate: GameVouchGate | null
): boolean {
  return Boolean(gate?.required.length || meta.vouch_requires.length);
}

/** Board vouch chip value — matches scan semantics (Path open / Sealed · needs …). */
export function mapVouchChipValue(meta: GameMeta, gate: GameVouchGate | null): string | null {
  if (!witnessGateRequired(meta, gate)) return null;
  if (gate?.met) return "Path open";
  const pending = gate?.pending.length ? gate.pending : meta.vouch_requires;
  return `Sealed · needs ${pending.join(", ")}`;
}

/** Fog visibility for lore nodes that require quorum unlock + witness gate. */
export function lorePathUnlocked(meta: GameMeta, gate: GameVouchGate | null): boolean {
  if (!meta.unlocked_by.length) return true;
  if (witnessGateRequired(meta, gate)) {
    return gate?.met === true;
  }
  return false;
}
