import { dominantFaction, type FactionNetworkPoints } from "./faction-network-score";
import { applyRelayDecayIfExpired } from "./relay-contribute";
import type { GameMeta } from "./game-meta";
import { isGameFaction, type GameFaction } from "./factions";
import { fragmentLatticeProgress } from "./unlock-engine";
import { seasonFinaleNodeId, seasonFragmentNodeIds, type CrSeasonConfig } from "./season-config";
import type { SeasonSignalWarConfig } from "./map-fog-filter";
import type { MapNodeSnapshotRow } from "./map-node-snapshot";

export type DualVictorySnapshot = {
  network_leader: GameFaction | null;
  network_majority_met: boolean;
  awakening_fragments_complete: boolean;
  finale_open: boolean;
  summary_lines: string[];
};

function seasonSignalWarDualVictory(
  season: CrSeasonConfig
): SeasonSignalWarConfig["dual_victory"] {
  const raw = (season as CrSeasonConfig & { signal_war?: SeasonSignalWarConfig }).signal_war;
  return raw?.dual_victory ?? null;
}

function relayHoldFaction(meta: GameMeta, now: Date): GameFaction | null {
  const applied = applyRelayDecayIfExpired(
    { game_meta: meta, object_streams: [], public_state: "" },
    now
  );
  const faction = applied.meta.held_by_faction;
  if (!faction || !isGameFaction(faction)) return null;
  return faction;
}

export function buildDualVictorySnapshot(input: {
  nodes: MapNodeSnapshotRow[];
  factionPoints: FactionNetworkPoints;
  season: CrSeasonConfig;
  now: Date;
}): DualVictorySnapshot {
  const config = seasonSignalWarDualVictory(input.season);
  const fraction =
    typeof config?.network_majority_relay_fraction === "number" &&
    config.network_majority_relay_fraction > 0 &&
    config.network_majority_relay_fraction <= 1
      ? config.network_majority_relay_fraction
      : 0.5;

  const relayRows = input.nodes.filter((row) => row.role === "relay_gate");
  const holdsByFaction: Partial<Record<GameFaction, number>> = {};
  let ownedRelays = 0;
  for (const row of relayRows) {
    const faction = relayHoldFaction(row.game_meta, input.now);
    if (!faction) continue;
    ownedRelays += 1;
    holdsByFaction[faction] = (holdsByFaction[faction] ?? 0) + 1;
  }

  const leader = dominantFaction(input.factionPoints);
  const leaderRelayHolds = leader ? (holdsByFaction[leader] ?? 0) : 0;
  const network_majority_met =
    ownedRelays > 0 && leader != null && leaderRelayHolds / ownedRelays >= fraction;

  const finaleId = seasonFinaleNodeId(input.season);
  const finale = input.nodes.find((row) => row.node_id === finaleId);
  const fragmentIds = seasonFragmentNodeIds(input.season);
  const lattice = finale
    ? fragmentLatticeProgress(finale.game_meta, fragmentIds)
    : { claimed: 0, required: fragmentIds.length, complete: false };
  const awakening_fragments_complete = lattice.complete;
  const finale_open = finale
    ? /finale switch live|alley arch is waking/i.test(finale.public_state)
    : false;

  const lines: string[] = [];
  if (network_majority_met && leader) {
    const label = leader.charAt(0).toUpperCase() + leader.slice(1);
    lines.push(
      `Signal War · ${label} leads the relay network (${leaderRelayHolds} of ${ownedRelays} held relays)`
    );
  } else if (leader) {
    const label = leader.charAt(0).toUpperCase() + leader.slice(1);
    lines.push(`Signal War · ${label} ahead on network points — relay majority not secured yet`);
  }
  if (awakening_fragments_complete) {
    lines.push("Wake the city · district fragment lattice complete");
  } else if (lattice.required > 0) {
    lines.push(
      `Wake the city · ${lattice.claimed} / ${lattice.required} district fragments on the public lattice`
    );
  }
  if (finale_open) {
    lines.push("Finale alley arch live — cooperative path in play");
  }
  if (!lines.length) {
    lines.push("Season open — contest relays and cooperative paths both in play");
  }

  return {
    network_leader: leader,
    network_majority_met,
    awakening_fragments_complete,
    finale_open,
    summary_lines: lines,
  };
}
