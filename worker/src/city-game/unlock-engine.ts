import { normalizeGameMeta, type GameMeta } from "./game-meta";
import {
  seasonFinaleNodeId,
  seasonFragmentNodeIds,
  seasonObjectIdForNode,
  seasonUnlockEdgesFrom,
  seasonVouchTargetsFrom,
  seasonWitnessScarcityNodeId,
  type SeasonUnlockEdge,
} from "./season-config";

export type GameContributeMode = "quorum" | "fragment" | "scarcity";

export type GameNodeDocumentPatch = {
  objectId: string;
  document: Record<string, unknown>;
  publicState: string;
};

export function collectiveStreamValue(progress: number, target: number): string {
  return `${progress} / ${target}`;
}

export function bumpCollectiveProgress(
  doc: Record<string, unknown>,
  delta = 1
): { doc: Record<string, unknown>; meta: GameMeta; reachedTarget: boolean } {
  const meta = normalizeGameMeta(doc.game_meta);
  const target = meta.collective_target;
  if (target == null) {
    throw new Error("collective_target is required for quorum contribute.");
  }
  const current = meta.collective_progress ?? 0;
  const next = Math.min(target, current + delta);
  const nextMeta: GameMeta = { ...meta, collective_progress: next };
  const streams = Array.isArray(doc.object_streams)
    ? (doc.object_streams as Record<string, unknown>[]).map((row) => {
        if (row.id === "relay" || row.label === "Collective") {
          return {
            ...row,
            value: collectiveStreamValue(next, target),
          };
        }
        return row;
      })
    : doc.object_streams;

  const reachedTarget = next >= target;
  const publicState =
    reachedTarget && typeof doc.public_state === "string"
      ? doc.public_state.includes("together")
        ? doc.public_state
        : "Unlocked together — Czech Village cabinet path opening"
      : doc.public_state;

  return {
    doc: {
      ...doc,
      game_meta: nextMeta,
      object_streams: streams,
      ...(typeof publicState === "string" ? { public_state: publicState } : {}),
    },
    meta: nextMeta,
    reachedTarget,
  };
}

export function unlockCabinetFromRiver(
  doc: Record<string, unknown>
): Record<string, unknown> {
  const meta = normalizeGameMeta(doc.game_meta);
  const unlockedBy = meta.unlocked_by.includes("node_04")
    ? meta.unlocked_by
    : [...meta.unlocked_by, "node_04"];
  const nextMeta: GameMeta = { ...meta, unlocked_by: unlockedBy };
  const streams = Array.isArray(doc.object_streams)
    ? (doc.object_streams as Record<string, unknown>[]).map((row) => {
        if (row.id === "relay" || row.label === "Path") {
          return { ...row, value: "Open · unlocked by River Lantern" };
        }
        if (row.id === "territory" || row.label === "Gate") {
          return { ...row, value: "Visible · quorum met" };
        }
        return row;
      })
    : doc.object_streams;

  return {
    ...doc,
    public_state: "Unlocked together — ask the mural what remembers winter",
    game_meta: nextMeta,
    object_streams: streams,
  };
}

/** After quorum on `fromNodeId`, return patches for unlock edge targets. */
export function patchesForQuorumUnlock(
  fromNodeId: string,
  edges: SeasonUnlockEdge[] = seasonUnlockEdgesFrom(fromNodeId)
): { toNodeId: string; objectId: string; transform: (doc: Record<string, unknown>) => Record<string, unknown> }[] {
  const out: {
    toNodeId: string;
    objectId: string;
    transform: (doc: Record<string, unknown>) => Record<string, unknown>;
  }[] = [];

  for (const edge of edges) {
    const objectId = seasonObjectIdForNode(edge.to);
    if (!objectId) continue;
    if (fromNodeId === "node_04" && edge.to === "node_07") {
      out.push({
        toNodeId: edge.to,
        objectId,
        transform: unlockCabinetFromRiver,
      });
    }
  }

  return out;
}

export function gameNodeContributeMode(
  nodeId: string | null,
  meta: GameMeta,
  nodeRole: string
): GameContributeMode | null {
  if (nodeId && seasonFragmentNodeIds().includes(nodeId)) {
    return meta.unlocked_by.includes(nodeId) ? null : "fragment";
  }
  if (
    nodeId === seasonWitnessScarcityNodeId() &&
    meta.scarcity_remaining != null &&
    meta.scarcity_remaining > 0
  ) {
    return "scarcity";
  }
  if (nodeRole === "temp_drop" && meta.collective_target != null) {
    const progress = meta.collective_progress ?? 0;
    return progress < meta.collective_target ? "quorum" : null;
  }
  return null;
}

export function isWitnessScarcityDepleted(meta: GameMeta, nodeRole: string): boolean {
  return nodeRole === "witness" && meta.scarcity_remaining === 0;
}

