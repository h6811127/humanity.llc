import type { GameMeta } from "./game-meta";
import { gameMetaFromChildDocumentJson, normalizeGameMeta } from "./game-meta";
import { GAME_NODE_OBJECT_TYPE, isCityGameEnabled } from "./constants";
import {
  gameNodeContributeMode,
  isCollectiveQuorumComplete,
  isWitnessScarcityDepleted,
  type GameContributeMode,
} from "./unlock-engine";
import {
  seasonContributeCode,
  seasonNodeIdForObject,
  seasonNodePledgeFaction,
  type CrSeasonConfig,
} from "./season-config";
import { defaultSeason } from "./season-loader";
import {
  isSeasonContributeOpen,
  resolveSeasonWindowPhase,
  type SeasonWindowPhase,
} from "./season-window";
import { resolveGameVouchGate, type GameVouchGate } from "./vouch-graph";
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
  /** Sanctuary / faction HQ — device-local pledge block (**SW-02**). */
  showsPledge: boolean;
  pledgeFaction: string | null;
  roleEyebrow: string;
  /** Voluntary site-code quorum block on scan (temp_drop collective nodes). */
  showsContribute: boolean;
  contributeMode: GameContributeMode | null;
  /** Example site code from season config for the scanned node (input placeholder only). */
  contributeSiteCodePlaceholder: string | null;
  /** Read-only vouch graph for nodes with `vouch_requires`. */
  vouchGate: GameVouchGate | null;
  seasonWindowPhase: SeasonWindowPhase;
};

import { isCareStreamPaused as isCareStreamPausedFromPolicy } from "../live-object/stream-policy";

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
  faction_hq: "Faction HQ",
  temp_drop: "Temp drop",
  witness: "Witness seal",
  route_splitter: "Route splitter",
  finale: "Finale switch",
  care_loop: "Care loop",
  mobile_lore: "Mobile lore",
  faction_badge: "Faction badge",
};

export const GAME_NODE_SCAN_FOOT =
  "This scan shows public object state — not who scanned, player scores, or location history.";

/** Second line under game scan foot — scan privacy vs voluntary contribute. */
export const GAME_NODE_SCAN_PRIVACY_NOTE =
  "Opening this QR is not logged. If you choose to contribute, a public count on this object updates — not your identity.";

export const GAME_CONTRIBUTE_EYEBROW = "Collective quorum";
export const GAME_CONTRIBUTE_LEAD =
  "This is one shared count for the whole city — not your personal score. Enter the site code printed on the sticker to add your visit. When enough people contribute, the clue here updates for everyone.";
export const GAME_CONTRIBUTE_FIRST_SCAN_NOTE =
  "First scan here? Opening this page is not logged. The count below only changes if you choose to contribute.";
export const GAME_CONTRIBUTE_SITE_CODE_LABEL = "Site code";
export const GAME_CONTRIBUTE_SUBMIT_LABEL = "Contribute to quorum";
export const GAME_CONTRIBUTE_PROGRESS_LABEL = "Public progress";

export const GAME_FRAGMENT_CONTRIBUTE_EYEBROW = "District fragment";
export const GAME_FRAGMENT_CONTRIBUTE_LEAD =
  "Register this fragment on the public lattice. Enter the site code from the sticker or backing card — not from this URL alone.";
export const GAME_FRAGMENT_CONTRIBUTE_SUBMIT_LABEL = "Mark fragment";

export const GAME_SCARCITY_CONTRIBUTE_EYEBROW = "Sunset pass";
export const GAME_SCARCITY_CONTRIBUTE_LEAD =
  "Claim a sunset pass from the witness seal. Enter the site code from the sticker or backing card — not from this URL alone.";
export const GAME_SCARCITY_CONTRIBUTE_SUBMIT_LABEL = "Claim sunset pass";
export const GAME_SCARCITY_CONTRIBUTE_PROGRESS_LABEL = "Passes remaining";

export const GAME_CAPTURE_CONTRIBUTE_EYEBROW = "Relay capture";
export const GAME_CAPTURE_CONTRIBUTE_LEAD =
  "Choose your faction and enter the site code from the sticker. Capture updates who holds this relay on the public board — not your personal score.";
