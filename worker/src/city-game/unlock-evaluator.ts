import { getChildObject, updateChildObjectIfUnchanged } from "../db/child-objects";
import { normalizeGameMeta } from "./game-meta";
import {
  seasonFragmentNodeIds,
  seasonNodeIdForObject,
  seasonObjectIdForNode,
  seasonQuorumNodeIds,
  type CrSeasonConfig,
} from "./season-config";
import { defaultSeason } from "./season-loader";
import {
  evolveRiverLanternAntiHoarding,
  fragmentLatticeProgress,
  isFragmentNodeClaimed,
  openFinaleSwitch,
  patchesForFragmentContribute,
  patchesForQuorumUnlock,
  recordFragmentOnFinale,
  riverLanternNeedsAntiHoardingEvolve,
} from "./unlock-engine";

export type UnlockSideEffectResult = {
  unlockedNodes: string[];
  fragmentsRegistered?: number;
  fragmentsRequired?: number;
  finaleOpen?: boolean;
};

const UNLOCK_SIDE_EFFECT_MAX_RETRIES = 24;

function parseDocument(json: string): Record<string, unknown> {
  return JSON.parse(json) as Record<string, unknown>;
}

async function persistGameNodeDocumentIfUnchanged(
  db: D1Database,
  row: {
    object_id: string;
    parent_profile_id: string;
    object_type: string;
    public_label: string;
    created_at: string;
    updated_at: string;
  },
  doc: Record<string, unknown>,
  publicState: string,
  updatedAt: string
): Promise<boolean> {
  return updateChildObjectIfUnchanged(
    db,
    {
      objectId: row.object_id,
      parentProfileId: row.parent_profile_id,
      objectType: row.object_type,
      publicLabel: row.public_label,
      publicState,
      status: "active",
      documentJson: JSON.stringify(doc),
      createdAt: row.created_at,
      updatedAt,
    },
    row.updated_at
  );
}

async function patchGameNodeDocumentWithRetry(
  db: D1Database,
  objectId: string,
  nextUpdatedAt: () => string,
  transform: (
    doc: Record<string, unknown>,
    row: NonNullable<Awaited<ReturnType<typeof getChildObject>>>
  ) => Record<string, unknown> | null
): Promise<Record<string, unknown> | null> {
  for (let attempt = 0; attempt < UNLOCK_SIDE_EFFECT_MAX_RETRIES; attempt += 1) {
    const row = await getChildObject(db, objectId);
    if (!row || row.status !== "active") return null;
    const doc = parseDocument(row.child_object_document_json);
    const nextDoc = transform(doc, row);
    if (!nextDoc) return null;
    const saved = await persistGameNodeDocumentIfUnchanged(
      db,
      row,
      nextDoc,
      typeof nextDoc.public_state === "string" ? nextDoc.public_state : row.public_state,
      nextUpdatedAt()
    );
    if (saved) return nextDoc;
  }
  throw new Error("UNLOCK_WRITE_CONFLICT");
}

