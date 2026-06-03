import type { GameMeta } from "./game-meta";
import { isCityGameEnabled } from "./constants";
import { CR_SEASON_01, type CrSeasonConfig } from "./season-config";
import {
  isSeasonPlayOpen,
  resolveSeasonWindowPhase,
  type SeasonWindowPhase,
} from "./season-window";
import type { ObjectPublicStream } from "../validation/object-streams";

export type RouteWindowSlot = {
  /** ISO instant — absolute slot start. */
  from?: string | null;
  /** Hours after `window.starts_at`. */
  after_start_hours?: number | null;
  /** Local hour range in season timezone (0–23). Wraps when until < from. */
  local_hour_from?: number | null;
  local_hour_until?: number | null;
  /** When false, route streams show sealed/dormant copy. */
  route_open?: boolean;
  public_state?: string;
  territory?: string;
  /** Primary route stream (Wind route / Chapter). */
  relay_route?: string;
  /** Secondary route stream (Flood route / Note on splitters). */
  secondary_route?: string;
  bulletin?: string;
  coop_hint?: string;
};

export type RouteWindowEntry = {
  node_id: string;
  slots: RouteWindowSlot[];
};

export type RouteWindowScheduleConfig = {
  timezone?: string;
  entries?: RouteWindowEntry[];
};

export type RouteWindowApplyResult = {
  streams: ObjectPublicStream[];
  coopHint: string | null;
  routeOpen: boolean | null;
  publicState: string | null;
};

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const DEFAULT_TIMEZONE = "America/Chicago";

const ROUTE_WINDOW_ROLES = new Set(["route_splitter", "lore_archive"]);

function parseInstant(raw: string | null | undefined): number | null {
  if (raw == null || !String(raw).trim()) return null;
  const trimmed = String(raw).trim();
  if (!ISO_RE.test(trimmed)) return null;
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? ms : null;
}

function slotEffectiveFromMs(
  slot: RouteWindowSlot,
  seasonStartMs: number | null,
  windowPhase: SeasonWindowPhase
): number | null {
  const absolute = parseInstant(slot.from ?? null);
  if (absolute != null) return absolute;

  if (slot.after_start_hours == null || !Number.isFinite(slot.after_start_hours)) {
    if (
      slot.local_hour_from != null &&
      slot.local_hour_until != null &&
      windowPhase === "unset"
    ) {
      return 0;
    }
    return null;
  }
  if (seasonStartMs != null) {
    return seasonStartMs + slot.after_start_hours * 3_600_000;
  }
  if (windowPhase === "unset" && slot.after_start_hours === 0) {
    return 0;
  }
  return null;
}

export function localHourInTimeZone(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
  const hour = Number.parseInt(hourPart, 10);
  return Number.isFinite(hour) ? hour % 24 : 0;
}

export function isLocalHourInRange(hour: number, from: number, until: number): boolean {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const start = ((from % 24) + 24) % 24;
  let end = until;
  if (end === 24) end = 24;
  else end = ((until % 24) + 24) % 24;

  if (start === end) return true;
  if (start < end) {
    if (until === 24) return normalizedHour >= start;
    return normalizedHour >= start && normalizedHour < end;
  }
  return normalizedHour >= start || normalizedHour < end;
}

function slotMatchesNow(
  slot: RouteWindowSlot,
  now: Date,
  seasonStartMs: number | null,
  windowPhase: SeasonWindowPhase,
  timeZone: string
): { matches: boolean; fromMs: number } {
  const nowMs = now.getTime();
  const fromMs = slotEffectiveFromMs(slot, seasonStartMs, windowPhase);
  if (fromMs != null && fromMs > nowMs) {
    return { matches: false, fromMs: 0 };
  }

  if (slot.local_hour_from != null && slot.local_hour_until != null) {
    const hour = localHourInTimeZone(now, timeZone);
    if (!isLocalHourInRange(hour, slot.local_hour_from, slot.local_hour_until)) {
      return { matches: false, fromMs: fromMs ?? 0 };
    }
  } else if (fromMs == null) {
    return { matches: false, fromMs: 0 };
  }

  return { matches: true, fromMs: fromMs ?? 0 };
}

export function scheduleTimeZone(
  season: Pick<CrSeasonConfig, "route_window_schedule">
): string {
  const tz = season.route_window_schedule?.timezone?.trim();
  return tz || DEFAULT_TIMEZONE;
}

