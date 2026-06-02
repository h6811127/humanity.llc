import { getChildObject } from "./child-objects";
import { getRevocationDisplay } from "./revoke";
import { GAME_NODE_OBJECT_TYPE } from "../city-game/constants";
import { gameMetaFromChildDocumentJson } from "../city-game/game-meta";
import type { GameMeta } from "../city-game/game-meta";
import { parseGameNodeFields } from "../city-game/scan-view";
import { seasonObjectIdForNode } from "../city-game/season-config";
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
  if (
    childObject?.object_type === GAME_NODE_OBJECT_TYPE &&
    childObject.status === "active"
  ) {
    const fields = parseGameNodeFields(childObject.child_object_document_json);
    if (fields?.gameMeta.vouch_requires.length) {
      gameVouchWitnesses = {};
      for (const witnessNodeId of fields.gameMeta.vouch_requires) {
        const witnessObjectId = seasonObjectIdForNode(witnessNodeId);
        if (!witnessObjectId) continue;
        const witnessRow = await getChildObject(db, witnessObjectId);
        if (
          !witnessRow ||
          witnessRow.parent_profile_id !== profileId ||
          witnessRow.status !== "active" ||
          witnessRow.object_type !== GAME_NODE_OBJECT_TYPE
        ) {
          continue;
        }
        const witnessMeta = gameMetaFromChildDocumentJson(
          witnessRow.child_object_document_json
        );
        if (witnessMeta) {
          gameVouchWitnesses[witnessNodeId] = witnessMeta;
        }
      }
    }
  }

  return {
    card: card ?? null,
    qr: qr ?? null,
    childObject,
    verification,
    revocationDisplay,
    gameVouchWitnesses,
  };
}
