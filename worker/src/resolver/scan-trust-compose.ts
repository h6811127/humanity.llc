import { GAME_NODE_OBJECT_TYPE } from "../city-game/constants";
import type { GameNodeScanContext } from "../city-game/scan-view";
import type { CrSeasonConfig } from "../city-game/season-config";
import type { StreamPolicyPhase } from "../live-object/stream-policy";
import type { ObjectPublicStream } from "../validation/object-streams";
import { resolveNetworkCharter } from "../../../site/js/city-game-reference-network-core.mjs";

export type ScanTrustSignerRow = {
  stream: string;
  who: string;
  may_sign: string;
};

export type ScanTrustCharterFragment = {
  operatorLine: string;
  definition: string;
  pointerLesson: string | null;
  rulesPath: string;
};

export type ScanTrustContext = {
  proves: string[];
  doesNotProve: string[];
  signedBy: ScanTrustSignerRow[];
  charterFragment: ScanTrustCharterFragment;
};

const GAME_STREAM_CLASSES = new Set(["narrative", "route", "place"]);

function pointerLessonForNode(
  season: CrSeasonConfig,
  nodeId: string | null
): string | null {
  if (!nodeId) return null;
  const raw = season.network_charter as
    | { spine_lessons?: Record<string, string> }
    | undefined;
  const lesson = raw?.spine_lessons?.[nodeId]?.trim();
  return lesson || null;
}

function signerStreamsForScan(
  streams: ObjectPublicStream[],
  streamPolicyPhase: StreamPolicyPhase | null | undefined
): Set<string> {
  const present = new Set<string>(["Game"]);
  if (streamPolicyPhase === "care_pause") {
    present.add("Care");
    return present;
  }
  for (const stream of streams) {
    if (stream.class === "care" || stream.id === "care") {
      present.add("Care");
    }
    if (GAME_STREAM_CLASSES.has(stream.class)) {
      present.add("Game");
    }
  }
  if (streams.some((s) => s.class === "place" && s.id === "territory")) {
    present.add("Game");
  }
  return present;
}

function buildProvesLines(input: {
  streams: ObjectPublicStream[];
  gameNode: GameNodeScanContext;
  streamPolicyPhase: StreamPolicyPhase | null | undefined;
}): string[] {
  const items = [
    "Public object state from humanity.llc at scan time — shared board truth, not a private feed",
  ];
  const meta = input.gameNode.gameMeta;
  if (
    meta.collective_target != null &&
    meta.collective_progress != null
  ) {
    items.push(
      "Collective progress on this object — world count visible to everyone, not your personal score"
    );
  }
  if (input.streamPolicyPhase === "care_pause") {
    items.push(
      "Care stream wins while maintenance is live — safety truth beats game bulletins"
    );
  } else if (
    input.streamPolicyPhase === "game_scheduled" &&
    input.streams.some((s) => s.class === "narrative" || s.id === "bulletin")
  ) {
    items.push("Signed game bulletins published under season operator rules");
  }
  if (input.streams.some((s) => s.class === "care" || s.id === "care")) {
    items.push("Care or maintenance lines signed by place stewards when shown");
  }
  items.push("Revocable per sticker and per object on the network");
  return items;
}

function buildDoesNotProveLines(gameNode: GameNodeScanContext): string[] {
  const items = [
    "Who scanned, when, or where — this page returns object state, not a people trail",
    "Personal rank or location history — no score built from opening this QR",
    "Legal identity, door ownership, or that the person holding the sticker owns the card",
  ];
  if (gameNode.vouchGate?.pending.length) {
    items.push(
      "Witness seals on nearby game nodes are place trust paths — not Steward human vouch or government ID"
    );
  }
  return items;
}

/**
 * Compose WS-REALITY trust modules for network-enrolled scans (game_node + season overlay).
 */
export function composeScanTrustContext(input: {
  gameNode: GameNodeScanContext | null;
  childObjectType: string | null;
  objectStreams: ObjectPublicStream[];
  season: CrSeasonConfig;
  streamPolicyPhase?: StreamPolicyPhase | null;
}): ScanTrustContext | null {
  const { gameNode, childObjectType, objectStreams, season, streamPolicyPhase } =
    input;
  if (!gameNode?.seasonId) return null;
  const networkObject =
    childObjectType === GAME_NODE_OBJECT_TYPE || gameNode.enabled;
  if (!networkObject) return null;

  const charter = resolveNetworkCharter(season);
  const signerStreams = signerStreamsForScan(objectStreams, streamPolicyPhase);
  const signedBy = charter.signers.filter((row: ScanTrustSignerRow) =>
    signerStreams.has(row.stream)
  );

  const rulesPath = String(season.rules_path ?? "/play/cedar-rapids/").trim();

  return {
    proves: buildProvesLines({
      streams: objectStreams,
      gameNode,
      streamPolicyPhase,
    }),
    doesNotProve: buildDoesNotProveLines(gameNode),
    signedBy,
    charterFragment: {
      operatorLine: charter.operator_line,
      definition: charter.definition,
      pointerLesson: pointerLessonForNode(season, gameNode.nodeId),
      rulesPath,
    },
  };
}
