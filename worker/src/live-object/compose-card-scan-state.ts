import { defaultSeason } from "../city-game/season-loader";
import type { CrSeasonConfig } from "../city-game/season-config";
import {
  objectStreamsFromCardDocumentJson,
  type ObjectPublicStream,
} from "../validation/object-streams";
import { resolveStreamPolicy, type StreamPolicyResult } from "./stream-policy";

export type ComposeCardScanStateInput = {
  cardDocumentJson: string | null | undefined;
  season?: CrSeasonConfig;
  now?: Date;
};

export type ComposeCardScanStateResult = {
  objectStreams: ObjectPublicStream[];
  streamPolicy: StreamPolicyResult;
};

/**
 * Card-scope scan composition (Layer 3):
 * signed card `object_streams` → StreamPolicy (care pause; no game node on root QR).
 */
export function composeCardScanState(
  input: ComposeCardScanStateInput
): ComposeCardScanStateResult {
  const streams = objectStreamsFromCardDocumentJson(input.cardDocumentJson);
  const now = input.now ?? new Date();
  const season = input.season ?? defaultSeason();
  const streamPolicy = resolveStreamPolicy({
    streams,
    now,
    season,
    gameNode: null,
    nodeId: null,
  });
  return {
    objectStreams: streamPolicy.streams,
    streamPolicy,
  };
}