/** Active route-window slot for a node (latest eligible match). */
export function resolveActiveRouteWindowSlot(
  nodeId: string,
  now: Date = new Date(),
  season: Pick<CrSeasonConfig, "window" | "status" | "route_window_schedule"> = {} as CrSeasonConfig
): RouteWindowSlot | null {
  const entries = season.route_window_schedule?.entries ?? [];
  const entry = entries.find((row) => row.node_id === nodeId);
  if (!entry?.slots?.length) return null;

  const windowPhase = resolveSeasonWindowPhase(now, season);
  const seasonStartMs = parseInstant(season.window?.starts_at ?? null);
  const timeZone = scheduleTimeZone(season);

  let best: { slot: RouteWindowSlot; fromMs: number } | null = null;
  for (const slot of entry.slots) {
    const { matches, fromMs } = slotMatchesNow(
      slot,
      now,
      seasonStartMs,
      windowPhase,
      timeZone
    );
    if (!matches) continue;
    if (!best || fromMs > best.fromMs) {
      best = { slot, fromMs };
    }
  }
  return best?.slot ?? null;
}

export function shouldApplyRouteWindowSchedule(input: {
  nodeRole: string;
  gameMeta: GameMeta;
  seasonWindowPhase: SeasonWindowPhase;
  nodeId: string | null;
  season: Pick<CrSeasonConfig, "route_window_schedule">;
}): boolean {
  if (!input.nodeId) return false;
  if (!ROUTE_WINDOW_ROLES.has(input.nodeRole)) return false;
  if (input.gameMeta.compromised) return false;
  if (!isSeasonPlayOpen(input.seasonWindowPhase)) return false;
  return (input.season.route_window_schedule?.entries ?? []).some(
    (row) => row.node_id === input.nodeId
  );
}

function applySlotToStreams(
  streams: ObjectPublicStream[],
  slot: RouteWindowSlot,
  nodeRole: string
): ObjectPublicStream[] {
  return streams.map((row) => {
    if (slot.relay_route && row.id === "relay") {
      return { ...row, value: slot.relay_route };
    }
    if (slot.secondary_route && row.id === "bulletin" && nodeRole === "route_splitter") {
      return { ...row, value: slot.secondary_route };
    }
    if (
      slot.bulletin &&
      row.id === "bulletin" &&
      (nodeRole === "lore_archive" || !slot.secondary_route)
    ) {
      return { ...row, value: slot.bulletin };
    }
    if (
      slot.territory &&
      (row.id === "territory" || row.class === "place")
    ) {
      return { ...row, value: slot.territory };
    }
    return row;
  });
}

export function applyRouteWindowScheduleToStreams(
  streams: ObjectPublicStream[],
  nodeId: string | null,
  now: Date,
  season: Pick<CrSeasonConfig, "window" | "status" | "route_window_schedule">,
  opts: {
    nodeRole: string;
    gameMeta: GameMeta;
    seasonWindowPhase: SeasonWindowPhase;
  }
): RouteWindowApplyResult {
  const base: RouteWindowApplyResult = {
    streams,
    coopHint: null,
    routeOpen: null,
    publicState: null,
  };
  if (
    !nodeId ||
    !shouldApplyRouteWindowSchedule({
      ...opts,
      nodeId,
      season,
    })
  ) {
    return base;
  }

  const slot = resolveActiveRouteWindowSlot(nodeId, now, season);
  if (!slot) return base;

  return {
    streams: applySlotToStreams(streams, slot, opts.nodeRole),
    coopHint: slot.coop_hint?.trim() || null,
    routeOpen: slot.route_open ?? null,
    publicState: slot.public_state?.trim() || null,
  };
}

export function logCityGameRouteWindowSchedule(
  env: { CITY_GAME_ENABLED?: string },
  now = new Date()
): void {
  if (!isCityGameEnabled(env)) return;
  const phase = resolveSeasonWindowPhase(now, CR_SEASON_01);
  if (!isSeasonPlayOpen(phase)) return;

  const entries = CR_SEASON_01.route_window_schedule?.entries ?? [];
  let open = 0;
  for (const entry of entries) {
    const slot = resolveActiveRouteWindowSlot(entry.node_id, now, CR_SEASON_01);
    if (slot?.route_open) open++;
  }
  if (entries.length) {
    console.info("city_game_route_window_schedule", {
      season_id: CR_SEASON_01.season_id,
      entries: entries.length,
      open,
      phase,
      timezone: scheduleTimeZone(CR_SEASON_01),
    });
  }
}
