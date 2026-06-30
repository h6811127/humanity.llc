import { getChildObject } from "./child-objects";
import { getRevocationDisplay } from "./revoke";
import {
  listActiveRelationshipEdgesForSource,
  listActiveRelationshipEdgesForTarget,
  relationshipEdgesSchemaReady,
  verifyStoredRelationshipEdge,
} from "./relationship-edges";
import {
  isWitnessRelationshipEdge,
} from "../live-object/relationship-edge-spec";
import { GAME_NODE_OBJECT_TYPE } from "../city-game/constants";
import { gameMetaFromChildDocumentJson } from "../city-game/game-meta";
import type { GameMeta } from "../city-game/game-meta";
import { parseGameNodeFields } from "../city-game/scan-view";
import { seasonObjectIdForNode } from "../city-game/season-config";
import type { RelationshipEdgeDocument } from "../live-object/relationship-edge-spec";
import type {
  CardRow,
  ChildObjectRow,
  QrCredentialRow,
  VerificationSummaryRow,
} from "./types";

export interface ScanContext {
  card: CardRow | null;
  qr: QrCredentialRow | null;
  childObject: ChildObjectRow | null;
  verification: VerificationSummaryRow | null;
  revocationDisplay: {
    display_mode: string | null;
    public_reason: string | null;
  } | null;
  /** Witness game_node metas for vouch gate read on scan (node_id → meta). */
  gameVouchWitnesses?: Record<string, GameMeta> | null;
  /** Verified active witness edges targeting this object (incoming). */
  witnessRelationshipEdgesIncoming?: RelationshipEdgeDocument[] | null;
  /** Verified active witness edges sourced from this object (outgoing). */
  witnessRelationshipEdgesOutgoing?: RelationshipEdgeDocument[] | null;
  /** public_label for peer objects referenced on signed relationship edges. */
  witnessPeerLabels?: Record<string, string> | null;
  /** game_meta for peer objects (outgoing unlock satisfaction). */
  relationshipPeerGameMeta?: Record<string, GameMeta> | null;
}

export async function loadScanContext(
  db: D1Database,
  profileId: string,
  qrId: string
): Promise<ScanContext> {
  const card = await db
    .prepare(
      `SELECT profile_id, public_key, handle, handle_normalized, manifesto_line,
              status, card_document_json, created_at, updated_at
       FROM cards WHERE profile_id = ?`
    )
    .bind(profileId)
    .first<CardRow>();

  const qr = await db
    .prepare(
      `SELECT qr_id, profile_id, epoch, scope, print_artifact_id, object_id, resolver_hint,
              status, payload, issued_at, expires_at, credential_document_json,
              created_at, updated_at
       FROM qr_credentials WHERE qr_id = ?`
    )
    .bind(qrId)
    .first<QrCredentialRow>();

  let childObject: ChildObjectRow | null = null;
  if (qr?.scope === "child_object" && qr.object_id) {
    const row = await getChildObject(db, qr.object_id);
    if (row && row.parent_profile_id === profileId) {
      childObject = row;
    }
  }

  let verification: VerificationSummaryRow | null = null;
  if (card) {
    verification = await db
      .prepare(
        `SELECT profile_id, state, level, label, method, vouch_count,
                latest_accepted_vouch_at, credential_ids_json, summary_document_json,
                updated_at
         FROM verification_summaries WHERE profile_id = ?`
      )
      .bind(profileId)
      .first<VerificationSummaryRow>();
  }

  let revocationDisplay: ScanContext["revocationDisplay"] = null;
  if (card?.status === "revoked") {
    revocationDisplay = await getRevocationDisplay(db, profileId, "card", null);
  } else if (qr?.status === "revoked") {
    revocationDisplay = await getRevocationDisplay(
      db,
      profileId,
      "qr_credential",
      qrId
    );
  }

  let gameVouchWitnesses: Record<string, GameMeta> | null = null;
  let witnessRelationshipEdgesIncoming: RelationshipEdgeDocument[] | null = null;
  let witnessRelationshipEdgesOutgoing: RelationshipEdgeDocument[] | null = null;
  let witnessPeerLabels: Record<string, string> | null = null;
  let relationshipPeerGameMeta: Record<string, GameMeta> | null = null;
  if (
    childObject?.object_type === GAME_NODE_OBJECT_TYPE &&
    childObject.status === "active"
  ) {
    const witnessCtx = await loadGameNodeWitnessContext(
      db,
      profileId,
      childObject
    );
    gameVouchWitnesses = witnessCtx.gameVouchWitnesses;
    witnessRelationshipEdgesIncoming = witnessCtx.relationshipEdgesIncoming;
    witnessRelationshipEdgesOutgoing = witnessCtx.relationshipEdgesOutgoing;
    witnessPeerLabels = witnessCtx.witnessPeerLabels;
    relationshipPeerGameMeta = witnessCtx.relationshipPeerGameMeta;
  }

  return {
    card: card ?? null,
    qr: qr ?? null,
    childObject,
    verification,
    revocationDisplay,
    gameVouchWitnesses,
    witnessRelationshipEdgesIncoming,
    witnessRelationshipEdgesOutgoing,
    witnessPeerLabels,
    relationshipPeerGameMeta,
  };
}