/** Run season unlock edges after a game_node document is persisted (contribute or game-update). */
export async function applyUnlockSideEffects(
  db: D1Database,
  nodeId: string,
  sourceDoc: Record<string, unknown>,
  updatedAt: Date,
  season: CrSeasonConfig = defaultSeason()
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
    if (riverLanternNeedsAntiHoardingEvolve(sourceDoc)) {
      const sourceObjectId = seasonObjectIdForNode(nodeId, season);
      if (sourceObjectId) {
        await patchGameNodeDocumentWithRetry(db, sourceObjectId, nextUpdatedAt, (currentDoc) =>
          riverLanternNeedsAntiHoardingEvolve(currentDoc)
            ? evolveRiverLanternAntiHoarding(currentDoc)
            : null
        );
      }
    }

    for (const patch of patchesForQuorumUnlock(nodeId, season)) {
      const saved = await patchGameNodeDocumentWithRetry(
        db,
        patch.objectId,
        nextUpdatedAt,
        (currentDoc) => {
          const targetMeta = normalizeGameMeta(currentDoc.game_meta);
          if (targetMeta.unlocked_by.includes(nodeId)) return null;
          return patch.transform(currentDoc);
        }
      );
      if (saved) unlockedNodes.push(patch.toNodeId);
    }
  }

  if (isFragmentNodeClaimed(meta, nodeId)) {
    const fragmentPatch = patchesForFragmentContribute(nodeId, season);
    if (fragmentPatch) {
      const finaleSaved = await patchGameNodeDocumentWithRetry(
        db,
        fragmentPatch.finaleObjectId,
        nextUpdatedAt,
        (currentDoc) => {
          let finaleDoc = currentDoc;
          const recorded = recordFragmentOnFinale(
            finaleDoc,
            nodeId,
            seasonFragmentNodeIds(season)
          );
          finaleDoc = recorded.doc;
          const lattice = fragmentLatticeProgress(
            normalizeGameMeta(finaleDoc.game_meta),
            seasonFragmentNodeIds(season)
          );
          fragmentsRegistered = lattice.claimed;
          fragmentsRequired = lattice.required;
          finaleOpen = recorded.latticeComplete;

          if (recorded.latticeComplete) {
            finaleDoc = openFinaleSwitch(finaleDoc);
          }

          return finaleDoc;
        }
      );
      if (finaleSaved && finaleOpen && !unlockedNodes.includes(fragmentPatch.finaleNodeId)) {
        unlockedNodes.push(fragmentPatch.finaleNodeId);
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

export function seasonNodeIdFromObjectId(
  objectId: string,
  season: CrSeasonConfig = defaultSeason()
): string | null {
  return seasonNodeIdForObject(objectId, season);
}

async function quorumUnlockNeedsRepair(
  db: D1Database,
  fromNodeId: string,
  sourceDoc: Record<string, unknown>,
  season: CrSeasonConfig
): Promise<boolean> {
  const meta = normalizeGameMeta(sourceDoc.game_meta);
  const target = meta.collective_target;
  const progress = meta.collective_progress ?? 0;
  if (target == null || progress < target) return false;

  for (const patch of patchesForQuorumUnlock(fromNodeId, season)) {
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
  sourceDoc: Record<string, unknown>,
  season: CrSeasonConfig
): Promise<boolean> {
  const meta = normalizeGameMeta(sourceDoc.game_meta);
  if (!isFragmentNodeClaimed(meta, fromNodeId)) return false;

  const fragmentPatch = patchesForFragmentContribute(fromNodeId, season);
  if (!fragmentPatch) return false;

  const finaleRow = await getChildObject(db, fragmentPatch.finaleObjectId);
  if (!finaleRow || finaleRow.status !== "active") return false;

  const finaleDoc = parseDocument(finaleRow.child_object_document_json);
  const finaleMeta = normalizeGameMeta(finaleDoc.game_meta);
  if (!finaleMeta.unlocked_by.includes(fromNodeId)) return true;

  const lattice = fragmentLatticeProgress(finaleMeta, seasonFragmentNodeIds(season));
  if (lattice.complete && !String(finaleRow.public_state).includes("Finale switch live")) {
    return true;
  }
  return false;
}

/** Repair unlock graph drift after manual game-update or legacy state (no contribute side effects). */
export async function reconcileSeasonUnlockDrift(
  db: D1Database,
  now: Date,
  season: CrSeasonConfig = defaultSeason()
): Promise<{ repaired: string[] }> {
  const repaired: string[] = [];

  for (const nodeId of seasonQuorumNodeIds(season)) {
    const objectId = seasonObjectIdForNode(nodeId, season);
    if (!objectId) continue;
    const row = await getChildObject(db, objectId);
    if (!row || row.status !== "active") continue;
    const doc = parseDocument(row.child_object_document_json);
    if (!(await quorumUnlockNeedsRepair(db, nodeId, doc, season))) continue;
    const result = await applyUnlockSideEffects(db, nodeId, doc, now, season);
    repaired.push(...result.unlockedNodes);
  }

  for (const nodeId of seasonFragmentNodeIds(season)) {
    const objectId = seasonObjectIdForNode(nodeId, season);
    if (!objectId) continue;
    const row = await getChildObject(db, objectId);
    if (!row || row.status !== "active") continue;
    const doc = parseDocument(row.child_object_document_json);
    if (!(await fragmentUnlockNeedsRepair(db, nodeId, doc, season))) continue;
    const result = await applyUnlockSideEffects(db, nodeId, doc, now, season);
    repaired.push(...result.unlockedNodes);
  }

  return { repaired: [...new Set(repaired)] };
}
