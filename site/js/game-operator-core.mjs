/** Cedar Rapids game-operator UI helpers (no signing deps). */

export const GAME_NODE_OBJECT_TYPE = "game_node";

export const GAME_OPERATOR_PRESETS = [
  {
    id: "quorum_met",
    label: "River Lantern quorum met",
    public_state: "Unlocked together — Czech Village cabinet path is live",
    game_meta: {
      collective_progress: 20,
      unlocked_by: ["node_04"],
    },
  },
  {
    id: "compromise",
    label: "Bridge compromised",
    public_state: "Relay poisoned — bulletin untrusted until rekey",
    game_meta: { compromised: true },
  },
  {
    id: "rekey",
    label: "Bridge rekeyed",
    public_state: "Relay restored — new bulletin live",
    game_meta: { compromised: false },
  },
  {
    id: "relay_red",
    label: "Relay · Red holds",
    public_state: "Red team holds the relay",
    game_meta: { held_by_faction: "red" },
  },
  {
    id: "relay_blue",
    label: "Relay · Blue holds",
    public_state: "Blue team holds the relay",
    game_meta: { held_by_faction: "blue" },
  },
  {
    id: "relay_green",
    label: "Relay · Green holds",
    public_state: "Green team holds the relay",
    game_meta: { held_by_faction: "green" },
  },
  {
    id: "relay_yellow",
    label: "Relay · Yellow holds",
    public_state: "Yellow team holds the relay",
    game_meta: { held_by_faction: "yellow" },
  },
  {
    id: "relay_neutral",
    label: "Relay · Unclaimed",
    public_state: "Relay dormant — unclaimed",
    game_meta: { held_by_faction: "neutral", held_until: null },
  },
];

/**
 * @param {Record<string, unknown>} current
 * @param {Record<string, unknown>} patch
 */
export function mergeGameNodeDraft(current, patch) {
  const gameMeta = {
    ...(current.game_meta && typeof current.game_meta === "object"
      ? current.game_meta
      : {}),
    ...(patch.game_meta && typeof patch.game_meta === "object"
      ? patch.game_meta
      : {}),
  };
  return {
    ...current,
    ...patch,
    game_meta: gameMeta,
  };
}

/**
 * @param {string} raw
 */
export function parseUnlockedByInput(raw) {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * @param {Record<string, unknown>} draft
 */
export function buildGameNodeUnsignedPayload(draft) {
  const {
    object_id: objectId,
    parent_profile_id: parentProfileId,
    public_label: publicLabel,
    public_state: publicState,
    created_at: createdAt,
    season_id: seasonId,
    node_role: nodeRole,
    district,
    object_streams: objectStreams,
    game_meta: gameMeta,
  } = draft;

  if (!objectId || !parentProfileId || !createdAt) {
    throw new Error("object_id, parent_profile_id, and created_at are required.");
  }

  return {
    object_id: objectId,
    parent_profile_id: parentProfileId,
    object_type: GAME_NODE_OBJECT_TYPE,
    public_label: publicLabel,
    public_state: publicState,
    status: "active",
    season_id: seasonId,
    node_role: nodeRole,
    district: district ?? null,
    object_streams: objectStreams ?? [],
    game_meta: gameMeta ?? {},
    created_at: createdAt,
    updated_at: new Date().toISOString(),
  };
}
