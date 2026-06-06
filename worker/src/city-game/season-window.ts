import { isCityGameEnabled } from "./constants";
import { CR_SEASON_01, type CrSeasonConfig } from "./season-config";

export type SeasonWindowPhase = "unset" | "before" | "open" | "after";

export type SeasonWindowConfig = Pick<CrSeasonConfig, "window" | "status">;

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function parseWindowInstant(raw: string | null | undefined): number | null {
  if (raw == null || !String(raw).trim()) return null;
  const trimmed = String(raw).trim();
  if (!ISO_RE.test(trimmed)) return null;
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? ms : null;
}

/** Resolve play window phase. Null window dates → `unset` (local dev / pre-launch). */
export function resolveSeasonWindowPhase(
  now: Date = new Date(),
  season: SeasonWindowConfig = CR_SEASON_01
): SeasonWindowPhase {
  if (season.status === "ended") return "after";

  const startsAt = season.window?.starts_at ?? null;
  const endsAt = season.window?.ends_at ?? null;
  if (!startsAt && !endsAt) return "unset";

  const startMs = parseWindowInstant(startsAt);
  const endMs = parseWindowInstant(endsAt);
  const nowMs = now.getTime();

  if (startMs != null && nowMs < startMs) return "before";
  if (endMs != null && nowMs > endMs) return "after";
  return "open";
}

export function isSeasonPlayOpen(phase: SeasonWindowPhase): boolean {
  return phase === "unset" || phase === "open";
}

/** worker:dev only — treat pre-launch window as open for contribute smoke (B5 / E5). */
export function isLocalSeasonPlayOverride(env: {
  CITY_GAME_LOCAL_PLAY_OPEN?: string;
}): boolean {
  return env.CITY_GAME_LOCAL_PLAY_OPEN === "1";
}

/** worker:dev only — raise season node cap for local wave-open seeding. */
export function localSummerNodeCapOverride(env: {
  CITY_GAME_LOCAL_NODE_CAP?: string;
}): number | null {
  const raw = env.CITY_GAME_LOCAL_NODE_CAP?.trim();
  if (!raw) return null;
  const cap = Number.parseInt(raw, 10);
  if (!Number.isFinite(cap) || cap < 1) return null;
  return cap;
}

/** Contribute gate: production window, unset pre-launch, or local override before open. */
export function isSeasonContributeOpen(
  phase: SeasonWindowPhase,
  env?: { CITY_GAME_LOCAL_PLAY_OPEN?: string }
): boolean {
  if (isSeasonPlayOpen(phase)) return true;
  if (phase === "before" && isLocalSeasonPlayOverride(env ?? {})) return true;
  return false;
}

/** Player-facing open date for pre-season scan + board copy. */
export function formatSeasonOpenDate(startsAt: string | null | undefined): string | null {
  const ms = parseWindowInstant(startsAt);
  if (ms == null) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Chicago",
      timeZoneName: "short",
    }).format(new Date(ms));
  } catch {
    return null;
  }
}

export function seasonWindowChip(
  phase: SeasonWindowPhase,
  season?: SeasonWindowConfig
): string | null {
  if (phase === "before") {
    const dateLabel = formatSeasonOpenDate(season?.window?.starts_at);
    return dateLabel
      ? `Season opens ${dateLabel}. Scans work now.`
      : "Season opens soon. Scans work now.";
  }
  if (phase === "after") return "Season ended — game paused";
  return null;
}

/** Full status line for game scan onboarding band. */
export function seasonWindowOnboardingStatus(
  phase: SeasonWindowPhase,
  season?: SeasonWindowConfig
): string {
  if (phase === "open" || phase === "unset") {
    return "Season open — follow the city board for live relay holds and clues.";
  }
  if (phase === "before") {
    const dateLabel = formatSeasonOpenDate(season?.window?.starts_at);
    const openPart = dateLabel ? `Season opens ${dateLabel}.` : "Season opens soon.";
    return `${openPart} Scans work now. Plan your route on the city board.`;
  }
  return "Season ended — game paused. Public object state remains on the board.";
}

export function seasonWindowScanNote(
  phase: SeasonWindowPhase,
  season?: SeasonWindowConfig
): string | null {
  if (phase === "before") {
    const dateLabel = formatSeasonOpenDate(season?.window?.starts_at);
    const openPart = dateLabel ? `Season opens ${dateLabel}.` : "Season opens soon.";
    return `${openPart} Scans work now — object state is readable before play opens.`;
  }
  if (phase === "after") {
    return "Season 1 has ended — public object state remains, but game progression is paused.";
  }
  return null;
}

export function seasonWindowContributeMessage(phase: SeasonWindowPhase): string {
  if (phase === "before") {
    return "Wake the city has not opened yet — contributions start when the season window begins.";
  }
  return "Season 1 has ended — contributions are paused.";
}

/** Hourly cron stub: log when play window is closed (observability only). */
export function logCityGameSeasonWindowPhase(env: { CITY_GAME_ENABLED?: string }): void {
  if (!isCityGameEnabled(env)) return;
  const phase = resolveSeasonWindowPhase(new Date());
  if (phase === "unset" || phase === "open") return;
  console.info("city_game_season_window", {
    phase,
    season_id: CR_SEASON_01.season_id,
  });
}
