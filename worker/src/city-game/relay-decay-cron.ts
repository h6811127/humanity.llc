import { getChildObject, listChildObjectsForParent, updateChildObjectIfUnchanged } from "../db/child-objects";
import { GAME_NODE_OBJECT_TYPE, isCityGameEnabled } from "./constants";
import { applyRelayDecayIfExpired, RELAY_CONTRIBUTE_MAX_RETRIES } from "./relay-contribute";
import { defaultSeason } from "./season-loader";
import { seasonNodeIdForObject, type CrSeasonConfig } from "./season-config";
import { isSeasonPlayOpen, resolveSeasonWindowPhase } from "./season-window";

function parseDocument(json: string): Record<string, unknown> {
  return JSON.parse(json) as Record<string, unknown>;
}

function relayGateNodeIds(season: CrSeasonConfig): string[] {
  return season.nodes
    .filter((row) => row.role === "relay_gate")
    .map((row) => row.node_id);
}

/** Persist neutral state when `held_until` is in the past (SW-05). */
export async function persistRelayDecayIfExpired(
  db: D1Database,
  input: {
    objectId: string;
    parentProfileId: string;
    now: Date;
    maxRetries?: number;
  }
): Promise<boolean> {
  const maxRetries = input.maxRetries ?? RELAY_CONTRIBUTE_MAX_RETRIES;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const existing = await getChildObject(db, input.objectId);
    if (!existing || existing.parent_profile_id !== input.parentProfileId) {
      return false;
    }
    if (existing.status !== "active" || existing.object_type !== GAME_NODE_OBJECT_TYPE) {
      return false;
    }

    const doc = parseDocument(existing.child_object_document_json);
    const applied = applyRelayDecayIfExpired(doc, input.now);
    if (!applied.decayed) return false;

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

    if (saved) return true;
  }

  throw new Error("RELAY_DECAY_WRITE_CONFLICT");
}

/**
 * Batch decay for all relay_gate nodes on the season root (**SW-05**).
 * Safe to call from cron, snapshot refresh, or scan repair.
 */
export async function runRelayTerritoryDecayCron(
  db: D1Database,
  env: { CITY_GAME_ENABLED?: string },
  now: Date = new Date(),
  season: CrSeasonConfig = defaultSeason()
): Promise<{ decayed: string[] }> {
  if (!isCityGameEnabled(env)) return { decayed: [] };

  const phase = resolveSeasonWindowPhase(now, season);
  if (!isSeasonPlayOpen(phase)) return { decayed: [] };

  const rootProfile = season.season_root_profile_id?.trim();
  if (!rootProfile) return { decayed: [] };

  const relayIds = new Set(relayGateNodeIds(season));
  const rows = await listChildObjectsForParent(db, rootProfile);
  const decayed: string[] = [];

  for (const row of rows) {
    if (row.status !== "active" || row.object_type !== GAME_NODE_OBJECT_TYPE) continue;
    const nodeId = seasonNodeIdForObject(row.object_id, season);
    if (!nodeId || !relayIds.has(nodeId)) continue;

    const didDecay = await persistRelayDecayIfExpired(db, {
      objectId: row.object_id,
      parentProfileId: rootProfile,
      now,
    });
    if (didDecay) decayed.push(nodeId);
  }

  return { decayed: [...new Set(decayed)] };
}

/** Half-hour cron hook — observability + proactive neutralization. */
export async function logCityGameRelayTerritoryDecay(
  env: { CITY_GAME_ENABLED?: string; DB?: D1Database },
  now = new Date()
): Promise<void> {
  if (!isCityGameEnabled(env) || !env.DB) return;
  const { decayed } = await runRelayTerritoryDecayCron(env.DB, env, now);
  if (decayed.length) {
    console.info("city_game_relay_decay", {
      season_id: defaultSeason().season_id,
      decayed,
      count: decayed.length,
    });
  }
}
