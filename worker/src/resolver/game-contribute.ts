import { PROFILE_ID_REGEX } from "../crypto";
import { isCareStreamPaused } from "../city-game/scan-view";
import { validateGameNodeDocument, normalizeGameMeta } from "../city-game/game-meta";
import { GAME_NODE_OBJECT_TYPE, isCityGameEnabled } from "../city-game/constants";
import {
  isSeasonContributeOpen,
  resolveSeasonWindowPhase,
  seasonWindowContributeMessage,
} from "../city-game/season-window";
import {
  normalizeSiteCode,
  seasonContributeCode,
  seasonContributableNodeIds,
  seasonFinaleNodeId,
  seasonFragmentNodeIds,
  seasonNodeIdForObject,
  seasonObjectIdForNode,
  seasonVouchTargetsFrom,
} from "../city-game/season-config";
import { resolveSeasonForProfile } from "../city-game/season-loader";
import { applyUnlockSideEffects } from "../city-game/unlock-evaluator";
import { bumpQuorumProgressWithRetry } from "../city-game/quorum-contribute";
import {
  applyRelayContributeWithRetry,
  type RelayContributeAction,
} from "../city-game/relay-contribute";
import { isGameFaction, type GameFaction } from "../city-game/factions";
import {
  fragmentLatticeProgress,
  gameNodeContributeMode,
  issueWitnessSunsetPass,
  markFragmentNodeClaimed,
  patchesForQuorumUnlock,
} from "../city-game/unlock-engine";
import type { CrSeasonConfig } from "../city-game/season-config";
import { getChildObject, updateChildObjectIfUnchanged } from "../db/child-objects";
import {
  gameContributeObjectDailyCapReached,
  incrementGameContributeBucket,
} from "../db/game-contribute";
import { checkGameContributeRateLimit, hashIp } from "../db/rate-limit";
import {
  enforceGameContributeSeasonQuota,
  recordGameContributeSeasonUsage,
} from "../city-game/season-quota";
import { loadQrCredentialById } from "../db/qr-metadata";
import { clientIp, errorResponse, jsonResponse } from "../http/resolver";
import { parseObjectStreamsFromDocument } from "../validation/object-streams";
import { CHILD_OBJECT_ID_REGEX } from "./child-objects";

type ContributeBody = {
  qr_id?: string;
  site_code?: string;
  action?: string;
  faction?: string;
};

const GAME_CONTRIBUTE_WRITE_MAX_RETRIES = 24;

function parseRelayAction(raw: string | undefined): RelayContributeAction {
  const action = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (action === "reinforce") return "reinforce";
  return "capture";
}

function parseFaction(raw: string | undefined): GameFaction | null {
  const faction = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return isGameFaction(faction) ? faction : null;
}

function utcDateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function parseDocument(json: string): Record<string, unknown> {
  return JSON.parse(json) as Record<string, unknown>;
}

