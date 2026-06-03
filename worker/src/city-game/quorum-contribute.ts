import { getChildObject, updateChildObjectIfUnchanged } from "../db/child-objects";
import { normalizeGameMeta } from "./game-meta";
import type { CrSeasonConfig } from "./season-config";
import { defaultSeason } from "./season-loader";
import { applyUnlockSideEffects } from "./unlock-evaluator";
import { bumpCollectiveProgress, patchesForQuorumUnlock } from "./unlock-engine";

/** R-07 — retry budget for optimistic quorum writes on one hot child_object row. */
export const QUORUM_CONTRIBUTE_MAX_RETRIES = 24;

export type QuorumContributeBumpResult = {
  collectiveProgress: number;
  collectiveTarget: number;
  quorumComplete: boolean;
  unlockedNodes: string[];
  alreadyComplete: boolean;
};

function parseDocument(json: string): Record<string, unknown> {
  return JSON.parse(json) as Record<string, unknown>;
}

/**
 * Atomically bump collective quorum progress with optimistic concurrency on `updated_at`.
 * Retries when concurrent writers race on the same game_node document.
 */
export async function bumpQuorumProgressWithRetry(
  db: D1Database,
  input: {
    objectId: string;
    parentProfileId: string;
    nodeId: string;
    now: Date;
    season?: CrSeasonConfig;
    maxRetries?: number;
  }
): Promise<QuorumContributeBumpResult | null> {
  const season = input.season ?? defaultSeason();
  const maxRetries = input.maxRetries ?? QUORUM_CONTRIBUTE_MAX_RETRIES;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const existing = await getChildObject(db, input.objectId);
    if (!existing || existing.parent_profile_id !== input.parentProfileId) {
      return null;
    }

    const doc = parseDocument(existing.child_object_document_json);
    const meta = normalizeGameMeta(doc.game_meta);
    const target = meta.collective_target;
    if (target == null) {
      throw new Error("collective_target is required for quorum contribute.");
    }

    const progress = meta.collective_progress ?? 0;
    if (progress >= target) {
      return {
        collectiveProgress: progress,
        collectiveTarget: target,
        quorumComplete: true,
        unlockedNodes: patchesForQuorumUnlock(input.nodeId, season).map((patch) => patch.toNodeId),
        alreadyComplete: true,
      };
    }

    const bumped = bumpCollectiveProgress(doc);
    // Fresh timestamp per attempt — concurrent POSTs must not share the same updated_at (CAS no-op).
    const updatedAt = new Date().toISOString();
    const publicState =
      typeof bumped.doc.public_state === "string"
        ? bumped.doc.public_state
        : existing.public_state;

    const saved = await updateChildObjectIfUnchanged(
      db,
      {
        objectId: input.objectId,
        parentProfileId: input.parentProfileId,
        objectType: existing.object_type,
        publicLabel: existing.public_label,
        publicState,
        status: "active",
        documentJson: JSON.stringify(bumped.doc),
        createdAt: existing.created_at,
        updatedAt,
      },
      existing.updated_at
    );

    if (!saved) continue;

    const unlockEffects = bumped.reachedTarget
      ? await applyUnlockSideEffects(db, input.nodeId, bumped.doc, input.now, season)
      : { unlockedNodes: [] as string[] };

    return {
      collectiveProgress: bumped.meta.collective_progress ?? progress + 1,
      collectiveTarget: target,
      quorumComplete: bumped.reachedTarget,
      unlockedNodes: unlockEffects.unlockedNodes,
      alreadyComplete: false,
    };
  }

  throw new Error("QUORUM_WRITE_CONFLICT");
}
