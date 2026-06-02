import type { GameMeta } from "./game-meta";
import { gameMetaFromChildDocumentJson, normalizeGameMeta } from "./game-meta";
import { GAME_NODE_OBJECT_TYPE, isCityGameEnabled } from "./constants";
import { gameNodeContributeMode, type GameContributeMode } from "./unlock-engine";
import { seasonNodeIdForObject } from "./season-config";
import type { ObjectPublicStream } from "../validation/object-streams";
import { parseObjectStreamsFromDocument } from "../validation/object-streams";

export type GameNodeScanMode = "game" | "dormant" | "care_pause" | "fallback";

export type GameNodeScanContext = {
  enabled: boolean;
  mode: GameNodeScanMode;
  seasonId: string;
  nodeRole: string;
  district: string | null;
  gameMeta: GameMeta;
  coopHint: string | null;
  roleEyebrow: string;
  /** Voluntary site-code quorum block on scan (temp_drop collective nodes). */
  showsContribute: boolean;
  contributeMode: GameContributeMode | null;
};

const CARE_PAUSE_RE = /pause|closed|maintenance|flood|blocked|out of service/i;

const DISTRICT_LABELS: Record<string, string> = {
  newbo: "NewBo",
  czech_village: "Czech Village",
  greene_square: "Greene Square",
  river_spine: "River spine",
  downtown: "Downtown",
};

const ROLE_LABELS: Record<string, string> = {
  relay_gate: "Relay · gate",
  lore_archive: "Lore archive",
  sanctuary: "Sanctuary",
  temp_drop: "Temp drop",
  witness: "Witness seal",
  route_splitter: "Route splitter",
  finale: "Finale switch",
  care_loop: "Care loop",
  mobile_lore: "Mobile lore",
};

export const GAME_NODE_SCAN_FOOT =
  "This scan shows public object state — not who scanned, player scores, or location history.";

/** Second line under game scan foot — scan privacy vs voluntary contribute. */
export const GAME_NODE_SCAN_PRIVACY_NOTE =
  "Opening this QR is not logged. If you choose to contribute, a public count on this object updates — not your identity.";

export const GAME_CONTRIBUTE_EYEBROW = "Collective quorum";
export const GAME_CONTRIBUTE_LEAD =
  "Add your visit to the public count. Enter the site code from the sticker or backing card — not from this URL alone.";
export const GAME_CONTRIBUTE_SITE_CODE_LABEL = "Site code";
export const GAME_CONTRIBUTE_SUBMIT_LABEL = "Contribute to quorum";
export const GAME_CONTRIBUTE_PROGRESS_LABEL = "Public progress";

export const GAME_FRAGMENT_CONTRIBUTE_EYEBROW = "District fragment";
export const GAME_FRAGMENT_CONTRIBUTE_LEAD =
  "Register this fragment on the public lattice. Enter the site code from the sticker or backing card — not from this URL alone.";
export const GAME_FRAGMENT_CONTRIBUTE_SUBMIT_LABEL = "Mark fragment";

export const GAME_NODE_FORBIDDEN_COPY = [
  "leaderboard",
  "xp",
  "experience points",
  "scan count",
  "streak",
  "heat map",
  "heatmap",
] as const;

export function formatGameDistrict(district: string | null): string {
  if (!district) return "Cedar Rapids";
  return DISTRICT_LABELS[district] ?? district.replace(/_/g, " ");
}

export function gameNodeRoleEyebrow(role: string, district: string | null): string {
  const place = formatGameDistrict(district);
  const roleLabel = ROLE_LABELS[role] ?? role.replace(/_/g, " ");
  return `${place} · ${roleLabel}`;
}

export function isCareStreamPaused(streams: ObjectPublicStream[]): boolean {
  const care = streams.find((s) => s.class === "care" || s.id === "care");
  if (!care?.value) return false;
  return CARE_PAUSE_RE.test(care.value);
}

export function isGameNodeExpired(meta: GameMeta, now: Date): boolean {
  if (!meta.visible_until) return false;
  const t = Date.parse(meta.visible_until);
  return Number.isFinite(t) && t < now.getTime();
}