async function fragmentAlreadyClaimedPayload(
  db: D1Database,
  objectId: string,
  nodeId: string,
  season: CrSeasonConfig
): Promise<Record<string, unknown>> {
  const finaleObjectId = seasonObjectIdForNode(seasonFinaleNodeId(season), season);
  let lattice = {
    claimed: 0,
    required: seasonFragmentNodeIds(season).length,
    complete: false,
  };
  if (finaleObjectId) {
    const finaleRow = await getChildObject(db, finaleObjectId);
    if (finaleRow) {
      const finaleDoc = parseDocument(finaleRow.child_object_document_json);
      lattice = fragmentLatticeProgress(
        normalizeGameMeta(finaleDoc.game_meta),
        seasonFragmentNodeIds(season)
      );
    }
  }
  return {
    object_id: objectId,
    node_id: nodeId,
    contribute_mode: "fragment",
    fragment_claimed: true,
    fragments_registered: lattice.claimed,
    fragments_required: lattice.required,
    finale_open: lattice.complete,
    message: "Fragment already registered.",
  };
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

async function recordSuccessfulContribute(
  db: D1Database,
  objectId: string,
  seasonId: string,
  bucketDate: string
): Promise<void> {
  await incrementGameContributeBucket(db, objectId, seasonId, bucketDate);
  await recordGameContributeSeasonUsage(db, seasonId);
}

async function issueWitnessSunsetPassWithRetry(
  db: D1Database,
  input: {
    objectId: string;
    parentProfileId: string;
    nodeId: string;
    season: CrSeasonConfig;
    maxRetries?: number;
  }
): Promise<{ scarcityRemaining: number; depleted: boolean; vouchTargets: string[] } | null> {
  const maxRetries = input.maxRetries ?? GAME_CONTRIBUTE_WRITE_MAX_RETRIES;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const row = await getChildObject(db, input.objectId);
    if (!row || row.parent_profile_id !== input.parentProfileId) return null;
    const doc = parseDocument(row.child_object_document_json);
    const meta = normalizeGameMeta(doc.game_meta);
    if (meta.scarcity_remaining == null || meta.scarcity_remaining <= 0) {
      throw new Error("WITNESS_DEPLETED");
    }
    const issued = issueWitnessSunsetPass(doc, input.nodeId, input.season);
    const saved = await persistGameNodeDocumentIfUnchanged(
      db,
      row,
      issued.doc,
      typeof issued.doc.public_state === "string" ? issued.doc.public_state : row.public_state,
      new Date().toISOString()
    );
    if (!saved) continue;
    return {
      scarcityRemaining: issued.meta.scarcity_remaining ?? 0,
      depleted: issued.depleted,
      vouchTargets: seasonVouchTargetsFrom(input.nodeId, input.season),
    };
  }
  throw new Error("SCARCITY_WRITE_CONFLICT");
}

async function markFragmentNodeClaimedWithRetry(
  db: D1Database,
  input: {
    objectId: string;
    parentProfileId: string;
    nodeId: string;
    maxRetries?: number;
  }
): Promise<{ doc: Record<string, unknown>; alreadyClaimed: boolean } | null> {
  const maxRetries = input.maxRetries ?? GAME_CONTRIBUTE_WRITE_MAX_RETRIES;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const row = await getChildObject(db, input.objectId);
    if (!row || row.parent_profile_id !== input.parentProfileId) return null;
    const doc = parseDocument(row.child_object_document_json);
    const meta = normalizeGameMeta(doc.game_meta);
    if (meta.unlocked_by.includes(input.nodeId)) {
      return { doc, alreadyClaimed: true };
    }
    const marked = markFragmentNodeClaimed(doc, input.nodeId);
    const saved = await persistGameNodeDocumentIfUnchanged(
      db,
      row,
      marked,
      typeof marked.public_state === "string" ? marked.public_state : row.public_state,
      new Date().toISOString()
    );
    if (!saved) continue;
    return { doc: marked, alreadyClaimed: false };
  }
  throw new Error("FRAGMENT_WRITE_CONFLICT");
}

