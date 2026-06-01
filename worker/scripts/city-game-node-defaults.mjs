/**
 * Default mint templates for Cedar Rapids Season 1 game_node objects.
 * Used by city-game:mint-node and season registry tests.
 */

/** @typedef {{ node_id: string; object_id: string; role: string; district: string; label: string }} SeasonNodeRow */

const ROLE_DEFAULTS = {
  relay_gate: {
    public_state: "Unclaimed — relay dormant until operators open the window",
    streams: [
      { id: "territory", class: "place", label: "Controller", value: "Unclaimed" },
      { id: "relay", class: "route", label: "Relay status", value: "Closed" },
      { id: "bulletin", class: "narrative", label: "Bulletin", value: "Awaiting season open" },
      { id: "care", class: "care", label: "Site", value: "Clear" },
    ],
    game_meta: {},
  },
  sanctuary: {
    public_state: "Treaty zone — no capture, regroup and share rumors",
    streams: [
      { id: "territory", class: "place", label: "Zone", value: "Sanctuary" },
      { id: "relay", class: "route", label: "Regroup", value: "Open to all factions" },
      { id: "bulletin", class: "narrative", label: "Rumors", value: "Quiet before season" },
      { id: "care", class: "care", label: "Site", value: "Clear" },
    ],
    game_meta: {},
  },
  lore_archive: {
    public_state: "Chapter dormant — lore unlocks with the season",
    streams: [
      { id: "territory", class: "place", label: "Archive", value: "Sealed" },
      { id: "relay", class: "route", label: "Chapter", value: "Not yet live" },
      { id: "bulletin", class: "narrative", label: "Note", value: "Artist line pending" },
      { id: "care", class: "care", label: "Site", value: "Clear" },
    ],
    game_meta: {},
  },
  temp_drop: {
    public_state: "Temp object dormant — window not open",
    streams: [
      { id: "territory", class: "place", label: "Object", value: "Temp drop" },
      { id: "relay", class: "route", label: "Collective", value: "0 / 20" },
      { id: "bulletin", class: "narrative", label: "Clue", value: "Seed hidden" },
      { id: "care", class: "care", label: "Trail", value: "Open" },
    ],
    game_meta: { collective_target: 20, collective_progress: 0 },
  },
  witness: {
    public_state: "Witness seal dormant — passes not yet issued",
    streams: [
      { id: "territory", class: "place", label: "Witness", value: "Library seal" },
      { id: "relay", class: "route", label: "Passes", value: "Not yet open" },
      { id: "bulletin", class: "narrative", label: "Vouch", value: "Issues trust for cabinet path" },
      { id: "care", class: "care", label: "Hours", value: "Check institution board" },
    ],
    game_meta: { scarcity_remaining: 25 },
  },
  route_splitter: {
    public_state: "Route splitter dormant — choose a path after season open",
    streams: [
      { id: "territory", class: "place", label: "Split", value: "Both routes closed" },
      { id: "relay", class: "route", label: "Wind route", value: "Closed" },
      { id: "bulletin", class: "narrative", label: "Flood route", value: "Closed" },
      { id: "care", class: "care", label: "Site", value: "Clear" },
    ],
    game_meta: {},
  },
  finale: {
    public_state: "Finale switch dormant — requires three district fragments",
    streams: [
      { id: "territory", class: "place", label: "Arch", value: "Dormant" },
      { id: "relay", class: "route", label: "Finale", value: "Locked" },
      { id: "bulletin", class: "narrative", label: "Need", value: "3 / 3 fragments" },
      { id: "care", class: "care", label: "Site", value: "Clear" },
    ],
    game_meta: { unlocked_by: [] },
  },
  care_loop: {
    public_state: "Discovery node — notice the fountain, trail, or rain garden state",
    streams: [
      { id: "territory", class: "place", label: "Place", value: "Rain garden / fountain" },
      { id: "relay", class: "route", label: "Route", value: "Open when care clear" },
      { id: "bulletin", class: "narrative", label: "Discovery", value: "Attention rewarded" },
      { id: "care", class: "care", label: "Site", value: "Clear · report if not" },
    ],
    game_meta: {},
  },
  mobile_lore: {
    public_state: "Mobile lore node — hoodie courier status",
    streams: [
      { id: "territory", class: "place", label: "Courier", value: "Unassigned" },
      { id: "relay", class: "route", label: "Drop", value: "No active hint" },
      { id: "bulletin", class: "narrative", label: "Status", value: "Rotating pseudonym" },
      { id: "care", class: "care", label: "Note", value: "Merch artifact only" },
    ],
    game_meta: { fragment_id: null },
  },
};

const EMPTY_GAME_META = {
  visible_until: null,
  compromised: false,
  collective_progress: null,
  collective_target: null,
  unlocked_by: [],
  vouch_requires: [],
  scarcity_remaining: null,
  fragment_id: null,
};

