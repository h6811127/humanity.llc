import { getChildObject, updateChildObject } from "../db/child-objects";
import { normalizeGameMeta } from "./game-meta";
import {
  seasonFragmentNodeIds,
  seasonNodeIdForObject,
  seasonObjectIdForNode,
  seasonQuorumNodeIds,
} from "./season-config";
import {
  fragmentLatticeProgress,
  isFragmentNodeClaimed,
  openFinaleSwitch,
  patchesForFragmentContribute,
  patchesForQuorumUnlock,
  recordFragmentOnFinale,
} from "./unlock-engine";

export type UnlockSideEffectResult = {
  unlockedNodes: string[];
  fragmentsRegistered?: number;
  fragmentsRequired?: number;
  finaleOpen?: boolean;
};

function parseDocument(json: string): Record<string, unknown> {
  return JSON.parse(json) as Record<string, unknown>;
}

async function persistGameNodeDocument(
  db: D1Database,
  row: {
    object_id: string;
    parent_profile_id: string;
    object_type: string;
    public_label: string;
    created_at: string;
  },
  doc: Record<string, unknown>,
  publicState: string,
  updatedAt: string
): Promise<void> {
  await updateChildObject(db, {
    objectId: row.object_id,
    parentProfileId: row.parent_profile_id,
    objectType: row.object_type,
    publicLabel: row.public_label,
    publicState,
    status: "active",
    documentJson: JSON.stringify(doc),
    createdAt: row.created_at,
    updatedAt,
  });
}

/** Run season unlock edges after a game_node document is persisted (contribute or game-update). */
export async function applyUnlockSideEffects(
  db: D1Database,
  nodeId: string,
  sourceDoc: Record<string, unknown>,
  updatedAt: Date
): Promise<UnlockSideEffectResult> {
  const meta = normalizeGameMeta(sourceDoc.game_meta);
  const unlockedNodes: string[] = [];
  let tick = 0;
  const nextUpdatedAt = () => new Date(updatedAt.getTime() + ++tick).toISOString();

  let fragmentsRegistered: number | undefined;
  let fragmentsRequired: number | undefined;
  let finaleOpen: boolean | undefined;

  const target = meta.collective_target;
  const progress = meta.collective_progress ?? 0;
  if (target != null && progress >= target) {
    for (const patch of patchesForQuorumUnlock(nodeId)) {
      const targetRow = await getChildObject(db, patch.objectId);
      if (!targetRow || targetRow.status !== "active") continue;
      const targetDoc = patch.transform(parseDocument(targetRow.child_object_document_json));
      await persistGameNodeDocument(
        db,
        targetRow,
        targetDoc,
        typeof targetDoc.public_state === "string"
          ? targetDoc.public_state
          : targetRow.public_state,
        nextUpdatedAt()
      );
      unlockedNodes.push(patch.toNodeId);
    }
  }

  if (isFragmentNodeClaimed(meta, nodeId)) {
    const fragmentPatch = patchesForFragmentContribute(nodeId);
    if (fragmentPatch) {
      const finaleRow = await getChildObject(db, fragmentPatch.finaleObjectId);
      if (finaleRow && finaleRow.status === "active") {
        let finaleDoc = parseDocument(finaleRow.child_object_document_json);
        const recorded = recordFragmentOnFinale(finaleDoc, nodeId);
        finaleDoc = recorded.doc;
        const lattice = fragmentLatticeProgress(normalizeGameMeta(finaleDoc.game_meta));
        fragmentsRegistered = lattice.claimed;
        fragmentsRequired = lattice.required;
        finaleOpen = recorded.latticeComplete;

        if (recorded.latticeComplete) {
          finaleDoc = openFinaleSwitch(finaleDoc);
          if (!unlockedNodes.includes(fragmentPatch.finaleNodeId)) {
            unlockedNodes.push(fragmentPatch.finaleNodeId);
          }
        }

        await persistGameNodeDocument(
          db,
          finaleRow,
          finaleDoc,
          typeof finaleDoc.public_state === "string"
            ? finaleDoc.public_state
            : finaleRow.public_state,
          nextUpdatedAt()
        );
      }
    }
  }

  return {
    unlockedNodes,
    ...(fragmentsRegistered != null
      ? { fragmentsRegistered, fragmentsRequired, finaleOpen }
      : {}),
  };
}

export function seasonNodeIdFromObjectId(objectId: string): string | null {
  return seasonNodeIdForObject(objectId);
}

async function quorumUnlockNeedsRepair(
  db: D1Database,
  fromNodeId: string,
  sourceDoc: Record<string, unknown>
): Promise<boolean> {
  const meta = normalizeGameMeta(sourceDoc.game_meta);
  const target = meta.collective_target;
  const progress = meta.collective_progress ?? 0;
  if (target == null || progress < target) return false;

  for (const patch of patchesForQuorumUnlock(fromNodeId)) {
    const targetRow = await getChildObject(db, patch.objectId);
    if (!targetRow || targetRow.status !== "active") continue;
    const targetDoc = parseDocument(targetRow.child_object_document_json);
    const targetMeta = normalizeGameMeta(targetDoc.game_meta);
    if (!targetMeta.unlocked_by.includes(fromNodeId)) return true;
  }
  return false;
}

async function fragmentUnlockNeedsRepair(
  db: D1Database,
  fromNodeId: string,
  sourceDoc: Record<string, unknown>
): Promise<boolean> {
  const meta = normalizeGameMeta(sourceDoc.game_meta);
  if (!isFragmentNodeClaimed(meta, fromNodeId)) return false;

  const fragmentPatch = patchesForFragmentContribute(fromNodeId);
  if (!fragmentPatch) return false;

  const finaleRow = await getChildObject(db, fragmentPatch.finaleObjectId);
  if (!finaleRow || finaleRow.status !== "active") return false;

  const finaleDoc = parseDocument(finaleRow.child_object_document_json);
  const finaleMeta = normalizeGameMeta(finaleDoc.game_meta);
  if (!finaleMeta.unlocked_by.includes(fromNodeId)) return true;

  const lattice = fragmentLatticeProgress(finaleMeta);
  if (lattice.complete && !String(finaleRow.public_state).includes("Finale switch live")) {
    return true;
  }
  return false;
}

/** Repair unlock graph drift after manual game-update or legacy state (no contribute side effects). */
export async function reconcileSeasonUnlockDrift(
  db: D1Database,
  now: Date
): Promise<{ repaired: string[] }> {
  const repaired: string[] = [];

  for (const nodeId of seasonQuorumNodeIds()) {
    const objectId = seasonObjectIdForNode(nodeId);
    if (!objectId) continue;
    const row = await getChildObject(db, objectId);
    if (!row || row.status !== "active") continue;
    const doc = parseDocument(row.child_object_document_json);
    if (!(await quorumUnlockNeedsRepair(db, nodeId, doc))) continue;
    const result = await applyUnlockSideEffects(db, nodeId, doc, now);
    repaired.push(...result.unlockedNodes);
  }

  for (const nodeId of seasonFragmentNodeIds()) {
    const objectId = seasonObjectIdForNode(nodeId);
    if (!objectId) continue;
    const row = await getChildObject(db, objectId);
    if (!row || row.status !== "active") continue;
    const doc = parseDocument(row.child_object_document_json);
    if (!(await fragmentUnlockNeedsRepair(db, nodeId, doc))) continue;
    const result = await applyUnlockSideEffects(db, nodeId, doc, now);
    repaired.push(...result.unlockedNodes);
  }

  return { repaired: [...new Set(repaired)] };
}