export async function handlePostGameContribute(
  request: Request,
  db: D1Database,
  env: {
    CITY_GAME_ENABLED?: string;
    CITY_GAME_LOCAL_PLAY_OPEN?: string;
    CITY_GAME_RELAY_CAPTURE_PLAYER?: string;
  },
  pathProfileId: string,
  pathObjectId: string
): Promise<Response> {
  if (!isCityGameEnabled(env)) {
    return errorResponse("NOT_AVAILABLE", "City game endpoints are not enabled.", 404);
  }

  const season = resolveSeasonForProfile(pathProfileId);
  if (!season) {
    return errorResponse("NOT_FOUND", "City game season not found for this profile.", 404);
  }

  const seasonQuota = await enforceGameContributeSeasonQuota(db, season);
  if (seasonQuota) return seasonQuota;

  const now = new Date();
  const windowPhase = resolveSeasonWindowPhase(now, season);
  if (!isSeasonContributeOpen(windowPhase, env)) {
    return errorResponse(
      "SEASON_CLOSED",
      seasonWindowContributeMessage(windowPhase),
      409
    );
  }

  if (!PROFILE_ID_REGEX.test(pathProfileId)) {
    return errorResponse("INVALID_PROFILE_ID", "Invalid profile_id.", 400);
  }
  if (!CHILD_OBJECT_ID_REGEX.test(pathObjectId)) {
    return errorResponse("INVALID_OBJECT_ID", "Invalid object_id.", 400);
  }

  let body: ContributeBody;
  try {
    body = (await request.json()) as ContributeBody;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const qrId = typeof body.qr_id === "string" ? body.qr_id.trim() : "";
  const siteCodeRaw = typeof body.site_code === "string" ? body.site_code : "";
  if (!qrId) {
    return errorResponse("MALFORMED_REQUEST", "qr_id is required.", 400);
  }
  if (!siteCodeRaw.trim()) {
    return errorResponse("MALFORMED_REQUEST", "site_code is required.", 400);
  }

  const qr = await loadQrCredentialById(db, qrId);
  if (!qr || qr.profile_id !== pathProfileId || qr.status !== "active") {
    return errorResponse("NOT_FOUND", "QR credential not found or not active.", 404);
  }
  if (qr.scope !== "child_object" || qr.object_id !== pathObjectId) {
    return errorResponse("QR_OBJECT_MISMATCH", "QR does not match this object.", 422);
  }

  const existing = await getChildObject(db, pathObjectId);
  if (!existing || existing.parent_profile_id !== pathProfileId) {
    return errorResponse("NOT_FOUND", "Child object not found.", 404);
  }
  if (existing.object_type !== GAME_NODE_OBJECT_TYPE || existing.status !== "active") {
    return errorResponse("OBJECT_NOT_ACTIVE", "Game node is not active.", 409);
  }

  const nodeId = seasonNodeIdForObject(pathObjectId, season);
  if (!nodeId || !seasonContributableNodeIds(season).includes(nodeId)) {
    return errorResponse("NOT_CONTRIBUTABLE", "This object does not accept public contributions.", 422);
  }

  const expectedCode = seasonContributeCode(nodeId, season);
  if (!expectedCode) {
    return errorResponse("NOT_CONTRIBUTABLE", "Site code is not configured for this node.", 503);
  }
  if (normalizeSiteCode(siteCodeRaw) !== normalizeSiteCode(expectedCode.code)) {
    return errorResponse("INVALID_SITE_CODE", "Site code does not match this place.", 403);
  }
  if (expectedCode.epoch !== season.season_id) {
    return errorResponse("SEASON_MISMATCH", "Site code is not valid for this season.", 403);
  }

  let doc = parseDocument(existing.child_object_document_json);
  let fields;
  try {
    fields = validateGameNodeDocument(doc);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid game_node document.";
    return errorResponse("MALFORMED_OBJECT", msg, 422);
  }

  const streams = parseObjectStreamsFromDocument(doc);
  if (isCareStreamPaused(streams)) {
    return errorResponse(
      "CARE_PAUSE",
      "Game contributions are paused while maintenance is live on the care stream.",
      409
    );
  }

  const meta = fields.gameMeta;

  if (fields.seasonId !== season.season_id) {
    return errorResponse("SEASON_MISMATCH", "Object season does not match this game.", 403);
  }

  if (nodeId && seasonFragmentNodeIds(season).includes(nodeId) && meta.unlocked_by.includes(nodeId)) {
    return jsonResponse(
      await fragmentAlreadyClaimedPayload(db, pathObjectId, nodeId, season),
      200,
      { "Cache-Control": "no-store" }
    );
  }

  const contributeMode = gameNodeContributeMode(nodeId, meta, fields.nodeRole, season, env);
  if (!contributeMode) {
    return errorResponse("NOT_CONTRIBUTABLE", "This object is not accepting contributions.", 422);
  }

  if (contributeMode === "quorum") {
    const target = meta.collective_target;
    if (target == null) {
      return errorResponse("NOT_CONTRIBUTABLE", "This object has no collective target.", 422);
    }

    const progress = meta.collective_progress ?? 0;
    if (progress >= target) {
      return jsonResponse(
        {
          object_id: pathObjectId,
          node_id: nodeId,
          contribute_mode: "quorum",
          collective_progress: progress,
          collective_target: target,
          quorum_complete: true,
          unlocked_nodes: patchesForQuorumUnlock(nodeId, season).map((p) => p.toNodeId),
          message: "Quorum already complete.",
        },
        200,
        { "Cache-Control": "no-store" }
      );
    }
  }

  const bucketDate = utcDateKey(now);

  const ipHash = await hashIp(clientIp(request));
  const ipRate = await checkGameContributeRateLimit(db, ipHash, now);
  if (!ipRate.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      "Too many contribution attempts from this network. Try again later.",
      429,
      ipRate.retryAfterSec ? { "Retry-After": String(ipRate.retryAfterSec) } : undefined
    );
  }

  if (
    await gameContributeObjectDailyCapReached(
      db,
      pathObjectId,
      fields.seasonId,
      bucketDate
    )
  ) {
    return errorResponse(
      "OBJECT_CAP",
      "This object has reached its daily contribution limit.",
      429
    );
  }

  if (contributeMode === "quorum") {
    const target = meta.collective_target!;
    try {
      const bumped = await bumpQuorumProgressWithRetry(db, {
        objectId: pathObjectId,
        parentProfileId: pathProfileId,
        nodeId,
        now,
        season,
      });
      if (!bumped) {
        return errorResponse("NOT_FOUND", "Child object not found.", 404);
      }
      if (!bumped.alreadyComplete) {
        await recordSuccessfulContribute(db, pathObjectId, fields.seasonId, bucketDate);
      }

      return jsonResponse(
        {
          object_id: pathObjectId,
          node_id: nodeId,
          contribute_mode: "quorum",
          collective_progress: bumped.collectiveProgress,
          collective_target: bumped.collectiveTarget,
          quorum_complete: bumped.quorumComplete,
          unlocked_nodes: bumped.unlockedNodes,
          ...(bumped.alreadyComplete ? { message: "Quorum already complete." } : {}),
        },
        200,
        { "Cache-Control": "no-store" }
      );
    } catch (e) {
      if (e instanceof Error && e.message === "QUORUM_WRITE_CONFLICT") {
        return errorResponse(
          "QUORUM_WRITE_CONFLICT",
          "Quorum update conflict under load. Try again.",
          409
        );
      }
      throw e;
    }
  }

  if (contributeMode === "scarcity") {
    try {
      const issued = await issueWitnessSunsetPassWithRetry(db, {
        objectId: pathObjectId,
        parentProfileId: pathProfileId,
        nodeId,
        season,
      });
      if (!issued) {
        return errorResponse("NOT_FOUND", "Child object not found.", 404);
      }
      await recordSuccessfulContribute(db, pathObjectId, fields.seasonId, bucketDate);

      return jsonResponse(
        {
          object_id: pathObjectId,
          node_id: nodeId,
          contribute_mode: "scarcity",
          pass_issued: true,
          scarcity_remaining: issued.scarcityRemaining,
          witness_depleted: issued.depleted,
          vouch_targets: issued.vouchTargets,
        },
        200,
        { "Cache-Control": "no-store" }
      );
    } catch (e) {
      if (e instanceof Error) {
        if (e.message === "WITNESS_DEPLETED") {
          return errorResponse(
            "WITNESS_DEPLETED",
            "Witness sunset passes were exhausted by another contribution. Try another node.",
            409
          );
        }
        if (e.message === "SCARCITY_WRITE_CONFLICT") {
          return errorResponse(
            "SCARCITY_WRITE_CONFLICT",
            "Witness pass update conflict under load. Try again.",
            409
          );
        }
      }
      throw e;
    }
  }

  if (contributeMode === "capture") {
    const faction = parseFaction(body.faction);
    if (!faction) {
      return errorResponse(
        "MALFORMED_REQUEST",
        "faction is required (red, blue, green, or yellow).",
        400
      );
    }
    const relayAction = parseRelayAction(body.action);

    try {
      const relayResult = await applyRelayContributeWithRetry(db, {
        objectId: pathObjectId,
        parentProfileId: pathProfileId,
        faction,
        action: relayAction,
        now,
        season,
      });
      if (!relayResult) {
        return errorResponse("NOT_FOUND", "Child object not found.", 404);
      }
      await recordSuccessfulContribute(db, pathObjectId, fields.seasonId, bucketDate);

      return jsonResponse(
        {
          object_id: pathObjectId,
          node_id: nodeId,
          contribute_mode: relayResult.actionApplied,
          held_by_faction: relayResult.heldByFaction,
          held_until: relayResult.heldUntil,
          relay_compromised: relayResult.overharvestTriggered,
        },
        200,
        { "Cache-Control": "no-store" }
      );
    } catch (e) {
      if (e instanceof Error) {
        if (e.message === "RELAY_WRITE_CONFLICT") {
          return errorResponse(
            "RELAY_WRITE_CONFLICT",
            "Relay update conflict under load. Try again.",
            409
          );
        }
        if (e.message === "RELAY_COMPROMISED") {
          return errorResponse(
            "RELAY_COMPROMISED",
            "This relay is compromised — rekey before capture.",
            409
          );
        }
        if (e.message === "RELAY_SHIELDED") {
          return errorResponse(
            "RELAY_SHIELDED",
            "Shield artifact active — this relay cannot be captured until the hold expires.",
            409
          );
        }
        if (e.message === "REINFORCE_FACTION_MISMATCH") {
          return errorResponse(
            "REINFORCE_FACTION_MISMATCH",
            "Reinforce only works when your faction already holds this relay.",
            409
          );
        }
      }
      throw e;
    }
  }

  if (contributeMode !== "fragment") {
    return errorResponse("NOT_CONTRIBUTABLE", "This object is not accepting contributions.", 422);
  }

  let marked;
  try {
    marked = await markFragmentNodeClaimedWithRetry(db, {
      objectId: pathObjectId,
      parentProfileId: pathProfileId,
      nodeId,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "FRAGMENT_WRITE_CONFLICT") {
      return errorResponse(
        "FRAGMENT_WRITE_CONFLICT",
        "Fragment update conflict under load. Try again.",
        409
      );
    }
    throw e;
  }
  if (!marked) {
    return errorResponse("NOT_FOUND", "Child object not found.", 404);
  }
  if (marked.alreadyClaimed) {
    return jsonResponse(
      await fragmentAlreadyClaimedPayload(db, pathObjectId, nodeId, season),
      200,
      { "Cache-Control": "no-store" }
    );
  }

  const unlockEffects = await applyUnlockSideEffects(db, nodeId, marked.doc, now, season);
  await recordSuccessfulContribute(db, pathObjectId, fields.seasonId, bucketDate);

  return jsonResponse(
    {
      object_id: pathObjectId,
      node_id: nodeId,
      contribute_mode: "fragment",
      fragment_claimed: true,
      fragments_registered: unlockEffects.fragmentsRegistered ?? 0,
      fragments_required: unlockEffects.fragmentsRequired ?? seasonFragmentNodeIds(season).length,
      finale_open: unlockEffects.finaleOpen ?? false,
      unlocked_nodes: unlockEffects.unlockedNodes,
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