export function issueWitnessSunsetPass(
  doc: Record<string, unknown>,
  witnessNodeId: string
): { doc: Record<string, unknown>; meta: GameMeta; depleted: boolean } {
  const meta = normalizeGameMeta(doc.game_meta);
  if (meta.scarcity_remaining == null || meta.scarcity_remaining <= 0) {
    throw new Error("scarcity_remaining must be positive to issue a pass.");
  }

  const nextRemaining = meta.scarcity_remaining - 1;
  const vouchTargets = seasonVouchTargetsFrom(witnessNodeId);
  const vouchActiveFor = [...meta.vouch_active_for];
  for (const target of vouchTargets) {
    if (!vouchActiveFor.includes(target)) {
      vouchActiveFor.push(target);
    }
  }

  const nextMeta: GameMeta = {
    ...meta,
    scarcity_remaining: nextRemaining,
    vouch_active_for: vouchActiveFor,
  };
  const depleted = nextRemaining <= 0;

  const passesLabel = depleted
    ? "Closed for the night"
    : `${nextRemaining} sunset pass${nextRemaining === 1 ? "" : "es"} remain`;

  const streams = Array.isArray(doc.object_streams)
    ? (doc.object_streams as Record<string, unknown>[]).map((row) => {
        if (row.id === "relay" || row.label === "Passes") {
          return { ...row, value: passesLabel };
        }
        if (row.id === "bulletin" || row.label === "Vouch") {
          return {
            ...row,
            value: vouchTargets.length
              ? `Vouch live for ${vouchTargets.join(", ")}`
              : row.value,
          };
        }
        return row;
      })
    : doc.object_streams;

  const publicState = depleted
    ? "Witness seal closed for the night — sunset passes exhausted"
    : "Sunset pass issued — witness vouch live on the cabinet path";

  return {
    doc: {
      ...doc,
      public_state: publicState,
      game_meta: nextMeta,
      object_streams: streams,
    },
    meta: nextMeta,
    depleted,
  };
}

export function gameNodeShowsContribute(
  meta: GameMeta,
  nodeRole: string,
  nodeId: string | null = null
): boolean {
  return gameNodeContributeMode(nodeId, meta, nodeRole) != null;
}

export function isFragmentNodeClaimed(meta: GameMeta, nodeId: string): boolean {
  return meta.unlocked_by.includes(nodeId);
}

export function markFragmentNodeClaimed(
  doc: Record<string, unknown>,
  nodeId: string
): Record<string, unknown> {
  const meta = normalizeGameMeta(doc.game_meta);
  const unlockedBy = meta.unlocked_by.includes(nodeId)
    ? meta.unlocked_by
    : [...meta.unlocked_by, nodeId];
  const nextMeta: GameMeta = { ...meta, unlocked_by: unlockedBy };
  const streams = Array.isArray(doc.object_streams)
    ? (doc.object_streams as Record<string, unknown>[]).map((row) => {
        if (row.id === "relay" || row.label === "Fragment") {
          return { ...row, value: "Claimed · registered on lattice" };
        }
        return row;
      })
    : doc.object_streams;

  return {
    ...doc,
    public_state: "Fragment registered — city-scale coordination continues",
    game_meta: nextMeta,
    object_streams: streams,
  };
}

export function fragmentLatticeProgress(
  meta: GameMeta,
  fragmentNodeIds: string[] = seasonFragmentNodeIds()
): { claimed: number; required: number; complete: boolean } {
  const required = fragmentNodeIds.length;
  const claimed = fragmentNodeIds.filter((id) => meta.unlocked_by.includes(id)).length;
  return { claimed, required, complete: required > 0 && claimed >= required };
}

export function recordFragmentOnFinale(
  doc: Record<string, unknown>,
  fromNodeId: string,
  fragmentNodeIds: string[] = seasonFragmentNodeIds()
): { doc: Record<string, unknown>; latticeComplete: boolean } {
  const meta = normalizeGameMeta(doc.game_meta);
  const unlockedBy = meta.unlocked_by.includes(fromNodeId)
    ? meta.unlocked_by
    : [...meta.unlocked_by, fromNodeId];
  const nextMeta: GameMeta = { ...meta, unlocked_by: unlockedBy };
  const { claimed, required, complete } = fragmentLatticeProgress(nextMeta, fragmentNodeIds);
  const streams = Array.isArray(doc.object_streams)
    ? (doc.object_streams as Record<string, unknown>[]).map((row) => {
        if (row.id === "bulletin" || row.label === "Need") {
          return { ...row, value: `${claimed} / ${required} fragments` };
        }
        return row;
      })
    : doc.object_streams;

  return {
    doc: {
      ...doc,
      game_meta: nextMeta,
      object_streams: streams,
    },
    latticeComplete: complete,
  };
}

export function openFinaleSwitch(doc: Record<string, unknown>): Record<string, unknown> {
  const meta = normalizeGameMeta(doc.game_meta);
  const streams = Array.isArray(doc.object_streams)
    ? (doc.object_streams as Record<string, unknown>[]).map((row) => {
        if (row.id === "territory" || row.label === "Arch") {
          return { ...row, value: "Live · districts healed" };
        }
        if (row.id === "relay" || row.label === "Finale") {
          return { ...row, value: "Open · alley arch waking" };
        }
        if (row.id === "bulletin" || row.label === "Need") {
          return { ...row, value: "3 / 3 fragments" };
        }
        return row;
      })
    : doc.object_streams;

  return {
    ...doc,
    public_state: "Finale switch live — the alley arch is waking",
    game_meta: meta,
    object_streams: streams,
  };
}

export function patchesForFragmentContribute(fromNodeId: string): {
  finaleNodeId: string;
  finaleObjectId: string;
} | null {
  if (!seasonFragmentNodeIds().includes(fromNodeId)) return null;
  const finaleNodeId = seasonFinaleNodeId();
  const finaleObjectId = seasonObjectIdForNode(finaleNodeId);
  if (!finaleObjectId) return null;
  return { finaleNodeId, finaleObjectId };
}
