import type { GameMeta } from "./game-meta";
import { isCityGameEnabled } from "./constants";
import { CR_SEASON_01, type CrSeasonConfig } from "./season-config";
import {
  isSeasonPlayOpen,
  resolveSeasonWindowPhase,
  type SeasonWindowPhase,
} from "./season-window";
import type { ObjectPublicStream } from "../validation/object-streams";

export type BulletinScheduleSlot = {
  /** ISO instant — absolute slot start. */
  from?: string | null;
  /** Hours after `window.starts_at` (requires launch window). */
  after_start_hours?: number | null;
  bulletin?: string;
  relay_status?: string;
  controller?: string;
};

export type BulletinScheduleEntry = {
  node_id: string;
  slots: BulletinScheduleSlot[];
};

export type BulletinScheduleConfig = {
  entries?: BulletinScheduleEntry[];
};

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function parseInstant(raw: string | null | undefined): number | null {
  if (raw == null || !String(raw).trim()) return null;
  const trimmed = String(raw).trim();
  if (!ISO_RE.test(trimmed)) return null;
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? ms : null;
}

function slotEffectiveFromMs(
  slot: BulletinScheduleSlot,
  seasonStartMs: number | null,
  windowPhase: SeasonWindowPhase
): number | null {
  const absolute = parseInstant(slot.from ?? null);
  if (absolute != null) return absolute;

  if (slot.after_start_hours == null || !Number.isFinite(slot.after_start_hours)) {
    return null;
  }
  if (seasonStartMs != null) {
    return seasonStartMs + slot.after_start_hours * 3_600_000;
  }
  // Local dev / pre-launch: only hour-0 slots apply when window dates unset.
  if (windowPhase === "unset" && slot.after_start_hours === 0) {
    return 0;
  }
  return null;
}

/** Active scheduled bulletin slot for a node at `now` (latest eligible slot). */
export function resolveActiveBulletinSlot(
  nodeId: string,
  now: Date = new Date(),
  season: Pick<CrSeasonConfig, "window" | "status" | "bulletin_schedule"> = {} as CrSeasonConfig
): BulletinScheduleSlot | null {
  const entries = season.bulletin_schedule?.entries ?? [];
  const entry = entries.find((row) => row.node_id === nodeId);
  if (!entry?.slots?.length) return null;

  const windowPhase = resolveSeasonWindowPhase(now, season);
  const seasonStartMs = parseInstant(season.window?.starts_at ?? null);
  const nowMs = now.getTime();

  let best: { slot: BulletinScheduleSlot; fromMs: number } | null = null;
  for (const slot of entry.slots) {
    const fromMs = slotEffectiveFromMs(slot, seasonStartMs, windowPhase);
    if (fromMs == null || fromMs > nowMs) continue;
    if (!best || fromMs > best.fromMs) {
      best = { slot, fromMs };
    }
  }
  return best?.slot ?? null;
}

export function shouldApplyBulletinSchedule(input: {
  nodeRole: string;
  gameMeta: GameMeta;
  seasonWindowPhase: SeasonWindowPhase;
}): boolean {
  if (input.nodeRole !== "relay_gate") return false;
  if (input.gameMeta.compromised) return false;
  if (!isSeasonPlayOpen(input.seasonWindowPhase)) return false;
  return true;
}

export function applyBulletinScheduleToStreams(
  streams: ObjectPublicStream[],
  nodeId: string | null,
  now: Date,
  season: Pick<CrSeasonConfig, "window" | "status" | "bulletin_schedule">,
  opts: {
    nodeRole: string;
    gameMeta: GameMeta;
    seasonWindowPhase: SeasonWindowPhase;
  }
): ObjectPublicStream[] {
  if (!nodeId || !shouldApplyBulletinSchedule(opts)) return streams;
  const slot = resolveActiveBulletinSlot(nodeId, now, season);
  if (!slot) return streams;

  return streams.map((row) => {
    if (
      slot.bulletin &&
      (row.id === "bulletin" || row.label === "Bulletin" || row.class === "narrative")
    ) {
      return { ...row, value: slot.bulletin };
    }
    if (
      slot.relay_status &&
      (row.id === "relay" || row.label === "Relay status" || row.class === "route")
    ) {
      return { ...row, value: slot.relay_status };
    }
    if (
      slot.controller &&
      (row.id === "territory" || row.label === "Controller" || row.class === "place")
    ) {
      return { ...row, value: slot.controller };
    }
    return row;
  });
}

/** Cron observability — count relay nodes with an active scheduled slot. */
export function logCityGameBulletinSchedule(
  env: { CITY_GAME_ENABLED?: string },
  now = new Date()
): void {
  if (!isCityGameEnabled(env)) return;
  const phase = resolveSeasonWindowPhase(now, CR_SEASON_01);
  if (!isSeasonPlayOpen(phase)) return;

  const entries = CR_SEASON_01.bulletin_schedule?.entries ?? [];
  let active = 0;
  for (const entry of entries) {
    if (resolveActiveBulletinSlot(entry.node_id, now, CR_SEASON_01)) active++;
  }
  if (entries.length) {
    console.info("city_game_bulletin_schedule", {
      season_id: CR_SEASON_01.season_id,
      entries: entries.length,
      active,
      phase,
    });
  }
}
