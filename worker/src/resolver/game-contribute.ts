import { PROFILE_ID_REGEX } from "../crypto";
import { isCareStreamPaused } from "../city-game/scan-view";
import { validateGameNodeDocument, normalizeGameMeta } from "../city-game/game-meta";
import { GAME_NODE_OBJECT_TYPE, isCityGameEnabled } from "../city-game/constants";
import {
  isSeasonPlayOpen,
  resolveSeasonWindowPhase,
  seasonWindowContributeMessage,
} from "../city-game/season-window";
import {
  CR_SEASON_01,
  normalizeSiteCode,
  seasonContributeCode,
  seasonContributableNodeIds,
  seasonFinaleNodeId,
  seasonFragmentNodeIds,
  seasonNodeIdForObject,
  seasonObjectIdForNode,
} from "../city-game/season-config";
import {
  bumpCollectiveProgress,
  fragmentLatticeProgress,
  gameNodeContributeMode,
  issueWitnessSunsetPass,
  markFragmentNodeClaimed,
  openFinaleSwitch,
  patchesForFragmentContribute,
  patchesForQuorumUnlock,
  recordFragmentOnFinale,
} from "../city-game/unlock-engine";
import { seasonVouchTargetsFrom } from "../city-game/season-config";
import { getChildObject, updateChildObject } from "../db/child-objects";
import {
  gameContributeObjectDailyCapReached,
  incrementGameContributeBucket,
} from "../db/game-contribute";
import { checkGameContributeRateLimit, hashIp } from "../db/rate-limit";
import { loadQrCredentialById } from "../db/qr-metadata";
import { clientIp, errorResponse, jsonResponse } from "../http/resolver";
import { parseObjectStreamsFromDocument } from "../validation/object-streams";
import { CHILD_OBJECT_ID_REGEX } from "./child-objects";

type ContributeBody = {
  qr_id?: string;
  site_code?: string;
};

function utcDateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

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

