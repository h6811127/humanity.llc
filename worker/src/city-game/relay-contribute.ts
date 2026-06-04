import { getChildObject, updateChildObjectIfUnchanged } from "../db/child-objects";
import {
  factionControllerLabel,
  factionRelayStatusLabel,
  isGameFaction,
  type GameFaction,
  type GameFactionHold,
} from "./factions";
import { normalizeGameMeta, type GameMeta } from "./game-meta";
import { defaultSeason } from "./season-loader";
import {
  seasonNodeIdForObject,
  seasonRelayDecayHours,
  seasonRelayPointsPerHour,
  type CrSeasonConfig,
} from "./season-config";

export const RELAY_CONTRIBUTE_MAX_RETRIES = 24;

export type RelayContributeAction = "capture" | "reinforce";

export type RelayContributeResult = {
  heldByFaction: GameFactionHold;
  heldUntil: string | null;
  actionApplied: RelayContributeAction;
  overharvestTriggered: boolean;
};

function parseDocument(json: string): Record<string, unknown> {
  return JSON.parse(json) as Record<string, unknown>;
}

function readHeldFaction(meta: GameMeta): GameFactionHold {
  const raw = meta.held_by_faction;
  if (!raw || raw === "neutral") return "neutral";
  return isGameFaction(raw) ? raw : "neutral";
}

export function relayDecayHoursForSeason(season: CrSeasonConfig): number {
  return seasonRelayDecayHours(season);
}

/** SW-05 — neutralize relay when `held_until` is in the past. */
export function applyRelayDecayIfExpired(
  doc: Record<string, unknown>,
  now: Date
): { doc: Record<string, unknown>; meta: GameMeta; decayed: boolean } {
  const meta = normalizeGameMeta(doc.game_meta);
  const held = readHeldFaction(meta);
  if (held === "neutral" || !meta.held_until) {
    return { doc, meta, decayed: false };
  }
  const untilMs = Date.parse(meta.held_until);
  if (!Number.isFinite(untilMs) || untilMs > now.getTime()) {
    return { doc, meta, decayed: false };
  }

  const nextMeta: GameMeta = {
    ...meta,
    held_by_faction: "neutral",
    held_until: null,
  };
  const streams = updateTerritoryStreams(doc, "neutral", nextMeta.held_until);
  return {
    doc: {
      ...doc,
      game_meta: nextMeta,
      object_streams: streams,
      public_state: "Relay unclaimed — territory decayed to neutral",
    },
    meta: nextMeta,
    decayed: true,
  };
}

function updateTerritoryStreams(
  doc: Record<string, unknown>,
  faction: GameFactionHold,
  heldUntil: string | null
): unknown {
  if (!Array.isArray(doc.object_streams)) return doc.object_streams;
  const decayNote =
    heldUntil != null
      ? ` · hold until ${heldUntil.slice(0, 16).replace("T", " ")}`
      : "";
  return (doc.object_streams as Record<string, unknown>[]).map((row) => {
    if (row.id === "territory" || row.label === "Controller") {
      return { ...row, value: factionControllerLabel(faction) };
    }
    if (row.id === "relay" || row.label === "Relay status") {
      return {
        ...row,
        value: `${factionRelayStatusLabel(faction)}${decayNote}`,
      };
    }
    return row;
  });
}

function heldUntilFromNow(now: Date, decayHours: number): string {
  return new Date(now.getTime() + decayHours * 60 * 60 * 1000).toISOString();
}

function applyOverharvest(meta: GameMeta): { meta: GameMeta; triggered: boolean } {
  const limit = meta.overharvest_limit;
  if (limit == null) {
    return { meta, triggered: false };
  }
  const nextCount = (meta.overharvest_count ?? 0) + 1;
  const nextMeta: GameMeta = {
    ...meta,
    overharvest_count: nextCount,
    compromised: nextCount >= limit ? true : meta.compromised,
  };
  return { meta: nextMeta, triggered: nextCount >= limit };
}

function resolvePointsPerHour(
  meta: GameMeta,
  nodeId: string | null,
  season: CrSeasonConfig
): number {
  if (meta.points_per_hour != null && meta.points_per_hour > 0) {
    return meta.points_per_hour;
  }
  if (nodeId) {
    const fromSeason = seasonRelayPointsPerHour(nodeId, season);
    if (fromSeason != null) return fromSeason;
  }
  return 1;
}

