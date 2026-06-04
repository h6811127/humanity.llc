import { isGameFaction, type GameFaction } from "./factions";
import { applyRelayDecayIfExpired } from "./relay-contribute";
import type { GameMeta } from "./game-meta";
import type { MapNodeSnapshotRow } from "./map-node-snapshot";
import {
  seasonRelayPointsPerHour,
  type CrSeasonConfig,
} from "./season-config";

export type FactionNetworkPoints = Record<GameFaction, number>;

export type SignalWarSnapshotSummary = {
  faction_network_points: FactionNetworkPoints;
  dominant_faction: GameFaction | null;
  summary_lines: string[];
  relay_holds: Array<{
    node_id: string;
    label: string;
    faction: string;
    points_per_hour: number;
    held_until: string | null;
  }>;
};

/** Evaluate decay for scoring without persisting (snapshot cron already ran). */
export function relayMetaForScoring(
  row: MapNodeSnapshotRow,
  now: Date
): GameMeta {
  const applied = applyRelayDecayIfExpired(
    {
      game_meta: row.game_meta,
      object_streams: [],
      public_state: row.public_state,
    },
    now
  );
  return applied.meta;
}

export function computeFactionNetworkPoints(input: {
  nodes: MapNodeSnapshotRow[];
  season: CrSeasonConfig;
  now: Date;
}): FactionNetworkPoints {
  const points: FactionNetworkPoints = { red: 0, blue: 0, green: 0, yellow: 0 };
  for (const row of input.nodes) {
    if (row.role !== "relay_gate") continue;
    const meta = relayMetaForScoring(row, input.now);
    const faction = meta.held_by_faction;
    if (!faction || faction === "neutral" || !isGameFaction(faction)) continue;
    let weight =
      meta.points_per_hour ?? seasonRelayPointsPerHour(row.node_id, input.season) ?? 1;
    if (meta.artifact_id === "double_capture") {
      weight *= 2;
    }
    points[faction] += weight;
  }
  return points;
}

export function dominantFaction(
  points: FactionNetworkPoints
): GameFaction | null {
  let best: GameFaction | null = null;
  let bestScore = 0;
  for (const faction of ["red", "blue", "green", "yellow"] as const) {
    if (points[faction] > bestScore) {
      bestScore = points[faction];
      best = faction;
    }
  }
  return best;
}

export function formatFactionNetworkSummary(
  points: FactionNetworkPoints
): string[] {
  const ranked = (["red", "blue", "green", "yellow"] as const)
    .map((faction) => ({ faction, score: points[faction] }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) {
    return ["Signal War · relays unclaimed on the public board"];
  }
  return ranked.map(
    (row) =>
      `${row.faction.charAt(0).toUpperCase()}${row.faction.slice(1)} · ${row.score} network pts`
  );
}

export function buildSignalWarSnapshotSummary(input: {
  nodes: MapNodeSnapshotRow[];
  season: CrSeasonConfig;
  now: Date;
}): SignalWarSnapshotSummary {
  const faction_network_points = computeFactionNetworkPoints(input);
  const relay_holds: SignalWarSnapshotSummary["relay_holds"] = [];

  for (const row of input.nodes) {
    if (row.role !== "relay_gate") continue;
    const meta = relayMetaForScoring(row, input.now);
    const faction = meta.held_by_faction;
    if (!faction || faction === "neutral") continue;
    relay_holds.push({
      node_id: row.node_id,
      label: row.label,
      faction,
      points_per_hour:
        meta.points_per_hour ?? seasonRelayPointsPerHour(row.node_id, input.season) ?? 1,
      held_until: meta.held_until,
    });
  }

  relay_holds.sort((a, b) => a.node_id.localeCompare(b.node_id));

  return {
    faction_network_points,
    dominant_faction: dominantFaction(faction_network_points),
    summary_lines: formatFactionNetworkSummary(faction_network_points),
    relay_holds,
  };
}
