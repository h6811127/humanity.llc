import type { ObjectPublicStream } from "../validation/object-streams";
import { factionControllerLabel, isGameFaction } from "./factions";
import { isCityGameEnabled } from "./constants";
import { normalizeGameMeta } from "./game-meta";
import {
  findSeasonPrintArtifactEnrollment,
  type SeasonPrintArtifactEnrollment,
} from "./season-config";
import { defaultSeason } from "./season-loader";
import {
  gameNodeRoleEyebrow,
  type GameNodeScanContext,
} from "./scan-view";
import {
  isSeasonPlayOpen,
  resolveSeasonWindowPhase,
  type SeasonWindowPhase,
} from "./season-window";
import type { CrSeasonConfig } from "./season-config";

export type { SeasonPrintArtifactEnrollment };

const FACTION_BADGE_CARE_NOTE = "Faction badge · public state only";

export function factionBadgeObjectStreams(
  enrollment: SeasonPrintArtifactEnrollment
): ObjectPublicStream[] {
  const faction = enrollment.faction?.trim();
  const factionLabel =
    faction && isGameFaction(faction)
      ? factionControllerLabel(faction)
      : faction || "Unassigned";
  const mission =
    enrollment.mission_line?.trim() || "No public mission line published";
  const achievements =
    enrollment.achievement_lines?.filter((line) => line.trim()).join(" · ") ||
    "No achievement lines yet";

  return [
    { id: "territory", class: "place", label: "Faction", value: factionLabel },
    { id: "bulletin", class: "narrative", label: "Mission", value: mission },
    { id: "relay", class: "route", label: "Achievements", value: achievements },
    { id: "care", class: "care", label: "Note", value: FACTION_BADGE_CARE_NOTE },
  ];
}

export function factionBadgeCoopHint(): string {
  return "Player badges show signed public lines — scanning does not log who you are or rank players.";
}

export function resolveFactionBadgeScanContext(input: {
  enrollment: SeasonPrintArtifactEnrollment;
  env: { CITY_GAME_ENABLED?: string };
  season?: CrSeasonConfig;
  now?: Date;
}): GameNodeScanContext {
  const enabled = isCityGameEnabled(input.env);
  const now = input.now ?? new Date();
  const season = input.season ?? defaultSeason();
  const seasonWindowPhase = resolveSeasonWindowPhase(now, season);
  const nodeRole = "faction_badge";
  const gameMeta = normalizeGameMeta({});

  const base = {
    seasonId: season.season_id,
    nodeRole,
    district: null,
    gameMeta,
    showsContribute: false,
    contributeMode: null,
    vouchGate: null,
    seasonWindowPhase,
  };

  if (!enabled) {
    return {
      ...base,
      enabled: false,
      mode: "fallback",
      coopHint: null,
      roleEyebrow: gameNodeRoleEyebrow(nodeRole, null),
    };
  }

  if (!isSeasonPlayOpen(seasonWindowPhase)) {
    return {
      ...base,
      seasonWindowPhase,
      enabled: true,
      mode: "dormant",
      coopHint: null,
      roleEyebrow: "Season closed · faction badge",
    };
  }

  return {
    ...base,
    enabled: true,
    mode: "game",
    coopHint: factionBadgeCoopHint(),
    roleEyebrow: gameNodeRoleEyebrow(nodeRole, null),
  };
}

export function resolveFactionBadgeScanForPrintArtifact(input: {
  profileId: string;
  printArtifactId: string | null | undefined;
  env: { CITY_GAME_ENABLED?: string };
  season?: CrSeasonConfig;
  enrollmentRows?: SeasonPrintArtifactEnrollment[];
  now?: Date;
}): {
  enrollment: SeasonPrintArtifactEnrollment;
  objectStreams: ObjectPublicStream[];
  gameNode: GameNodeScanContext;
} | null {
  const enrollment = findSeasonPrintArtifactEnrollment(
    input.profileId,
    input.printArtifactId,
    "faction_badge",
    input.enrollmentRows ??
      (input.season ?? defaultSeason()).mobile_lore_enrollment ??
      []
  );
  if (!enrollment) return null;

  return {
    enrollment,
    objectStreams: factionBadgeObjectStreams(enrollment),
    gameNode: resolveFactionBadgeScanContext({
      enrollment,
      env: input.env,
      season: input.season,
      now: input.now,
    }),
  };
}