const NODE_OVERRIDES = {
  node_01: {
    public_state: "Red team holds the relay",
    streams: [
      { id: "territory", class: "place", label: "Controller", value: "Red team" },
      { id: "relay", class: "route", label: "Relay status", value: "Open · 18 min" },
      { id: "bulletin", class: "narrative", label: "Bulletin", value: "Shift west" },
      { id: "care", class: "care", label: "Site", value: "Clear" },
    ],
  },
  node_04: {
    public_state: "Seed clue live — share outward to evolve",
    streams: [
      { id: "territory", class: "place", label: "Object", value: "Temp drop · 48h" },
      { id: "relay", class: "route", label: "Collective", value: "4 / 20 scans" },
      { id: "bulletin", class: "narrative", label: "Clue", value: "Lantern path waking" },
      { id: "care", class: "care", label: "Trail", value: "Open" },
    ],
    game_meta: {
      visible_until: "2026-06-14T22:00:00-05:00",
      collective_progress: 4,
      collective_target: 20,
    },
  },
  node_05: {
    public_state: "Bridge relay open — watch for compromise notices",
    game_meta: { compromised: false },
    streams: [
      { id: "territory", class: "place", label: "Controller", value: "Neutral hold" },
      { id: "relay", class: "route", label: "Relay status", value: "Open · physically passable" },
      { id: "bulletin", class: "narrative", label: "Bulletin", value: "Verify before trusting" },
      { id: "care", class: "care", label: "Bridge", value: "Open · not a safety cert" },
    ],
  },
  node_07: {
    public_state: "Locked until River Lantern quorum",
    streams: [
      { id: "territory", class: "place", label: "Gate", value: "Vouch required" },
      { id: "relay", class: "route", label: "Path", value: "Hidden landmark" },
      { id: "bulletin", class: "narrative", label: "Choice", value: "Private now vs shared ending" },
      { id: "care", class: "care", label: "Site", value: "Clear" },
    ],
    game_meta: { vouch_requires: ["node_10"], fragment_id: "czech_1" },
  },
  node_09: {
    game_meta: { fragment_id: "fragment_1" },
    streams: [
      { id: "territory", class: "place", label: "Mural", value: "Artist place" },
      { id: "relay", class: "route", label: "Fragment", value: "1 of 3 live" },
      { id: "bulletin", class: "narrative", label: "Chapter", value: "Coordination puzzle" },
      { id: "care", class: "care", label: "Wall", value: "Clear" },
    ],
  },
  node_11: {
    game_meta: { fragment_id: "fragment_2" },
    streams: [
      { id: "territory", class: "place", label: "Marker", value: "Greene Square" },
      { id: "relay", class: "route", label: "Fragment", value: "2 of 3 live" },
      { id: "bulletin", class: "narrative", label: "Bonus", value: "Sunrise-only copy" },
      { id: "care", class: "care", label: "Plaza", value: "Clear" },
    ],
  },
  node_13: {
    public_state: "Finale switch dormant — requires three district fragments",
    game_meta: { unlocked_by: [] },
  },
  node_14: {
    public_state: "Care loop — maintenance truth wins over game copy",
    streams: [
      { id: "territory", class: "place", label: "Place", value: "Fountain / rain garden" },
      { id: "relay", class: "route", label: "Route", value: "Open when care clear" },
      { id: "bulletin", class: "narrative", label: "Discovery", value: "Notice the real state" },
      { id: "care", class: "care", label: "Site", value: "Clear · players do not certify safety" },
    ],
  },
};

/** Stable object_id slugs for the 15-node registry. */
export const SEASON_OBJECT_IDS = {
  node_01: "obj_cr_node_01_newbo",
  node_02: "obj_cr_node_02_cafe",
  node_03: "obj_cr_node_03_mural",
  node_04: "obj_cr_node_04_river",
  node_05: "obj_cr_node_05_bridge",
  node_06: "obj_cr_node_06_skywalk",
  node_07: "obj_cr_node_07_cabinet",
  node_08: "obj_cr_node_08_bench",
  node_09: "obj_cr_node_09_mural",
  node_10: "obj_cr_node_10_library",
  node_11: "obj_cr_node_11_marker",
  node_12: "obj_cr_node_12_bench",
  node_13: "obj_cr_node_13_finale",
  node_14: "obj_cr_node_14_fountain",
  node_15: "obj_cr_node_15_steps",
};

/**
 * @param {SeasonNodeRow} row
 * @param {string} seasonId
 */
export function buildGameNodeMintTemplate(row, seasonId) {
  const roleDefaults = ROLE_DEFAULTS[row.role] ?? ROLE_DEFAULTS.relay_gate;
  const override = NODE_OVERRIDES[row.node_id] ?? {};
  const objectId =
    row.object_id ?? SEASON_OBJECT_IDS[row.node_id] ?? `obj_cr_${row.node_id}`;

  return {
    node_id: row.node_id,
    object_id: objectId,
    public_label: row.label,
    public_state: override.public_state ?? roleDefaults.public_state,
    node_role: row.role,
    district: row.district,
    season_id: seasonId,
    object_streams: override.streams ?? roleDefaults.streams,
    game_meta: {
      ...EMPTY_GAME_META,
      ...(roleDefaults.game_meta ?? {}),
      ...(override.game_meta ?? {}),
    },
  };
}

/**
 * @param {SeasonNodeRow[]} nodes
 * @param {string} seasonId
 */
export function buildAllGameNodeTemplates(nodes, seasonId) {
  return nodes.map((row) => buildGameNodeMintTemplate(row, seasonId));
}