export const GAME_CAPTURE_CONTRIBUTE_SUBMIT_LABEL = "Capture relay";
export const GAME_CAPTURE_REINFORCE_SUBMIT_LABEL = "Reinforce hold";
export const GAME_CAPTURE_FACTION_LABEL = "Faction";
export const GAME_CAPTURE_HELD_LABEL = "Relay hold";

export const GAME_PLEDGE_EYEBROW = "Faction pledge";
export const GAME_PLEDGE_LEAD =
  "Pick a team for Signal War on this device only — not a scoreboard entry and not stored on the server.";
export const GAME_PLEDGE_SUBMIT_LABEL = "Save faction on this device";
export const GAME_PLEDGE_SAVED_LABEL = "Saved on this device";
export const GAME_PLEDGE_PRIVACY_NOTE =
  "Optional. Clears when you clear site data. Relays still flip from public object state — operators set holds at season open.";

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

export function gameNodeContributeSiteCodePlaceholder(
  nodeId: string | null,
  season: CrSeasonConfig = defaultSeason()
): string {
  if (!nodeId) return "";
  return seasonContributeCode(nodeId, season)?.code ?? "";
}

export function gameNodeContributeEyebrow(
  mode: GameContributeMode,
  district: string | null
): string {
  if (mode === "scarcity") return GAME_SCARCITY_CONTRIBUTE_EYEBROW;
  if (mode === "capture" || mode === "reinforce") return GAME_CAPTURE_CONTRIBUTE_EYEBROW;
  if (mode === "fragment") {
    const place = formatGameDistrict(district);
    return place !== "Cedar Rapids" ? `${place} fragment` : GAME_FRAGMENT_CONTRIBUTE_EYEBROW;
  }
  return GAME_CONTRIBUTE_EYEBROW;
}

export function isCareStreamPaused(streams: ObjectPublicStream[]): boolean {
  return isCareStreamPausedFromPolicy(streams);
}

export function isGameNodeExpired(meta: GameMeta, now: Date): boolean {
  if (!meta.visible_until) return false;
  const t = Date.parse(meta.visible_until);
  return Number.isFinite(t) && t < now.getTime();
}

export function gameNodeShowsPledge(role: string): boolean {
  return role === "sanctuary" || role === "faction_hq";
}

export function sanctuaryPledgeCoopHint(
  role: string,
  faction: string | null | undefined
): string {
  if (role === "faction_hq" && faction) {
    const team = faction.charAt(0).toUpperCase() + faction.slice(1);
    return `${team} treaty zone — pledge your team here. No capture on sanctuaries.`;
  }
  return "Regroup and pledge a faction here — sanctuaries never capture or rank players.";
}

