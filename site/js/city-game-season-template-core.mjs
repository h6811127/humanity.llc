/**
 * S1 starter registry + season JSON template rows (Phase E bulk import).
 * Browser-safe — mirrors worker/scripts/city-game-node-defaults.mjs shape.
 */

/** Generic 15-node S1 footprint — editable labels before register. */
export const STARTER_S1_NODE_TEMPLATE = [
  { node_id: "node_01", role: "relay_gate", district: "district_a", label: "Relay gate · district A" },
  { node_id: "node_02", role: "sanctuary", district: "district_a", label: "Sanctuary · regroup zone" },
  { node_id: "node_03", role: "lore_archive", district: "district_a", label: "Lore archive · chapter 1" },
  { node_id: "node_04", role: "temp_drop", district: "district_b", label: "Quorum drop · collective unlock" },
  { node_id: "node_05", role: "relay_gate", district: "district_b", label: "Relay gate · district B" },
  { node_id: "node_06", role: "route_splitter", district: "district_c", label: "Route splitter · choose a path" },
  { node_id: "node_07", role: "lore_archive", district: "district_d", label: "Private cabinet · trust path" },
  { node_id: "node_08", role: "relay_gate", district: "district_d", label: "Relay gate · district D" },
  { node_id: "node_09", role: "lore_archive", district: "district_d", label: "Fragment node · mural or marker" },
  { node_id: "node_10", role: "witness", district: "district_c", label: "Witness seal · library or institution" },
  { node_id: "node_11", role: "route_splitter", district: "district_e", label: "Fragment node · second district" },
  { node_id: "node_12", role: "sanctuary", district: "district_e", label: "Sanctuary · treaty bench" },
  { node_id: "node_13", role: "finale", district: "district_c", label: "Finale arch · lattice switch" },
  { node_id: "node_14", role: "care_loop", district: "district_b", label: "Care loop · fountain or rain garden" },
  { node_id: "node_15", role: "relay_gate", district: "district_c", label: "Relay gate · market or steps" },
];

const ROLE_PUBLIC_STATE = {
  relay_gate: "Unclaimed — relay dormant until operators open the window",
  temp_drop: "Temp object dormant — window not open",
  sanctuary: "Treaty zone — no capture, regroup and share rumors",
  witness: "Witness seal dormant — passes not yet issued",
  lore_archive: "Chapter dormant — lore unlocks with the season",
  route_splitter: "Route splitter dormant — choose a path after season open",
  finale: "Finale switch dormant — requires district fragments",
  care_loop: "Discovery node — notice the place state",
  mobile_lore: "Mobile lore node — courier status",
};

const BASE_STREAMS = [
  { id: "territory", class: "place", label: "Place", value: "Dormant" },
  { id: "relay", class: "route", label: "Route", value: "Closed" },
  { id: "bulletin", class: "narrative", label: "Bulletin", value: "Awaiting season open" },
  { id: "care", class: "care", label: "Site", value: "Clear" },
];

const EMPTY_GAME_META = {
  visible_until: null,
  compromised: false,
  collective_progress: null,
  collective_target: null,
  unlocked_by: [],
  vouch_requires: [],
  vouch_active_for: [],
  scarcity_remaining: null,
  fragment_id: null,
};

/**
 * @param {string} seasonId
 * @param {string} nodeId
 */
export function defaultObjectIdForSeasonNode(seasonId, nodeId) {
  const slug = String(seasonId ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  const base = slug || "season";
  return `obj_${base}_${nodeId}`;
}

/**
 * @param {string} nodeId
 */
function nodeSortKey(nodeId) {
  const match = String(nodeId).match(/^node_(\d+)$/);
  return match ? Number(match[1]) : 999;
}

/**
 * @param {{ node_id?: string; role?: string; district?: string; label?: string; object_id?: string }} row
 * @param {string} seasonId
 */
export function enrichTemplateRow(row, seasonId) {
  const nodeId = String(row.node_id ?? "").trim();
  const role = String(row.role ?? "relay_gate").trim();
  const district = String(row.district ?? "").trim() || null;
  const label = String(row.label ?? nodeId).trim() || nodeId;
  const objectId =
    String(row.object_id ?? "").trim() || defaultObjectIdForSeasonNode(seasonId, nodeId);
  const gameMeta =
    role === "temp_drop"
      ? { ...EMPTY_GAME_META, collective_target: 20, collective_progress: 0 }
      : role === "witness"
        ? { ...EMPTY_GAME_META, scarcity_remaining: 25 }
        : role === "finale"
          ? { ...EMPTY_GAME_META, unlocked_by: [] }
          : { ...EMPTY_GAME_META };

  return {
    node_id: nodeId,
    role,
    district,
    label,
    object_id: objectId,
    public_state: ROLE_PUBLIC_STATE[role] ?? ROLE_PUBLIC_STATE.relay_gate,
    object_streams: BASE_STREAMS.map((stream) => ({ ...stream })),
    game_meta: gameMeta,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} seasonBody
 * @param {string} seasonId
 * @returns {ReturnType<typeof enrichTemplateRow>[]}
 */
export function resolveSeasonTemplateRows(seasonBody, seasonId) {
  const fromJson = Array.isArray(seasonBody?.nodes)
    ? seasonBody.nodes
        .filter((n) => n && typeof n === "object" && n.node_id)
        .map((n) =>
          enrichTemplateRow(
            {
              node_id: String(n.node_id),
              role: String(n.role ?? "relay_gate"),
              district: String(n.district ?? ""),
              label: String(n.label ?? n.node_id),
              object_id: String(n.object_id ?? ""),
            },
            seasonId
          )
        )
        .sort((a, b) => nodeSortKey(a.node_id) - nodeSortKey(b.node_id))
    : [];

  if (fromJson.length) return fromJson;

  return STARTER_S1_NODE_TEMPLATE.map((row) => enrichTemplateRow(row, seasonId));
}

/**
 * @param {ReturnType<typeof enrichTemplateRow>[]} templateRows
 * @param {Array<{ object_id?: string; object_type?: string; status?: string }>} registeredRows
 */
export function annotateTemplateRegistrationState(templateRows, registeredRows) {
  const registeredIds = new Set(
    registeredRows
      .filter((row) => row.object_type === "game_node" && row.status !== "disabled")
      .map((row) => String(row.object_id ?? "").trim())
      .filter(Boolean)
  );

  return templateRows.map((row) => ({
    ...row,
    registered: registeredIds.has(row.object_id),
  }));
}

/**
 * @param {Array<{ node_id: string; label: string; registered?: boolean; selected?: boolean }>} rows
 */
export function pendingBulkTemplateRows(rows) {
  return rows.filter((row) => !row.registered && row.selected !== false);
}

/**
 * @param {unknown} label
 * @param {string} nodeId
 */
export function parseBulkTemplateLabel(label, nodeId) {
  const trimmed = typeof label === "string" ? label.trim() : "";
  if (!trimmed) {
    throw new Error(`Place name required for ${nodeId}.`);
  }
  if (trimmed.length > 120) {
    throw new Error(`Place name for ${nodeId} must be 120 characters or fewer.`);
  }
  return trimmed;
}

/**
 * @param {number} done
 * @param {number} total
 */
export function bulkRegisterProgressLabel(done, total) {
  return `Registering nodes… ${done} / ${total}`;
}