export function gameNodeCoopHint(role: string, meta: GameMeta): string | null {
  if (role === "sanctuary") {
    return "Regroup here — sanctuary nodes do not capture or rank players.";
  }
  if (role === "temp_drop" && meta.collective_target != null) {
    return "Share the seed clue outward — this object evolves when the group unlocks it together.";
  }
  if (meta.vouch_requires.length) {
    return "This path opens with trust from nearby places — cooperation beats solo farming.";
  }
  if (meta.fragment_id) {
    return "One fragment among several — city-scale coordination completes the route.";
  }
  if (meta.compromised) {
    return "Relay compromised — teams recover by public rekey, not by reading scan logs.";
  }
  if (role === "relay_gate") {
    return "Relay holds change public bulletins — no personal scoreboard.";
  }
  if (role === "care_loop") {
    return "Discovery rewards attention — maintenance truth on the care stream wins over game copy.";
  }
  return null;
}

export function parseGameNodeFields(documentJson: string | null | undefined): {
  seasonId: string;
  nodeRole: string;
  district: string | null;
  gameMeta: GameMeta;
  objectStreams: ObjectPublicStream[];
} | null {
  if (!documentJson) return null;
  try {
    const doc = JSON.parse(documentJson) as Record<string, unknown>;
    if (doc.object_type !== GAME_NODE_OBJECT_TYPE) return null;
    const seasonId =
      typeof doc.season_id === "string" && doc.season_id.trim()
        ? doc.season_id.trim()
        : "";
    const nodeRole =
      typeof doc.node_role === "string" && doc.node_role.trim()
        ? doc.node_role.trim()
        : "";
    if (!seasonId || !nodeRole) return null;
    let district: string | null = null;
    if (typeof doc.district === "string" && doc.district.trim()) {
      district = doc.district.trim();
    }
    return {
      seasonId,
      nodeRole,
      district,
      gameMeta: normalizeGameMeta(doc.game_meta),
      objectStreams: parseObjectStreamsFromDocument(doc) as ObjectPublicStream[],
    };
  } catch {
    return null;
  }
}

export function resolveGameNodeScanContext(input: {
  objectType: string;
  objectId?: string | null;
  documentJson: string | null | undefined;
  objectStreams: ObjectPublicStream[];
  env: { CITY_GAME_ENABLED?: string };
  now?: Date;
}): GameNodeScanContext | null {
  if (input.objectType !== GAME_NODE_OBJECT_TYPE) return null;
  const fields = parseGameNodeFields(input.documentJson);
  if (!fields) return null;

  const enabled = isCityGameEnabled(input.env);
  const now = input.now ?? new Date();
  const streams = fields.objectStreams.length ? fields.objectStreams : input.objectStreams;

  const base = {
    seasonId: fields.seasonId,
    nodeRole: fields.nodeRole,
    district: fields.district,
    gameMeta: fields.gameMeta,
    showsContribute: false,
    contributeMode: null as GameContributeMode | null,
  };

  const nodeId =
    input.objectId != null ? seasonNodeIdForObject(input.objectId) : null;
  const contributeMode = gameNodeContributeMode(nodeId, fields.gameMeta, fields.nodeRole);
  const showsContribute = contributeMode != null;

  if (!enabled) {
    return {
      ...base,
      enabled: false,
      mode: "fallback",
      coopHint: null,
      roleEyebrow: gameNodeRoleEyebrow(fields.nodeRole, fields.district),
    };
  }

  if (isCareStreamPaused(streams)) {
    return {
      ...base,
      enabled: true,
      mode: "care_pause",
      coopHint: gameNodeCoopHint(fields.nodeRole, fields.gameMeta),
      roleEyebrow: gameNodeRoleEyebrow(fields.nodeRole, fields.district),
    };
  }

  if (isGameNodeExpired(fields.gameMeta, now)) {
    return {
      ...base,
      enabled: true,
      mode: "dormant",
      coopHint: null,
      roleEyebrow: gameNodeRoleEyebrow(fields.nodeRole, fields.district),
    };
  }

  return {
    ...base,
    enabled: true,
    mode: "game",
    coopHint: gameNodeCoopHint(fields.nodeRole, fields.gameMeta),
    roleEyebrow: gameNodeRoleEyebrow(fields.nodeRole, fields.district),
    showsContribute,
    contributeMode,
  };
}

export { gameMetaFromChildDocumentJson };