async function loadGameNodeWitnessContext(
  db: D1Database,
  profileId: string,
  childObject: ChildObjectRow
): Promise<{
  gameVouchWitnesses: Record<string, GameMeta> | null;
  relationshipEdgesIncoming: RelationshipEdgeDocument[] | null;
  relationshipEdgesOutgoing: RelationshipEdgeDocument[] | null;
  witnessPeerLabels: Record<string, string> | null;
  relationshipPeerGameMeta: Record<string, GameMeta> | null;
}> {
  const fields = parseGameNodeFields(childObject.child_object_document_json);
  if (!fields) {
    return {
      gameVouchWitnesses: null,
      relationshipEdgesIncoming: null,
      relationshipEdgesOutgoing: null,
      witnessPeerLabels: null,
      relationshipPeerGameMeta: null,
    };
  }

  let relationshipEdgesIncoming: RelationshipEdgeDocument[] | null = null;
  let relationshipEdgesOutgoing: RelationshipEdgeDocument[] | null = null;
  const allVerifiedEdges: RelationshipEdgeDocument[] = [];

  if (await relationshipEdgesSchemaReady(db)) {
    const incomingRows = await listActiveRelationshipEdgesForTarget(db, {
      toObjectId: childObject.object_id,
      networkId: fields.seasonId,
    });
    const incomingVerified: RelationshipEdgeDocument[] = [];
    for (const row of incomingRows) {
      const doc = await verifyStoredRelationshipEdge(db, row);
      if (doc) incomingVerified.push(doc);
    }
    if (incomingVerified.length) {
      relationshipEdgesIncoming = incomingVerified;
      allVerifiedEdges.push(...incomingVerified);
    }

    const outgoingRows = await listActiveRelationshipEdgesForSource(db, {
      fromObjectId: childObject.object_id,
      networkId: fields.seasonId,
    });
    const outgoingVerified: RelationshipEdgeDocument[] = [];
    for (const row of outgoingRows) {
      const doc = await verifyStoredRelationshipEdge(db, row);
      if (doc) outgoingVerified.push(doc);
    }
    if (outgoingVerified.length) {
      relationshipEdgesOutgoing = outgoingVerified;
      allVerifiedEdges.push(...outgoingVerified);
    }
  }

  const witnessNodeIds = new Set<string>();
  const witnessObjectIds = new Map<string, string>();

  const witnessIncoming =
    relationshipEdgesIncoming?.filter(isWitnessRelationshipEdge) ?? [];
  if (witnessIncoming.length) {
    for (const edge of witnessIncoming) {
      const nodeId = edge.witness.from_node_id;
      witnessNodeIds.add(nodeId);
      witnessObjectIds.set(nodeId, edge.from.id);
    }
  } else if (fields.gameMeta.vouch_requires.length) {
    for (const witnessNodeId of fields.gameMeta.vouch_requires) {
      witnessNodeIds.add(witnessNodeId);
      const witnessObjectId = seasonObjectIdForNode(witnessNodeId);
      if (witnessObjectId) {
        witnessObjectIds.set(witnessNodeId, witnessObjectId);
      }
    }
  }

  const peerObjectIds = new Set<string>();
  for (const edge of allVerifiedEdges) {
    if (edge.from.id !== childObject.object_id) peerObjectIds.add(edge.from.id);
    if (edge.to.id !== childObject.object_id) peerObjectIds.add(edge.to.id);
  }

  const witnessPeerLabels: Record<string, string> = {};
  const relationshipPeerGameMeta: Record<string, GameMeta> = {};
  for (const peerId of peerObjectIds) {
    const peerRow = await getChildObject(db, peerId);
    if (
      !peerRow ||
      peerRow.parent_profile_id !== profileId ||
      peerRow.status !== "active"
    ) {
      continue;
    }
    witnessPeerLabels[peerId] = peerRow.public_label;
    if (peerRow.object_type === GAME_NODE_OBJECT_TYPE) {
      const peerMeta = gameMetaFromChildDocumentJson(
        peerRow.child_object_document_json
      );
      if (peerMeta) relationshipPeerGameMeta[peerId] = peerMeta;
    }
  }

  if (!witnessNodeIds.size) {
    return {
      gameVouchWitnesses: null,
      relationshipEdgesIncoming,
      relationshipEdgesOutgoing,
      witnessPeerLabels: Object.keys(witnessPeerLabels).length
        ? witnessPeerLabels
        : null,
      relationshipPeerGameMeta: Object.keys(relationshipPeerGameMeta).length
        ? relationshipPeerGameMeta
        : null,
    };
  }

  const gameVouchWitnesses: Record<string, GameMeta> = {};
  for (const witnessNodeId of witnessNodeIds) {
    const witnessObjectId = witnessObjectIds.get(witnessNodeId);
    if (!witnessObjectId) continue;
    const witnessMeta = relationshipPeerGameMeta[witnessObjectId];
    if (witnessMeta) {
      gameVouchWitnesses[witnessNodeId] = witnessMeta;
    }
  }

  return {
    gameVouchWitnesses: Object.keys(gameVouchWitnesses).length
      ? gameVouchWitnesses
      : null,
    relationshipEdgesIncoming,
    relationshipEdgesOutgoing,
    witnessPeerLabels: Object.keys(witnessPeerLabels).length
      ? witnessPeerLabels
      : null,
    relationshipPeerGameMeta: Object.keys(relationshipPeerGameMeta).length
      ? relationshipPeerGameMeta
      : null,
  };
}
