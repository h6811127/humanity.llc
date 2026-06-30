import type { ChildObjectRow } from "../db/types";
import {
  resolveGameNodeScanContext,
  type GameNodeScanContext,
} from "../city-game/scan-view";
import type { CrSeasonConfig } from "../city-game/season-config";
import { seasonNodeIdForObject } from "../city-game/season-config";
import { resolveChildCustodyContext, type ObjectCustodyScanContext } from "./custody";
import type { StreamPolicyResult } from "./stream-policy";
import { resolveStreamPolicy } from "./stream-policy";
import {
  resolveChildTimePolicyContext,
  type ObjectTimePolicyScanContext,
} from "./time-policy";
import type { ObjectPublicStream } from "../validation/object-streams";
import { objectStreamsFromChildDocumentJson } from "../validation/object-streams";
import type { RelationshipEdgeDocument } from "./relationship-edge-spec";

export type ComposeChildObjectScanInput = {
  child: ChildObjectRow;
  season: CrSeasonConfig;
  env: { CITY_GAME_ENABLED?: string; CITY_GAME_LOCAL_PLAY_OPEN?: string };
  now: Date;
  vouchWitnesses?: Record<string, import("../city-game/game-meta").GameMeta>;
  witnessRelationshipEdges?: RelationshipEdgeDocument[] | null;
};

export type ComposeChildObjectScanResult = {
  objectStreams: ObjectPublicStream[];
  publicLabel: string;
  publicState: string;
  childTimePolicy: ObjectTimePolicyScanContext | null;
  childCustody: ObjectCustodyScanContext | null;
  gameNode: GameNodeScanContext | null;
  /** Stream precedence outcome when game_node — shared by scan SSR and map snapshot. */
  streamPolicy: StreamPolicyResult | null;
};

/**
 * Canonical child-object scan composition (Layer 3 + 4):
 * base streams → game context → stream policy → time policy → custody.
 */
export function composeChildObjectScanState(
  input: ComposeChildObjectScanInput
): ComposeChildObjectScanResult {
  const { child, season, env, now } = input;
  let objectStreams = objectStreamsFromChildDocumentJson(
    child.child_object_document_json
  );

  let gameNode = resolveGameNodeScanContext({
    objectType: child.object_type,
    objectId: child.object_id,
    documentJson: child.child_object_document_json,
    objectStreams,
    env,
    vouchWitnesses: input.vouchWitnesses,
    witnessRelationshipEdges: input.witnessRelationshipEdges,
    season,
    now,
  });

  const nodeId = seasonNodeIdForObject(child.object_id, season);
  let publicState = child.public_state;
  let streamPolicy: StreamPolicyResult | null = null;

  if (gameNode && nodeId) {
    const streamApply = resolveStreamPolicy({
      streams: objectStreams,
      now,
      season,
      gameNode,
      nodeId,
    });
    streamPolicy = streamApply;
    objectStreams = streamApply.streams;
    if (streamApply.coopHint) {
      gameNode = { ...gameNode, coopHint: streamApply.coopHint };
    }
    if (streamApply.publicStateOverride) {
      publicState = streamApply.publicStateOverride;
    }
  }

  const timePolicyApply = resolveChildTimePolicyContext({
    documentJson: child.child_object_document_json,
    publicState,
    now,
  });
  if (timePolicyApply.publicState !== publicState) {
    publicState = timePolicyApply.publicState;
  }

  const custodyApply = resolveChildCustodyContext({
    documentJson: child.child_object_document_json,
    now,
  });

  return {
    objectStreams,
    publicLabel: child.public_label,
    publicState,
    childTimePolicy: timePolicyApply.context,
    childCustody: custodyApply.context,
    gameNode,
    streamPolicy,
  };
}
