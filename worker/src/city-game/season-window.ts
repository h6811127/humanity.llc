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

export function seasonWindowChip(phase: SeasonWindowPhase): string | null {
  if (phase === "before") return "Season not open yet";
  if (phase === "after") return "Season ended — game paused";
  return null;
}

export function seasonWindowScanNote(phase: SeasonWindowPhase): string | null {
  if (phase === "before") {
    return "Wake the city has not opened yet — this object stays readable until the season window begins.";
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