export async function handlePostGameContribute(
  request: Request,
  db: D1Database,
  env: { CITY_GAME_ENABLED?: string },
  pathProfileId: string,
  pathObjectId: string
): Promise<Response> {
  if (!isCityGameEnabled(env)) {
    return errorResponse("NOT_AVAILABLE", "City game endpoints are not enabled.", 404);
  }

  const now = new Date();
  const windowPhase = resolveSeasonWindowPhase(now);
  if (!isSeasonPlayOpen(windowPhase)) {
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

  const nodeId = seasonNodeIdForObject(pathObjectId);
  if (!nodeId || !seasonContributableNodeIds().includes(nodeId)) {
    return errorResponse("NOT_CONTRIBUTABLE", "This object does not accept public contributions.", 422);
  }

  const expectedCode = seasonContributeCode(nodeId);
  if (!expectedCode) {
    return errorResponse("NOT_CONTRIBUTABLE", "Site code is not configured for this node.", 503);
  }
  if (normalizeSiteCode(siteCodeRaw) !== normalizeSiteCode(expectedCode.code)) {
    return errorResponse("INVALID_SITE_CODE", "Site code does not match this place.", 403);
  }
  if (expectedCode.epoch !== CR_SEASON_01.season_id) {
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
  const contributeMode = gameNodeContributeMode(nodeId, meta, fields.nodeRole);
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
          unlocked_nodes: patchesForQuorumUnlock(nodeId).map((p) => p.toNodeId),
          message: "Quorum already complete.",
        },
        200,
        { "Cache-Control": "no-store" }
      );
    }
  } else if (contributeMode === "fragment" && meta.unlocked_by.includes(nodeId)) {
    const finaleObjectId = seasonObjectIdForNode(seasonFinaleNodeId());
    let lattice = { claimed: 0, required: seasonFragmentNodeIds().length, complete: false };
    if (finaleObjectId) {
      const finaleRow = await getChildObject(db, finaleObjectId);
      if (finaleRow) {
        const finaleDoc = parseDocument(finaleRow.child_object_document_json);
        lattice = fragmentLatticeProgress(normalizeGameMeta(finaleDoc.game_meta));
      }
    }
    return jsonResponse(
      {
        object_id: pathObjectId,
        node_id: nodeId,
        contribute_mode: "fragment",
        fragment_claimed: true,
        fragments_registered: lattice.claimed,
        fragments_required: lattice.required,
        finale_open: lattice.complete,
        message: "Fragment already registered.",
      },
      200,
      { "Cache-Control": "no-store" }
    );
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

  await incrementGameContributeBucket(db, pathObjectId, fields.seasonId, bucketDate);

  if (contributeMode === "quorum") {
    const target = meta.collective_target!;
    const bumped = bumpCollectiveProgress(doc);
    doc = bumped.doc;
    const updatedAt = now.toISOString();

    await persistGameNodeDocument(
      db,
      existing,
      doc,
      typeof doc.public_state === "string" ? doc.public_state : existing.public_state,
      updatedAt
    );

    const unlockedNodes: string[] = [];
    if (bumped.reachedTarget) {
      for (const patch of patchesForQuorumUnlock(nodeId)) {
        const targetRow = await getChildObject(db, patch.objectId);
        if (!targetRow || targetRow.status !== "active") continue;
        const targetDoc = patch.transform(parseDocument(targetRow.child_object_document_json));
        const targetUpdatedAt = new Date(now.getTime() + 1).toISOString();
        await persistGameNodeDocument(
          db,
          targetRow,
          targetDoc,
          typeof targetDoc.public_state === "string"
            ? targetDoc.public_state
            : targetRow.public_state,
          targetUpdatedAt
        );
        unlockedNodes.push(patch.toNodeId);
      }
    }

    return jsonResponse(
      {
        object_id: pathObjectId,
        node_id: nodeId,
        contribute_mode: "quorum",
        collective_progress: bumped.meta.collective_progress,
        collective_target: target,
        quorum_complete: bumped.reachedTarget,
        unlocked_nodes: unlockedNodes,
      },
      200,
      { "Cache-Control": "no-store" }
    );
  }

  if (contributeMode === "scarcity") {
    const issued = issueWitnessSunsetPass(doc, nodeId);
    doc = issued.doc;
    const updatedAt = now.toISOString();

    await persistGameNodeDocument(
      db,
      existing,
      doc,
      typeof doc.public_state === "string" ? doc.public_state : existing.public_state,
      updatedAt
    );

    return jsonResponse(
      {
        object_id: pathObjectId,
        node_id: nodeId,
        contribute_mode: "scarcity",
        pass_issued: true,
        scarcity_remaining: issued.meta.scarcity_remaining,
        witness_depleted: issued.depleted,
        vouch_targets: seasonVouchTargetsFrom(nodeId),
      },
      200,
      { "Cache-Control": "no-store" }
    );
  }

  doc = markFragmentNodeClaimed(doc, nodeId);
  const updatedAt = now.toISOString();
  await persistGameNodeDocument(
    db,
    existing,
    doc,
    typeof doc.public_state === "string" ? doc.public_state : existing.public_state,
    updatedAt
  );

  const fragmentPatch = patchesForFragmentContribute(nodeId);
  const unlockedNodes: string[] = [];
  let fragmentsRegistered = 0;
  let fragmentsRequired = seasonFragmentNodeIds().length;
  let finaleOpen = false;

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
        unlockedNodes.push(fragmentPatch.finaleNodeId);
      }

      const finaleUpdatedAt = new Date(now.getTime() + 1).toISOString();
      await persistGameNodeDocument(
        db,
        finaleRow,
        finaleDoc,
        typeof finaleDoc.public_state === "string"
          ? finaleDoc.public_state
          : finaleRow.public_state,
        finaleUpdatedAt
      );
    }
  }

  return jsonResponse(
    {
      object_id: pathObjectId,
      node_id: nodeId,
      contribute_mode: "fragment",
      fragment_claimed: true,
      fragments_registered: fragmentsRegistered,
      fragments_required: fragmentsRequired,
      finale_open: finaleOpen,
      unlocked_nodes: unlockedNodes,
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
