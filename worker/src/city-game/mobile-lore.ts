import type { ObjectPublicStream } from "../validation/object-streams";
import { isCityGameEnabled } from "./constants";
import { normalizeGameMeta } from "./game-meta";
import {
  CR_SEASON_01,
  findSeasonMobileLoreEnrollment,
  type SeasonMobileLoreEnrollment,
} from "./season-config";
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

export type { SeasonMobileLoreEnrollment };

const MOBILE_LORE_CARE_NOTE = "Glitch hoodie · mobile lore";

export function mobileLoreObjectStreams(
  enrollment: SeasonMobileLoreEnrollment,
  manifestoLine: string | null
): ObjectPublicStream[] {
  const statusLine =
    manifestoLine?.split("\n")[0]?.trim() || "Rotating pseudonym";
  const dropHint =
    enrollment.fragment_hint?.trim() ||
    enrollment.courier_note?.trim() ||
    "No active hint";

  return [
    { id: "territory", class: "place", label: "Courier", value: enrollment.label },
    { id: "relay", class: "route", label: "Drop", value: dropHint },
    { id: "bulletin", class: "narrative", label: "Status", value: statusLine },
    { id: "care", class: "care", label: "Note", value: MOBILE_LORE_CARE_NOTE },
  ];
}

export function mobileLoreCoopHint(): string {
  return "Courier nodes carry hints — the owner updates this line. No scan count, no rank.";
}

export function resolveMobileLoreScanContext(input: {
  enrollment: SeasonMobileLoreEnrollment;
  env: { CITY_GAME_ENABLED?: string };
  seasonForWindow?: Pick<CrSeasonConfig, "window" | "status">;
  now?: Date;
}): GameNodeScanContext {
  const enabled = isCityGameEnabled(input.env);
  const now = input.now ?? new Date();
  const seasonWindowPhase = resolveSeasonWindowPhase(now, input.seasonForWindow);
  const nodeRole = "mobile_lore";
  const gameMeta = normalizeGameMeta({});

  const base = {
    seasonId: CR_SEASON_01.season_id,
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
    return dormantMobileLoreContext(base, seasonWindowPhase);
  }

  return {
    ...base,
    enabled: true,
    mode: "game",
    coopHint: mobileLoreCoopHint(),
    roleEyebrow: gameNodeRoleEyebrow(nodeRole, null),
  };
}

function dormantMobileLoreContext(
  base: Omit<GameNodeScanContext, "enabled" | "mode" | "coopHint" | "roleEyebrow">,
  seasonWindowPhase: SeasonWindowPhase
): GameNodeScanContext {
  return {
    ...base,
    seasonWindowPhase,
    enabled: true,
    mode: "dormant",
    coopHint: null,
    roleEyebrow: gameNodeRoleEyebrow(base.nodeRole, base.district),
  };
}

export function resolveMobileLoreScanForPrintArtifact(input: {
  profileId: string;
  printArtifactId: string | null | undefined;
  manifestoLine: string | null;
  env: { CITY_GAME_ENABLED?: string };
  seasonForWindow?: Pick<CrSeasonConfig, "window" | "status">;
  enrollmentRows?: SeasonMobileLoreEnrollment[];
  now?: Date;
}): {
  enrollment: SeasonMobileLoreEnrollment;
  objectStreams: ObjectPublicStream[];
  gameNode: GameNodeScanContext;
} | null {
  const enrollment = findSeasonMobileLoreEnrollment(
    input.profileId,
    input.printArtifactId,
    input.enrollmentRows
  );
  if (!enrollment) return null;

  return {
    enrollment,
    objectStreams: mobileLoreObjectStreams(enrollment, input.manifestoLine),
    gameNode: resolveMobileLoreScanContext({
      enrollment,
      env: input.env,
      seasonForWindow: input.seasonForWindow,
      now: input.now,
    }),
  };
}