export function gameNodeCoopHint(
  role: string,
  meta: GameMeta,
  pledgeFaction?: string | null
): string | null {
  if (gameNodeShowsPledge(role)) {
    return sanctuaryPledgeCoopHint(role, pledgeFaction);
  }
  if (role === "temp_drop" && meta.collective_target != null) {
    if (isCollectiveQuorumComplete(meta)) {
      return "The clue evolved — sharing helped everyone reach the next path together.";
    }
    return "Share what you find — when enough people contribute together, the next clue unlocks for everyone.";
  }
  if (role === "lore_archive" && meta.unlocked_by.includes("node_04")) {
    return "The cabinet evolved after the group shared the path — cooperation beat secrecy.";
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
  if (meta.artifact_id === "hidden_relay") {
    return "Hidden relay — capture once to reveal this relay on the public board.";
  }
  if (meta.overharvest_limit != null && meta.overharvest_count != null) {
    const remaining = meta.overharvest_limit - meta.overharvest_count;
    if (remaining > 0 && remaining <= 4) {
      return `Commons pressure — ${remaining} captures left before this relay compromises for every faction.`;
    }
  }
  if (role === "relay_gate") {
    const hold = meta.held_by_faction;
    if (hold && hold !== "neutral") {
      const team = hold.charAt(0).toUpperCase() + hold.slice(1);
      return `${team} holds this relay on the public board — revisit to reinforce when capture opens.`;
    }
    return "Relay holds change public bulletins — no personal scoreboard.";
  }
  if (role === "care_loop") {
    return "Discovery rewards attention — maintenance truth on the care stream wins over game copy.";
  }
  if (role === "mobile_lore") {
    return "Courier nodes carry hints — the owner updates this line. No scan count, no rank.";
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
  env: {
    CITY_GAME_ENABLED?: string;
    CITY_GAME_LOCAL_PLAY_OPEN?: string;
    CITY_GAME_RELAY_CAPTURE_PLAYER?: string;
  };
  vouchWitnesses?: Record<string, GameMeta>;
  season?: CrSeasonConfig;
  now?: Date;
}): GameNodeScanContext | null {
  if (input.objectType !== GAME_NODE_OBJECT_TYPE) return null;
  const fields = parseGameNodeFields(input.documentJson);
  if (!fields) return null;

  const enabled = isCityGameEnabled(input.env);
  const now = input.now ?? new Date();
  const season = input.season ?? defaultSeason();
  const seasonWindowPhase = resolveSeasonWindowPhase(now, season);
  const streams = fields.objectStreams.length ? fields.objectStreams : input.objectStreams;

  const base = {
    seasonId: fields.seasonId,
    nodeRole: fields.nodeRole,
    district: fields.district,
    gameMeta: fields.gameMeta,
    showsContribute: false,
    contributeMode: null as GameContributeMode | null,
    contributeSiteCodePlaceholder: null,
    vouchGate: null as GameVouchGate | null,
    seasonWindowPhase,
  };

  const nodeId =
    input.objectId != null ? seasonNodeIdForObject(input.objectId, season) : null;
  const pledgeFaction = seasonNodePledgeFaction(nodeId, season);
  const contributeMode = gameNodeContributeMode(
    nodeId,
    fields.gameMeta,
    fields.nodeRole,
    season,
    input.env
  );
  const showsContribute = contributeMode != null;
  const showsPledge =
    gameNodeShowsPledge(fields.nodeRole) && isSeasonContributeOpen(seasonWindowPhase, input.env);
  const vouchGate = resolveGameVouchGate(
    nodeId,
    fields.gameMeta,
    input.vouchWitnesses ?? {}
  );
  const roleEyebrow = gameNodeRoleEyebrow(fields.nodeRole, fields.district);

  const withVouchGate = {
    ...base,
    vouchGate,
    showsPledge: false,
    pledgeFaction,
    roleEyebrow,
  };

  if (!enabled) {
    return {
      ...withVouchGate,
      enabled: false,
      mode: "fallback",
      coopHint: null,
    };
  }

  if (isCareStreamPaused(streams)) {
    return {
      ...withVouchGate,
      enabled: true,
      mode: "care_pause",
      coopHint: gameNodeCoopHint(fields.nodeRole, fields.gameMeta, pledgeFaction),
    };
  }

  if (!isSeasonContributeOpen(seasonWindowPhase, input.env)) {
    return {
      ...withVouchGate,
      enabled: true,
      mode: "dormant",
      coopHint: null,
    };
  }

  if (isGameNodeExpired(fields.gameMeta, now)) {
    return {
      ...withVouchGate,
      enabled: true,
      mode: "dormant",
      coopHint: null,
    };
  }

  if (isWitnessScarcityDepleted(fields.gameMeta, fields.nodeRole)) {
    return {
      ...withVouchGate,
      enabled: true,
      mode: "dormant",
      coopHint: null,
    };
  }

  return {
    ...withVouchGate,
    enabled: true,
    mode: "game",
    coopHint: gameNodeCoopHint(fields.nodeRole, fields.gameMeta, pledgeFaction),
    showsPledge,
    showsContribute,
    contributeMode,
    contributeSiteCodePlaceholder: showsContribute
      ? gameNodeContributeSiteCodePlaceholder(nodeId, season) || null
      : null,
  };
}

export { gameMetaFromChildDocumentJson };
