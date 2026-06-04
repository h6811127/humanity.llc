import { buildGameNodeUnsignedPayload } from "./game-operator-core.mjs";
import { inferPilotTemplate } from "./manifesto-display.mjs";

export const CHILD_OBJECT_TYPE_GAME_NODE = "game_node";
export const CHILD_OBJECT_STATUS_DISABLED = "disabled";

/** Mirrors worker/src/city-game/constants.ts GAME_NODE_ROLES */
export const GAME_NODE_ROLE_OPTIONS = [
  { value: "relay_gate", label: "Relay gate" },
  { value: "temp_drop", label: "Temp drop / quorum" },
  { value: "sanctuary", label: "Sanctuary / regroup" },
  { value: "witness", label: "Witness / trust path" },
  { value: "lore_archive", label: "Lore archive" },
  { value: "route_splitter", label: "Route splitter" },
  { value: "finale", label: "Finale" },
  { value: "care_loop", label: "Care loop" },
  { value: "mobile_lore", label: "Mobile lore" },
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
 * @param {Record<string, unknown> | null | undefined} session
 */
function isGeneralRootCardSession(session) {
  const explicit = typeof session?.pilot_template === "string" ? session.pilot_template : "";
  const pilot =
    explicit ||
    (typeof session?.manifesto_line === "string"
      ? inferPilotTemplate(session.manifesto_line)
      : "general");
  return pilot === "general";
}

/**
 * Show when organizer registered a game-operator key on the season root card.
 * @param {Record<string, unknown> | null | undefined} session
 */
export function shouldOfferAddGameNode(session) {
  if (!isGeneralRootCardSession(session)) return false;
  const issuer =
    typeof session?.issuer_public_key === "string"
      ? session.issuer_public_key.trim()
      : typeof session?.organizer_public_key_b58 === "string"
        ? session.organizer_public_key_b58.trim()
        : "";
  return issuer.length > 0;
}

/**
 * General root without organizer key yet — show game setup row only.
 * @param {Record<string, unknown> | null | undefined} session
 */
export function shouldShowGameNodeAddRow(session) {
  return isGeneralRootCardSession(session) && !shouldOfferAddGameNode(session);
}

/**
 * @param {Record<string, unknown>} row
 */
export function isActiveGameNodeRow(row) {
  return (
    row.object_type === CHILD_OBJECT_TYPE_GAME_NODE &&
    row.status !== CHILD_OBJECT_STATUS_DISABLED
  );
}

/**
 * @param {unknown} seasonIdRaw
 */
export function parseGameNodeSeasonId(seasonIdRaw) {
  const seasonId = typeof seasonIdRaw === "string" ? seasonIdRaw.trim() : "";
  if (!seasonId || !/^[a-z][a-z0-9_-]{0,47}$/.test(seasonId)) {
    throw new Error("Season id is required (lowercase slug, e.g. my_city_season_01).");
  }
  return seasonId;
}

/**
 * @param {unknown} publicLabelRaw
 * @param {unknown} nodeRoleRaw
 * @param {unknown} districtRaw
 * @param {unknown} seasonIdRaw
 */
export function parseGameNodeChildFields(
  publicLabelRaw,
  nodeRoleRaw,
  districtRaw,
  seasonIdRaw
) {
  const publicLabel = typeof publicLabelRaw === "string" ? publicLabelRaw.trim() : "";
  const nodeRole = typeof nodeRoleRaw === "string" ? nodeRoleRaw.trim() : "";
  const district =
    typeof districtRaw === "string" && districtRaw.trim() ? districtRaw.trim() : null;
  const seasonId = parseGameNodeSeasonId(seasonIdRaw);

  if (!publicLabel) {
    throw new Error("Place name is required.");
  }
  if (publicLabel.length > 120) {
    throw new Error("Place name must be 120 characters or fewer.");
  }
  if (!GAME_NODE_ROLE_OPTIONS.some((opt) => opt.value === nodeRole)) {
    throw new Error("Choose a node role.");
  }
  if (district && !/^[a-z][a-z0-9_]{0,39}$/.test(district)) {
    throw new Error("District must be a lowercase slug or left blank.");
  }

  return { publicLabel, nodeRole, district, seasonId };
}

/**
 * @param {string} nodeRole
 */
function defaultGameMetaForRole(nodeRole) {
  if (nodeRole === "temp_drop") {
    return { ...EMPTY_GAME_META, collective_target: 20, collective_progress: 0 };
  }
  if (nodeRole === "witness") {
    return { ...EMPTY_GAME_META, scarcity_remaining: 25 };
  }
  return { ...EMPTY_GAME_META };
}

function defaultGameNodeObjectId() {
  return `obj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * @param {{
 *   profileId: string;
 *   seasonId: string;
 *   publicLabel: string;
 *   nodeRole: string;
 *   district: string | null;
 *   objectId?: string;
 *   templateRow?: {
 *     object_id: string;
 *     role: string;
 *     district: string | null;
 *     label: string;
 *     public_state: string;
 *     object_streams: unknown[];
 *     game_meta: Record<string, unknown>;
 *   };
 * }} input
 */
export function buildGameNodeRegisterUnsigned(input) {
  if (input.templateRow) {
    const row = input.templateRow;
    return buildGameNodeUnsignedPayload({
      object_id: row.object_id,
      parent_profile_id: input.profileId,
      public_label: input.publicLabel || row.label,
      public_state: row.public_state,
      created_at: new Date().toISOString(),
      season_id: input.seasonId,
      node_role: row.role,
      district: row.district,
      object_streams: row.object_streams,
      game_meta: row.game_meta,
    });
  }

  const objectId = input.objectId?.trim() || defaultGameNodeObjectId();
  const publicState = ROLE_PUBLIC_STATE[input.nodeRole] ?? ROLE_PUBLIC_STATE.relay_gate;
  return buildGameNodeUnsignedPayload({
    object_id: objectId,
    parent_profile_id: input.profileId,
    public_label: input.publicLabel,
    public_state: publicState,
    created_at: new Date().toISOString(),
    season_id: input.seasonId,
    node_role: input.nodeRole,
    district: input.district,
    object_streams: BASE_STREAMS.map((stream) => ({ ...stream })),
    game_meta: defaultGameMetaForRole(input.nodeRole),
  });
}

/**
 * @param {Array<{ object_type?: string; status?: string }>} rows
 */
export function nextSelfServeNodeId(rows) {
  const count = rows.filter(isActiveGameNodeRow).length;
  return `node_${String(count + 1).padStart(2, "0")}`;
}

/**
 * @param {string} jsonUrl
 * @returns {Promise<{ districts: string[]; nodes: Array<{ node_id: string; label: string; role: string; district: string; object_id: string }> } | null>}
 */
export async function fetchSeasonConfigHints(jsonUrl) {
  if (!jsonUrl) return null;
  try {
    const res = await fetch(jsonUrl, { credentials: "omit" });
    if (!res.ok) return null;
    const body = await res.json();
    const districts = Array.isArray(body.districts)
      ? body.districts.filter((d) => typeof d === "string" && d.trim())
      : [];
    const nodes = Array.isArray(body.nodes)
      ? body.nodes
          .filter((n) => n && typeof n === "object")
          .map((n) => ({
            node_id: String(n.node_id ?? ""),
            label: String(n.label ?? ""),
            role: String(n.role ?? ""),
            district: String(n.district ?? ""),
            object_id: String(n.object_id ?? ""),
          }))
          .filter((n) => n.node_id)
      : [];
    return { districts, nodes };
  } catch {
    return null;
  }
}