export function applyRelayCaptureLocally(
  doc: Record<string, unknown>,
  input: {
    faction: GameFaction;
    now: Date;
    decayHours: number;
    action: RelayContributeAction;
    nodeId?: string | null;
    season?: CrSeasonConfig;
  }
): { doc: Record<string, unknown>; meta: GameMeta; overharvestTriggered: boolean } {
  const decayed = applyRelayDecayIfExpired(doc, input.now);
  doc = decayed.doc;
  let meta = decayed.meta;

  if (meta.compromised) {
    throw new Error("RELAY_COMPROMISED");
  }

  const currentHold = readHeldFaction(meta);

  if (
    input.action === "capture" &&
    meta.artifact_id === "shield_generator" &&
    currentHold !== "neutral" &&
    currentHold !== input.faction
  ) {
    const untilMs = meta.held_until ? Date.parse(meta.held_until) : NaN;
    if (Number.isFinite(untilMs) && untilMs > input.now.getTime()) {
      throw new Error("RELAY_SHIELDED");
    }
  }

  if (input.action === "reinforce") {
    if (currentHold !== input.faction) {
      throw new Error("REINFORCE_FACTION_MISMATCH");
    }
    const heldUntil = heldUntilFromNow(input.now, input.decayHours);
    const pointsPerHour = resolvePointsPerHour(
      meta,
      input.nodeId ?? null,
      input.season ?? defaultSeason()
    );
    meta = {
      ...meta,
      held_by_faction: input.faction,
      held_until: heldUntil,
      points_per_hour: meta.points_per_hour ?? pointsPerHour,
    };
    const streams = updateTerritoryStreams(doc, input.faction, heldUntil);
    return {
      doc: {
        ...doc,
        game_meta: meta,
        object_streams: streams,
        public_state: `${factionControllerLabel(input.faction)} reinforced this relay`,
      },
      meta,
      overharvestTriggered: false,
    };
  }

  const heldUntil = heldUntilFromNow(input.now, input.decayHours);
  const pointsPerHour = resolvePointsPerHour(
    meta,
    input.nodeId ?? null,
    input.season ?? defaultSeason()
  );
  const overharvest = applyOverharvest({
    ...meta,
    held_by_faction: input.faction,
    held_until: heldUntil,
    points_per_hour: pointsPerHour,
  });
  meta = overharvest.meta;
  const streams = updateTerritoryStreams(doc, input.faction, heldUntil);
  return {
    doc: {
      ...doc,
      game_meta: meta,
      object_streams: streams,
      public_state: `${factionControllerLabel(input.faction)} holds the relay`,
    },
    meta,
    overharvestTriggered: overharvest.triggered,
  };
}

export async function applyRelayContributeWithRetry(
  db: D1Database,
  input: {
    objectId: string;
    parentProfileId: string;
    faction: GameFaction;
    action: RelayContributeAction;
    now: Date;
    season: CrSeasonConfig;
    maxRetries?: number;
  }
): Promise<RelayContributeResult | null> {
  const decayHours = relayDecayHoursForSeason(input.season);
  const maxRetries = input.maxRetries ?? RELAY_CONTRIBUTE_MAX_RETRIES;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const existing = await getChildObject(db, input.objectId);
    if (!existing || existing.parent_profile_id !== input.parentProfileId) {
      return null;
    }

    let doc = parseDocument(existing.child_object_document_json);
    const nodeId = seasonNodeIdForObject(input.objectId, input.season);
    let applied;
    try {
      applied = applyRelayCaptureLocally(doc, {
        faction: input.faction,
        now: input.now,
        decayHours,
        action: input.action,
        nodeId,
        season: input.season,
      });
    } catch (e) {
      if (e instanceof Error) {
        throw e;
      }
      throw new Error("RELAY_CONTRIBUTE_FAILED");
    }

    const updatedAt = new Date().toISOString();
    const publicState =
      typeof applied.doc.public_state === "string"
        ? applied.doc.public_state
        : existing.public_state;

    const saved = await updateChildObjectIfUnchanged(
      db,
      {
        objectId: input.objectId,
        parentProfileId: input.parentProfileId,
        objectType: existing.object_type,
        publicLabel: existing.public_label,
        publicState,
        status: "active",
        documentJson: JSON.stringify(applied.doc),
        createdAt: existing.created_at,
        updatedAt,
      },
      existing.updated_at
    );

    if (!saved) continue;

    return {
      heldByFaction: readHeldFaction(applied.meta),
      heldUntil: applied.meta.held_until,
      actionApplied: input.action,
      overharvestTriggered: applied.overharvestTriggered,
    };
  }

  throw new Error("RELAY_WRITE_CONFLICT");
}
