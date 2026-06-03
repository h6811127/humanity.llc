import { resolveActiveBulletinSlot } from "./bulletin-schedule";
import { resolveActiveRouteWindowSlot } from "./route-window-schedule";
import type { MapNodeSnapshotRow } from "./map-node-snapshot";
import { GAME_NODE_FORBIDDEN_COPY } from "./scan-view";
import {
  CR_SEASON_01,
  seasonFinaleNodeId,
  seasonFragmentNodeIds,
  seasonWitnessScarcityNodeId,
  type CrSeasonConfig,
} from "./season-config";
import { isSeasonPlayOpen, resolveSeasonWindowPhase } from "./season-window";
import {
  fragmentLatticeProgress,
  isCollectiveQuorumComplete,
  isWitnessScarcityDepleted,
} from "./unlock-engine";

export const DEFAULT_MAX_HEADLINES = 8;

function stripTeam(controller: string): string {
  return controller.replace(/\s+team$/i, "").trim();
}

function nodeById(
  nodes: MapNodeSnapshotRow[],
  nodeId: string
): MapNodeSnapshotRow | undefined {
  return nodes.find((row) => row.node_id === nodeId);
}

export function headlinePassesCopyGuard(line: string): boolean {
  const lower = line.toLowerCase();
  return !GAME_NODE_FORBIDDEN_COPY.some((term) => lower.includes(term));
}

export function dedupeHeadlines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    if (!headlinePassesCopyGuard(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/** Editorial world headlines for the rules-page ticker (CR-M01–07). */
export function buildLiveMapHeadlines(input: {
  season?: CrSeasonConfig;
  nodes: MapNodeSnapshotRow[];
  now?: Date;
}): string[] {
  const season = input.season ?? CR_SEASON_01;
  const now = input.now ?? new Date();
  const phase = resolveSeasonWindowPhase(now, season);
  const maxHeadlines =
    season.live_map_ticker?.max_headlines ?? DEFAULT_MAX_HEADLINES;

  if (!isSeasonPlayOpen(phase) && phase !== "unset") {
    return [];
  }

  const candidates: string[] = [];
  const finaleId = seasonFinaleNodeId();
  const finale = nodeById(input.nodes, finaleId);

  if (finale) {
    const lattice = fragmentLatticeProgress(finale.game_meta, seasonFragmentNodeIds());
    if (lattice.complete) {
      candidates.push(
        "Greene Square added the third fragment and completed the route lattice"
      );
    }
    if (/finale switch live|alley arch is waking/i.test(finale.public_state)) {
      candidates.unshift("Downtown alley arch switched live — the city wake continues");
    }
  }

  const river = nodeById(input.nodes, "node_04");
  if (river && isCollectiveQuorumComplete(river.game_meta)) {
    const target = river.game_meta.collective_target;
    if (target != null) {
      candidates.push(
        `Riverwalk lantern hit ${target} contributions and woke the next clue`
      );
    } else {
      candidates.push("Riverwalk lantern hit quorum and woke the next clue");
    }
  }

  const cabinet = nodeById(input.nodes, "node_07");
  if (
    cabinet &&
    (cabinet.game_meta.unlocked_by.includes("node_04") ||
      /evolved|shared outward|unlocked/i.test(cabinet.public_state))
  ) {
    candidates.push(
      "Czech Village cabinet evolved after the first finder shared it outward"
    );
  }

  const bridge = nodeById(input.nodes, "node_05");
  if (bridge?.game_meta.compromised) {
    candidates.push("Blue compromised the 16th Avenue bridge bulletin until rekey");
  }

  const skywalk = nodeById(input.nodes, "node_06");
  if (skywalk?.route_open === true) {
    candidates.push(
      "Skywalk note stayed hidden long enough to unlock the better shared ending"
    );
  }

  const witness = nodeById(input.nodes, seasonWitnessScarcityNodeId());
  if (witness && isWitnessScarcityDepleted(witness.game_meta, witness.role)) {
    candidates.push(
      "Library witness card issued its final sunset pass and closed for the night"
    );
  }

  for (const entry of season.bulletin_schedule?.entries ?? []) {
    const slot = resolveActiveBulletinSlot(entry.node_id, now, season);
    if (!slot) continue;
    const registry = season.nodes.find((row) => row.node_id === entry.node_id);
    if (!registry) continue;
    const node = nodeById(input.nodes, entry.node_id);
    if (node?.game_meta.compromised) continue;

    if (slot.controller && registry.role === "relay_gate") {
      const team = stripTeam(slot.controller);
      candidates.push(
        `${team} reclaimed the ${registry.label} and posted a rotating bulletin`
      );
    } else if (slot.bulletin?.trim()) {
      candidates.push(slot.bulletin.trim());
    }
  }

  for (const entry of season.route_window_schedule?.entries ?? []) {
    const slot = resolveActiveRouteWindowSlot(entry.node_id, now, season);
    if (!slot?.route_open || !slot.bulletin?.trim()) continue;
    candidates.push(slot.bulletin.trim());
  }

  return dedupeHeadlines(candidates).slice(0, maxHeadlines);
}
