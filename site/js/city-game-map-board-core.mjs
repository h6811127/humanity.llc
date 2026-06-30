/**
 * Cedar Rapids city game — M1 static city state board (read-only).
 * @see docs/CITY_GAME_MAP_DASHBOARD.md · M4 interaction in city-game-map-interaction.mjs
 */

import { buildBoardFilterSummaryHtml } from "./city-game-map-filter-summary-core.mjs";
import { buildStateFilterHtml, deriveNodeBoardStates } from "./city-game-map-state-filter-core.mjs";
import {
  buildMapSelectionBarHtml,
  buildDistrictFilterHtml,
  isDenseMapBoard,
} from "./city-game-map-interaction-core.mjs";
import {
  buildMapNodeCardSlotsHtml,
  buildNodeCardCopy,
} from "./city-game-map-node-card-core.mjs";
import { resolveBoardContextView } from "./city-game-board-context-core.mjs";
import {
  isNetworkLensSpineNode,
  networkLensNextNodeId,
  resolveNetworkLens,
  resolveNetworkLensCopy,
} from "./city-game-network-lens-core.mjs";
import { buildTypeFilterHtml } from "./city-game-map-type-filter-core.mjs";
import {
  buildMapNetworkLegendHtml,
} from "./city-game-reference-network-core.mjs";
import {
  renderDiscoveryMapCrosslinkStrip,
  renderDiscoveryPinBookmarkLink,
} from "./discovery-map-crosslink-core.mjs";

/** Default row hint before snapshot chips replace the live cell. */
export const MAP_ROW_SCAN_HINT = "Scan sticker";

/** @deprecated Role hunt verbs — kept for reference; primary row CTA is always scan-focused. */
export const ROW_ROLE_CTA = {
  relay_gate: "Find this relay",
  lore_archive: "Open clue",
  witness: "Check witness",
  sanctuary: "Visit sanctuary",
  care_loop: "Check care state",
  temp_drop: "Find this drop",
  route_splitter: "Choose route",
  finale: "Reach finale",
  mobile_lore: "Open story",
};

/** Short role labels for place rows (district · role line). */
export const ROW_ROLE_SHORT = {
  relay_gate: "Relay",
  lore_archive: "Lore",
  sanctuary: "Sanctuary",
  temp_drop: "Temp drop",
  witness: "Witness",
  route_splitter: "Route",
  finale: "Finale",
  care_loop: "Care loop",
  mobile_lore: "Story",
};

/** Pre-snapshot status hints — shared world state, not personal progress. */
export const ROW_ROLE_STATUS_HINT = {
  relay_gate: "Unclaimed",
  lore_archive: "Sealed",
  sanctuary: "Open",
  temp_drop: "Awaiting signal",
  witness: "Sunset window",
  route_splitter: "Route choice",
  finale: "Dormant",
  care_loop: "Care unknown",
  mobile_lore: "Rumor only",
};

export const CITY_GAME_SEASON_JSON_URL = "/data/city-game-cr-season-01.json";
/** Multi-city index — prefer resolvePlayPageSeason() on play pages. */
export const CITY_GAME_SEASONS_INDEX_URL = "/data/city-game-seasons-index.json";

export const CITY_GAME_DISTRICT_LABELS = {
  newbo: "NewBo",
  czech_village: "Czech Village",
  greene_square: "Greene Square",
  river_spine: "River spine",
  downtown: "Downtown",
};

export const CITY_GAME_ROLE_LABELS = {
  relay_gate: "Relay spot",
  lore_archive: "Story archive",
  sanctuary: "Regroup spot",
  temp_drop: "Clue drop",
  witness: "Sunset spot",
  route_splitter: "Route choice",
  finale: "Finale",
  care_loop: "Care spot",
  mobile_lore: "Moving story",
};

const DEFAULT_START_HERE = {
  title: "Start here",
  steps: ["Find a live sticker", "Scan it", "See what changed"],
};

const DEFAULT_MAP_COPY = {
  title: "Wake the city",
  subtitle: "Public weekend board · read-only",
  board_intro:
    "Live status for Cedar Rapids game stickers — the same view for everyone. Walk up, scan a sticker, see what changed.",
  hero_objective: "The city is asleep. Find shared clues before the weekend ends.",
  hook: "The city is asleep.",
  hook_stirring: "Something is stirring.",
  hook_awake: "The city woke.",
  progress_suffix: "shared clues found",
  code_hint: "Each sticker can show a different live status or action when you scan.",
  row_scan_hint: MAP_ROW_SCAN_HINT,
  row_scan_cta: "Scan sticker",
  row_scan_cta_live: "Scan sticker",
  spotlight_scan_hint: "Find the River Lantern",
  spotlight_kicker: "Help wake the city.",
  spotlight_lead: "Find the River Lantern and add one signal.",
  count_placeholder: "Live count opens when play starts.",
  browse_summary: "All places",
  start_here_title: "Start here",
  start_here_why: "Any sticker works — the map marks a suggested first stop.",
  live_hint: "Find stickers. Scan them. Help unlock shared goals.",
  wayfinding_intro:
    "The bold route marks a suggested first stop — any game sticker still works. Planning from home? Search place names in your maps app; the sketch is districts only, not streets.",
  diagram_note: "District sketch — not a street map.",
  sketch_caption: "Tap a pin for live status · bold lines = suggested route",
  privacy_note: "No account. No GPS. No visit log.",
  world_status_default: "Open team spots · Finale waiting",
  unlock_intro:
    "Lines on the map light up when enough people scan — progress is shared, not personal.",
  section_state_title: "Live headlines",
  section_places_title: "Places",
  section_goals_title: "Shared goals",
  advanced_summary: "Routes and connections",
  sketch_summary: "District sketch",
  finale_wake_title: "Wake the city",
  fog_title: "Hidden on the sketch",
  fog_lead_signal_war: "Some pins stay hidden until a team claims that spot.",
  fog_lead_rumor_only: "The sketch shows rumored spots only — scan to find the rest.",
  roles_summary: "Place types",
  section_live_state_title: "City status",
  city_status_lead: "Updates when anyone scans — same view for every visitor.",
  city_status_lead_active: "Shared progress is moving — scan a sticker for ground truth.",
  city_status_lead_complete: "Weekend network is live — scan any sticker to confirm.",
  lore_summary: "Weekend quest",
  wake_loop_title: "What scanning changes",
  wake_loop_lines: [
    "Scans add signals toward shared clues — this board updates for everyone.",
    "Team spots change hands; unclaimed spots stay hidden on the sketch.",
    "Connected routes open when enough people scan — not from a private checklist.",
    "Come back to see what moved: status chips refresh as the city plays.",
  ],
  section_activity_title: "Recent updates",
  routes_preview_title: "How places connect",
  routes_strip_title: "Connected routes",
  routes_strip_intro: "Tap a route to focus the place on the map.",
  routes_strip_more_label: "All routes and connections",
  route_state_open: "Open",
  route_state_locked: "Locked",
  filters_summary: "Filter places",
  drawer_summary: "Routes and connections",
  legend_title: "Key route stops",
  legend_intro: "Main stops on the suggested route — scan any sticker for live status.",
  how_scan_summary: "How scanning works",
  primary_action_label: "Scan a sticker · Start here",
  contest_overlay_public: "",
};

/** Cooperative roles always visible under Signal War fog (matches worker map-fog-filter). */
export const COOPERATIVE_BOARD_ROLES = new Set([
  "sanctuary",
  "finale",
  "lore_archive",
  "witness",
  "temp_drop",
  "care_loop",
  "route_splitter",
  "mobile_lore",
]);

/**
 * @param {Record<string, unknown>} season
 * @returns {"public" | "signal_war" | "rumor_only"}
 */
export function seasonMapVisibility(season) {
  const signalWar =
    season?.signal_war && typeof season.signal_war === "object"
      ? /** @type {{ map_visibility?: string }} */ (season.signal_war)
      : null;
  const mode = signalWar?.map_visibility?.trim();
  if (mode === "signal_war" || mode === "rumor_only" || mode === "public") {
    return mode;
  }
  return "public";
}

/**
 * @param {Record<string, unknown>} season
 * @returns {Set<string>}
 */
export function seasonRumoredNodeIds(season) {
  const signalWar =
    season?.signal_war && typeof season.signal_war === "object"
      ? /** @type {{ rumored_node_ids?: string[] }} */ (season.signal_war)
      : null;
  const ids = Array.isArray(signalWar?.rumored_node_ids) ? signalWar.rumored_node_ids : [];
  return new Set(ids.map((id) => String(id ?? "").trim()).filter(Boolean));
}

/**
 * @param {Record<string, unknown>} season
 * @param {{ node_id?: string; role?: string }} row
 * @returns {"public" | "clue" | "omitted"}
 */
export function nodeRowStaticVisibility(season, row) {
  const mode = seasonMapVisibility(season);
  const nodeId = String(row?.node_id ?? "").trim();
  const role = String(row?.role ?? "").trim();
  if (!nodeId || !role) return "public";
  if (mode === "public") return "public";
  if (COOPERATIVE_BOARD_ROLES.has(role)) return "public";
  if (role === "relay_gate") {
    return seasonRumoredNodeIds(season).has(nodeId) ? "clue" : "omitted";
  }
  if (mode === "rumor_only") {
    return seasonRumoredNodeIds(season).has(nodeId) ? "clue" : "omitted";
  }
  return "omitted";
}

/**
 * @param {string} nodeId
 * @param {Record<string, unknown>} season
 */
export function resolveNodeFogClue(nodeId, season) {
  const row = nodeRows(season).find((n) => n?.node_id === nodeId);
  const district = String(row?.district ?? "").trim();
  const districtLabel = CITY_GAME_DISTRICT_LABELS[district] ?? district.replace(/_/g, " ");
  const label = String(row?.label ?? "").trim();

  const schedule = season.bulletin_schedule;
  const entries = Array.isArray(schedule?.entries) ? schedule.entries : [];
  const entry = entries.find((e) => e?.node_id === nodeId);
  const slots = Array.isArray(entry?.slots) ? entry.slots : [];
  const bulletin =
    typeof slots[0]?.bulletin === "string" && slots[0].bulletin.trim()
      ? slots[0].bulletin.trim()
      : "";
  if (bulletin) {
    return {
      title: districtLabel ? `Relay whisper · ${districtLabel}` : "Relay whisper",
      body: bulletin,
    };
  }

  const blurbs =
    season.comprehension_kit &&
    typeof season.comprehension_kit === "object" &&
    season.comprehension_kit.blurbs &&
    typeof season.comprehension_kit.blurbs === "object"
      ? /** @type {Record<string, string>} */ (season.comprehension_kit.blurbs)
      : {};
  const blurb = typeof blurbs[nodeId] === "string" ? blurbs[nodeId].trim() : "";
  if (blurb) {
    return {
      title: label ? `Rumored spot · ${abbreviatePinLabel(label) || label}` : "Rumored spot",
      body: blurb.replace(/^GT-\d+\s*[—–-]\s*/i, ""),
    };
  }

  if (label) {
    return {
      title: districtLabel ? `Rumored relay · ${districtLabel}` : "Rumored relay",
      body: `Near ${label} — first faction hold reveals it for everyone.`,
    };
  }

  return {
    title: "Hidden relay",
    body: "Unclaimed until a team holds the network here.",
  };
}

/**
 * @param {unknown} season
 * @returns {string[]}
 */
export function validateMapLayout(season) {
  const issues = [];
  if (!season || typeof season !== "object") {
    return ["Season config must be an object."];
  }

  const layout = /** @type {{ version?: number; nodes?: Record<string, { x?: number; y?: number }> }} */ (
    season.map_layout
  );
  if (!layout || typeof layout !== "object") {
    return ["map_layout block required."];
  }
  if (layout.version !== 1) {
    issues.push('map_layout.version must be 1.');
  }
  const positions = layout.nodes;
  if (!positions || typeof positions !== "object") {
    return ["map_layout.nodes required."];
  }

  const nodeIds = new Set(
    (Array.isArray(season.nodes) ? season.nodes : []).map((row) => row?.node_id).filter(Boolean)
  );

  for (const nodeId of nodeIds) {
    const pos = positions[nodeId];
    if (!pos || typeof pos !== "object") {
      issues.push(`map_layout.nodes missing ${nodeId}.`);
      continue;
    }
    if (typeof pos.x !== "number" || pos.x < 0 || pos.x > 1) {
      issues.push(`${nodeId}: map_layout x must be a number in [0, 1].`);
    }
    if (typeof pos.y !== "number" || pos.y < 0 || pos.y > 1) {
      issues.push(`${nodeId}: map_layout y must be a number in [0, 1].`);
    }
  }

  for (const nodeId of Object.keys(positions)) {
    if (!nodeIds.has(nodeId)) {
      issues.push(`map_layout.nodes has unknown node_id: ${nodeId}.`);
    }
  }

  return issues;
}

/**
 * @param {string} value
 */
export function escapeMapHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {Record<string, unknown>} season
 */
export function resolveLaunchCopy(season) {
  const mapCopy =
    season.map_copy && typeof season.map_copy === "object"
      ? /** @type {Record<string, unknown>} */ (season.map_copy)
      : {};
  const launch =
    mapCopy.launch && typeof mapCopy.launch === "object"
      ? /** @type {Record<string, unknown>} */ (mapCopy.launch)
      : {};
  const startHere =
    mapCopy.start_here && typeof mapCopy.start_here === "object"
      ? /** @type {Record<string, unknown>} */ (mapCopy.start_here)
      : {};
  const mapResolved = resolveMapCopy(season);

  const rawSteps = Array.isArray(launch.hero_steps)
    ? launch.hero_steps
    : Array.isArray(startHere.steps)
      ? startHere.steps
      : DEFAULT_START_HERE.steps;
  const heroSteps = rawSteps.map((step) => String(step ?? "").trim()).filter(Boolean);
  const steps = heroSteps.length ? heroSteps : [...DEFAULT_START_HERE.steps];

  return {
    hero_steps: steps,
    hero_aria_label:
      (typeof launch.hero_aria_label === "string" && launch.hero_aria_label.trim()) ||
      DEFAULT_START_HERE.title,
    code_hint: (typeof launch.code_hint === "string" && launch.code_hint.trim()) || mapResolved.code_hint,
    spotlight_kicker:
      (typeof launch.spotlight_kicker === "string" && launch.spotlight_kicker.trim()) ||
      mapResolved.spotlight_kicker,
    spotlight_lead:
      (typeof launch.spotlight_lead === "string" && launch.spotlight_lead.trim()) ||
      (typeof launch.lantern_line === "string" && launch.lantern_line.trim()) ||
      mapResolved.spotlight_lead,
    privacy_note:
      (typeof launch.privacy_note === "string" && launch.privacy_note.trim()) || mapResolved.privacy_note,
    count_placeholder:
      (typeof launch.count_placeholder === "string" && launch.count_placeholder.trim()) ||
      mapResolved.count_placeholder,
    spotlight_scan_hint:
      (typeof launch.spotlight_scan_hint === "string" && launch.spotlight_scan_hint.trim()) ||
      mapResolved.spotlight_scan_hint,
    row_scan_hint:
      (typeof launch.row_scan_hint === "string" && launch.row_scan_hint.trim()) || mapResolved.row_scan_hint,
    browse_summary:
      (typeof launch.browse_summary === "string" && launch.browse_summary.trim()) ||
      mapResolved.browse_summary,
    start_here_title:
      (typeof launch.start_here_title === "string" && launch.start_here_title.trim()) ||
      mapResolved.start_here_title,
    start_here_why:
      (typeof launch.start_here_why === "string" && launch.start_here_why.trim()) ||
      mapResolved.start_here_why,
    what_changed_summary:
      (typeof launch.what_changed_summary === "string" && launch.what_changed_summary.trim()) ||
      "What changed",
  };
}

/**
 * @param {Record<string, unknown>} season
 */
export function resolveMapCopy(season) {
  const copy = season.map_copy;
  if (!copy || typeof copy !== "object") {
    return { ...DEFAULT_MAP_COPY };
  }
  const c = /** @type {Record<string, string>} */ (copy);
  return {
    title: c.title?.trim() || DEFAULT_MAP_COPY.title,
    subtitle: c.subtitle?.trim() || DEFAULT_MAP_COPY.subtitle,
    hero_objective: c.hero_objective?.trim() || DEFAULT_MAP_COPY.hero_objective,
    hook: c.hook?.trim() || DEFAULT_MAP_COPY.hook,
    hook_stirring: c.hook_stirring?.trim() || DEFAULT_MAP_COPY.hook_stirring,
    hook_awake: c.hook_awake?.trim() || DEFAULT_MAP_COPY.hook_awake,
    progress_suffix: c.progress_suffix?.trim() || DEFAULT_MAP_COPY.progress_suffix,
    code_hint: c.code_hint?.trim() || DEFAULT_MAP_COPY.code_hint,
    row_scan_hint: c.row_scan_hint?.trim() || DEFAULT_MAP_COPY.row_scan_hint,
    row_scan_cta: c.row_scan_cta?.trim() || DEFAULT_MAP_COPY.row_scan_cta,
    row_scan_cta_live: c.row_scan_cta_live?.trim() || DEFAULT_MAP_COPY.row_scan_cta_live,
    spotlight_scan_hint: c.spotlight_scan_hint?.trim() || DEFAULT_MAP_COPY.spotlight_scan_hint,
    spotlight_kicker: c.spotlight_kicker?.trim() || DEFAULT_MAP_COPY.spotlight_kicker,
    spotlight_lead: c.spotlight_lead?.trim() || DEFAULT_MAP_COPY.spotlight_lead,
    count_placeholder: c.count_placeholder?.trim() || DEFAULT_MAP_COPY.count_placeholder,
    world_status_default: c.world_status_default?.trim() || DEFAULT_MAP_COPY.world_status_default,
    browse_summary: c.browse_summary?.trim() || DEFAULT_MAP_COPY.browse_summary,
    start_here_title: c.start_here_title?.trim() || DEFAULT_MAP_COPY.start_here_title,
    start_here_why: c.start_here_why?.trim() || DEFAULT_MAP_COPY.start_here_why,
    live_hint: c.live_hint?.trim() || DEFAULT_MAP_COPY.live_hint,
    wayfinding_intro: c.wayfinding_intro?.trim() || DEFAULT_MAP_COPY.wayfinding_intro,
    diagram_note: c.diagram_note?.trim() || DEFAULT_MAP_COPY.diagram_note,
    privacy_note: c.privacy_note?.trim() || DEFAULT_MAP_COPY.privacy_note,
    unlock_intro: c.unlock_intro?.trim() || DEFAULT_MAP_COPY.unlock_intro,
    section_state_title: c.section_state_title?.trim() || DEFAULT_MAP_COPY.section_state_title,
    section_places_title: c.section_places_title?.trim() || DEFAULT_MAP_COPY.section_places_title,
    section_goals_title: c.section_goals_title?.trim() || DEFAULT_MAP_COPY.section_goals_title,
    advanced_summary: c.advanced_summary?.trim() || DEFAULT_MAP_COPY.advanced_summary,
    sketch_summary: c.sketch_summary?.trim() || DEFAULT_MAP_COPY.sketch_summary,
    finale_wake_title: c.finale_wake_title?.trim() || DEFAULT_MAP_COPY.finale_wake_title,
    fog_title: c.fog_title?.trim() || DEFAULT_MAP_COPY.fog_title,
    fog_lead_signal_war: c.fog_lead_signal_war?.trim() || DEFAULT_MAP_COPY.fog_lead_signal_war,
    fog_lead_rumor_only: c.fog_lead_rumor_only?.trim() || DEFAULT_MAP_COPY.fog_lead_rumor_only,
    roles_summary: c.roles_summary?.trim() || DEFAULT_MAP_COPY.roles_summary,
    section_live_state_title:
      c.section_live_state_title?.trim() || DEFAULT_MAP_COPY.section_live_state_title,
    city_status_lead: c.city_status_lead?.trim() || DEFAULT_MAP_COPY.city_status_lead,
    city_status_lead_active:
      c.city_status_lead_active?.trim() || DEFAULT_MAP_COPY.city_status_lead_active,
    city_status_lead_complete:
      c.city_status_lead_complete?.trim() || DEFAULT_MAP_COPY.city_status_lead_complete,
    lore_summary: c.lore_summary?.trim() || DEFAULT_MAP_COPY.lore_summary,
    primary_action_label: c.primary_action_label?.trim() || DEFAULT_MAP_COPY.primary_action_label,
    wake_loop_title: c.wake_loop_title?.trim() || DEFAULT_MAP_COPY.wake_loop_title,
    wake_loop_lines: Array.isArray(c.wake_loop_lines)
      ? c.wake_loop_lines.map((line) => String(line ?? "").trim()).filter(Boolean)
      : [...DEFAULT_MAP_COPY.wake_loop_lines],
    section_activity_title:
      c.section_activity_title?.trim() || DEFAULT_MAP_COPY.section_activity_title,
    routes_preview_title: c.routes_preview_title?.trim() || DEFAULT_MAP_COPY.routes_preview_title,
    routes_strip_title: c.routes_strip_title?.trim() || DEFAULT_MAP_COPY.routes_strip_title,
    routes_strip_intro: c.routes_strip_intro?.trim() || DEFAULT_MAP_COPY.routes_strip_intro,
    routes_strip_more_label:
      c.routes_strip_more_label?.trim() || DEFAULT_MAP_COPY.routes_strip_more_label,
    route_state_open: c.route_state_open?.trim() || DEFAULT_MAP_COPY.route_state_open,
    route_state_locked: c.route_state_locked?.trim() || DEFAULT_MAP_COPY.route_state_locked,
    filters_summary: c.filters_summary?.trim() || DEFAULT_MAP_COPY.filters_summary,
    board_intro: c.board_intro?.trim() || DEFAULT_MAP_COPY.board_intro,
    sketch_caption: c.sketch_caption?.trim() || DEFAULT_MAP_COPY.sketch_caption,
    how_scan_summary: c.how_scan_summary?.trim() || DEFAULT_MAP_COPY.how_scan_summary,
  };
}

/**
 * @param {{ fragments?: { claimed?: number; required?: number; complete?: boolean } } | null | undefined} finale
 * @param {{ progress_suffix?: string }} [copy]
 * @param {Record<string, unknown>} [season]
 */
export function formatProgressLine(finale, copy = {}, season = {}) {
  const suffix = copy.progress_suffix?.trim() || DEFAULT_MAP_COPY.progress_suffix;
  const required =
    finale?.fragments?.required ?? season.automation?.fragment_nodes?.length ?? 3;
  const claimed = finale?.fragments?.claimed ?? 0;
  if (finale?.fragments?.complete) return `All ${required} ${suffix}`;
  return `${claimed} / ${required} ${suffix}`;
}

export function formatFragmentConsequence(finale, season = {}) {
  const required = finale?.fragments?.required ?? season.automation?.fragment_nodes?.length ?? 3;
  const claimed = finale?.fragments?.claimed ?? 0;
  const finaleId = String(season.automation?.finale_node ?? "node_13").trim();
  const finaleRow = nodeRows(season).find((row) => row.node_id === finaleId);
  const finaleLabel = String(finaleRow?.label ?? "Downtown alley arch").trim();
  const finaleShort = abbreviatePinLabel(finaleLabel) || finaleLabel;
  if (finale?.fragments?.complete) return `${finaleShort} is live — the city woke together.`;
  const remaining = Math.max(required - claimed, 0);
  if (claimed === 0) return `Recover ${required} shared fragments → ${finaleShort} wakes for everyone.`;
  if (remaining === 1) return `One more shared fragment → ${finaleShort} opens.`;
  return `${remaining} more shared fragments → ${finaleShort} opens.`;
}

export function orderUnlockEdgesForPreview(season) {
  const edges = Array.isArray(season.unlock_edges) ? [...season.unlock_edges] : [];
  const primary = networkLensNextNodeId(season);
  return edges.sort((a, b) => {
    if (a?.from === primary) return -1;
    if (b?.from === primary) return 1;
    const finaleId = String(season.automation?.finale_node ?? "").trim();
    if (a?.to === finaleId && b?.to !== finaleId) return 1;
    if (b?.to === finaleId && a?.to !== finaleId) return -1;
    return 0;
  });
}

/**
 * @param {{ fragments?: { claimed?: number; complete?: boolean } } | null | undefined} finale
 * @param {{ hook?: string; hook_stirring?: string; hook_awake?: string }} [copy]
 */
export function formatHookLine(finale, copy = {}) {
  const asleep = copy.hook?.trim() || DEFAULT_MAP_COPY.hook;
  const stirring = copy.hook_stirring?.trim() || DEFAULT_MAP_COPY.hook_stirring;
  const awake = copy.hook_awake?.trim() || DEFAULT_MAP_COPY.hook_awake;
  const claimed = finale?.fragments?.claimed ?? 0;
  if (finale?.fragments?.complete) return awake;
  if (claimed > 0) return stirring;
  return asleep;
}

/**
 * Network-utility lead for City status plate (not quest lore).
 * @param {{ fragments?: { claimed?: number; complete?: boolean } } | null | undefined} finale
 * @param {{ city_status_lead?: string; city_status_lead_active?: string; city_status_lead_complete?: string }} [copy]
 */
export function formatCityStatusLeadLine(finale, copy = {}) {
  const cold = copy.city_status_lead?.trim() || DEFAULT_MAP_COPY.city_status_lead;
  const active =
    copy.city_status_lead_active?.trim() || DEFAULT_MAP_COPY.city_status_lead_active;
  const complete =
    copy.city_status_lead_complete?.trim() || DEFAULT_MAP_COPY.city_status_lead_complete;
  const claimed = finale?.fragments?.claimed ?? 0;
  if (finale?.fragments?.complete) return complete;
  if (claimed > 0) return active;
  return cold;
}

/**
 * @param {string | null | undefined} role
 * @param {Record<string, unknown>} [season]
 */
export function resolveRoleShortLabel(role, season = {}) {
  const roleId = String(role ?? "").trim();
  if (!roleId) return "";
  const mapBoard = season.map_board;
  const exploreTypes =
    mapBoard &&
    typeof mapBoard === "object" &&
    mapBoard.explore_by &&
    typeof mapBoard.explore_by === "object" &&
    mapBoard.explore_by.types &&
    typeof mapBoard.explore_by.types === "object"
      ? /** @type {Record<string, { label?: string }>} */ (mapBoard.explore_by.types)
      : {};
  const configured = exploreTypes[roleId]?.label?.trim();
  if (configured) return configured;
  return ROW_ROLE_SHORT[roleId] ?? CITY_GAME_ROLE_LABELS[roleId] ?? roleId.replace(/_/g, " ");
}

/**
 * Primary place-row CTA — one scan action; role verbs live in card details only.
 * @param {string | null | undefined} _role
 * @param {ReturnType<typeof resolveLaunchCopy>} [launchCopy]
 * @param {{ hasScanUrl?: boolean }} [options]
 */
export function resolveRowScanCta(_role, launchCopy, options = {}) {
  if (options.hasScanUrl) {
    return (
      launchCopy?.row_scan_cta_live?.trim() ||
      DEFAULT_MAP_COPY.row_scan_cta_live ||
      MAP_ROW_SCAN_HINT
    );
  }
  return (
    launchCopy?.row_scan_hint?.trim() ||
    launchCopy?.row_scan_cta?.trim() ||
    DEFAULT_MAP_COPY.row_scan_cta ||
    MAP_ROW_SCAN_HINT
  );
}

/**
 * Secondary row links — maps + discovery; tucked under expanded card details.
 * @param {string} mapsUrl
 * @param {string} discoveryLinkHtml
 */
export function buildMapNodeSecondaryActionsHtml(mapsUrl, discoveryLinkHtml = "") {
  const links = [];
  if (mapsUrl) {
    links.push(
      `<a class="city-game-map-maps-link city-game-map-maps-link--text" href="${escapeMapHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">Open in Maps</a>`
    );
  }
  const discovery = String(discoveryLinkHtml ?? "").trim();
  if (discovery) {
    links.push(
      discovery.replace(
        "city-game-map-discovery-link--secondary",
        "city-game-map-discovery-link--text"
      )
    );
  }
  if (!links.length) return "";
  const joined = links.join('<span class="city-game-map-secondary-sep" aria-hidden="true"> · </span>');
  return `<div class="city-game-map-node-secondary-actions">${joined}</div>`;
}

/**
 * @param {string | null | undefined} role
 */
export function defaultNodeStatusHint(role) {
  const roleId = String(role ?? "").trim();
  return ROW_ROLE_STATUS_HINT[roleId] ?? "Live state unknown";
}

/**
 * @param {string} nodeId
 * @param {Record<string, unknown>} season
 */
export function resolvePrimaryUnlockEdge(nodeId, season) {
  const edges = Array.isArray(season.unlock_edges) ? season.unlock_edges : [];
  return edges.find((edge) => edge?.from === nodeId) ?? null;
}

/**
 * @param {string} nodeId
 * @param {string | null | undefined} role
 * @param {Record<string, unknown>} season
 */
export function formatNodeEffectLine(nodeId, role, season) {
  return formatNodeConsequenceLine(nodeId, role, season);
}

/**
 * @param {string} nodeId
 * @param {string | null | undefined} role
 * @param {Record<string, unknown>} season
 */
export function formatNodeConsequenceLine(nodeId, role, season) {
  const roleId = String(role ?? "").trim();
  const unlockEffect = formatSpotlightUnlockEffect(nodeId, season);
  const unlockTail = unlockEffect
    ? unlockEffect.replace(/^Unlocks /i, "unlocks ")
    : "";

  if (roleId === "temp_drop") {
    return unlockTail
      ? `Adds to shared city count · ${unlockTail}`
      : "Adds to shared city count";
  }
  if (roleId === "relay_gate") {
    return unlockTail
      ? `Unclaimed · helps ${unlockTail.replace(/^unlocks /i, "unlock ")}`
      : "Unclaimed · helps hold the network";
  }
  if (roleId === "witness") {
    return unlockTail ? `Sunset window · ${unlockTail}` : "Sunset window · shared witness count";
  }
  if (roleId === "sanctuary") {
    return "Regroup spot · shared sanctuary state";
  }
  if (roleId === "care_loop") {
    return "Care state · maintenance can pause game copy";
  }
  if (roleId === "finale") {
    const required = season.automation?.fragment_nodes?.length ?? 3;
    return `Dormant · wakes after ${required} fragments`;
  }
  if (roleId === "lore_archive") {
    return unlockTail ? `Sealed · ${unlockTail}` : "Sealed · lore unlocks with the city";
  }

  const status = defaultNodeStatusHint(role);
  if (unlockTail) return `${status} · helps ${unlockTail.replace(/^unlocks /i, "unlock ")}`;
  return status;
}

/**
 * @param {string | null | undefined} role
 * @param {Record<string, unknown>} [season]
 */
export function formatMysteryNodeCopy(nodeId, role, season = {}) {
  const roleId = String(role ?? "").trim();
  const id = String(nodeId ?? "").trim();
  const required = season.automation?.fragment_nodes?.length ?? 3;
  if (roleId === "relay_gate" && id) {
    const clue = resolveNodeFogClue(id, season);
    return { title: clue.title, consequence: clue.body };
  }
  if (roleId === "finale") {
    return {
      title: "Locked finale",
      consequence: `Wakes after ${required} fragments`,
    };
  }
  if (id) {
    const clue = resolveNodeFogClue(id, season);
    return { title: clue.title, consequence: clue.body };
  }
  return {
    title: "Locked clue",
    consequence: `Wakes after ${required} fragments`,
  };
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveLaunchCopy>} launchCopy
 */
export function buildMapStartHereCalloutHtml(season, launchCopy) {
  const row = resolveSpotlightNode(season);
  if (!row) return "";
  const nodeId = String(row.node_id ?? "").trim();
  if (!nodeId) return "";
  const lensCopy = resolveNetworkLensCopy(season);
  const kicker = lensCopy.start_callout_kicker;
  const why = lensCopy.start_callout_why;
  const label = String(row.label ?? row.node_id ?? "Riverwalk River Lantern");
  const title = `${lensCopy.start_callout_title_prefix}: ${label}`;
  return `<button type="button" class="hc-emphasis-card hc-emphasis-card--active city-game-map-plate city-game-map-start-callout" id="city-game-map-start-callout" data-focus-primary-node="${escapeMapHtml(nodeId)}" aria-labelledby="city-game-map-start-callout-title">
  <span class="hc-emphasis-card__main">
    <span class="hc-emphasis-card__dot hc-emphasis-card__dot--success" aria-hidden="true"></span>
    <span class="hc-emphasis-card__copy">
      <span class="hc-emphasis-card__eyebrow city-game-map-start-callout-kicker">${escapeMapHtml(kicker)}</span>
      <span class="hc-emphasis-card__title city-game-map-start-callout-title" id="city-game-map-start-callout-title">${escapeMapHtml(title)}</span>
      <span class="hc-emphasis-card__detail city-game-map-start-callout-why">${escapeMapHtml(why)}</span>
    </span>
  </span>
</button>`;
}

/**
 * Above-fold orientation — intro + tappable start callout (P0 cold visit).
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapOrientStripHtml(season, copy) {
  const launchCopy = resolveLaunchCopy(season);
  const intro = buildMapBoardIntroHtml(copy);
  const callout = buildMapStartHereCalloutHtml(season, launchCopy);
  const primary = buildMapPrimaryActionHtml(season, copy);
  if (!intro && !callout && !primary) return "";
  return `<section class="city-game-map-orient" id="city-game-map-orient" aria-label="Board orientation">
  ${intro}
  ${callout}
  ${primary}
</section>`;
}

/**
 * Primary board action — focus suggested first stop before the place list.
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapPrimaryActionHtml(season, copy) {
  const nextId = networkLensNextNodeId(season);
  if (!nextId) return "";
  const ctaLabel =
    copy.primary_action_label?.trim() || DEFAULT_MAP_COPY.primary_action_label;
  return `<div class="city-game-map-primary-action" id="city-game-map-primary-action">
  <button type="button" class="hc-emphasis-card__cta city-game-map-primary-action-btn" id="city-game-map-primary-action-btn" data-focus-primary-node="${escapeMapHtml(nextId)}">${escapeMapHtml(ctaLabel)}</button>
</div>`;
}

/**
 * One-line board explainer for first-time visitors (map_copy.board_intro).
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapBoardIntroHtml(copy) {
  const intro = copy.board_intro?.trim();
  if (!intro) return "";
  return `<p class="city-game-map-board-intro" id="city-game-map-board-intro">${escapeMapHtml(intro)}</p>`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function formatStaticWorldStatusLine(season, copy) {
  return copy.world_status_default?.trim() || DEFAULT_MAP_COPY.world_status_default;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 * @param {ReturnType<typeof resolveLaunchCopy>} launchCopy
 */
export function buildMapMissionSummaryHtml(season, copy, launchCopy, options = {}) {
  const compact = options.compact === true;
  const statusLead = formatCityStatusLeadLine(null, copy);
  const questHook = formatHookLine(null, copy);
  const progress = formatProgressLine(null, copy, season);
  const consequence = formatFragmentConsequence(null, season);
  const worldStatus = formatStaticWorldStatusLine(season, copy);
  const privacy = launchCopy.privacy_note?.trim() || copy.privacy_note;
  const objective = copy.hero_objective?.trim() || DEFAULT_MAP_COPY.hero_objective;
  const finaleId = String(season.automation?.finale_node ?? "node_13").trim();
  const finaleRow = nodeRows(season).find((row) => row.node_id === finaleId);
  const finaleLabel = String(finaleRow?.label ?? "Downtown alley arch").trim();
  const fragmentRequired = season.automation?.fragment_nodes?.length ?? 3;
  const missionAttrs = `id="city-game-map-mission" data-hook="${escapeMapHtml(copy.hook)}" data-hook-stirring="${escapeMapHtml(copy.hook_stirring)}" data-hook-awake="${escapeMapHtml(copy.hook_awake)}" data-city-status-lead="${escapeMapHtml(copy.city_status_lead)}" data-city-status-lead-active="${escapeMapHtml(copy.city_status_lead_active)}" data-city-status-lead-complete="${escapeMapHtml(copy.city_status_lead_complete)}" data-progress-suffix="${escapeMapHtml(copy.progress_suffix)}" data-world-default="${escapeMapHtml(formatStaticWorldStatusLine(season, copy))}" data-finale-label="${escapeMapHtml(finaleLabel)}" data-fragment-required="${fragmentRequired}"`;
  const inPlateClass = options.inPlate ? " city-game-map-mission--in-plate" : "";
  if (compact) {
    const loreSummary = copy.lore_summary?.trim() || DEFAULT_MAP_COPY.lore_summary;
    return `<div class="city-game-map-mission city-game-map-lobby city-game-map-mission--compact${inPlateClass}" ${missionAttrs}>
    <p class="city-game-map-status-lead" id="city-game-map-hook">${escapeMapHtml(statusLead)}</p>
    <p class="city-game-map-progress" id="city-game-map-progress" aria-live="polite">${escapeMapHtml(progress)}</p>
    <p class="city-game-map-mission-world" id="city-game-map-mission-world">${escapeMapHtml(worldStatus)}</p>
    <details class="city-game-map-mission-details">
      <summary class="city-game-map-mission-details-summary">${escapeMapHtml(loreSummary)}</summary>
      <p class="city-game-map-quest-hook" id="city-game-map-quest-hook">${escapeMapHtml(questHook)}</p>
      <p class="city-game-map-mission-objective">${escapeMapHtml(objective)}</p>
      <p class="city-game-map-mission-consequence" id="city-game-map-mission-consequence">${escapeMapHtml(consequence)}</p>
    </details>
    <p class="city-game-map-mission-privacy">${escapeMapHtml(privacy)}</p>
  </div>`;
  }
  return `<div class="city-game-map-mission city-game-map-lobby" ${missionAttrs}>
    <p class="city-game-map-status-lead" id="city-game-map-hook">${escapeMapHtml(statusLead)}</p>
    <p class="city-game-map-quest-hook" id="city-game-map-quest-hook">${escapeMapHtml(questHook)}</p>
    <p class="city-game-map-mission-objective">${escapeMapHtml(objective)}</p>
    <p class="city-game-map-progress" id="city-game-map-progress" aria-live="polite">${escapeMapHtml(progress)}</p>
    <p class="city-game-map-mission-consequence" id="city-game-map-mission-consequence">${escapeMapHtml(consequence)}</p>
    <p class="city-game-map-mission-world" id="city-game-map-mission-world">${escapeMapHtml(worldStatus)}</p>
    <p class="city-game-map-mission-privacy">${escapeMapHtml(privacy)}</p>
  </div>`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapWakeLoopHtml(season, copy) {
  const lines = copy.wake_loop_lines?.length
    ? copy.wake_loop_lines
    : DEFAULT_MAP_COPY.wake_loop_lines;
  const items = lines.map((line) => `<li>${escapeMapHtml(line)}</li>`).join("");
  return `<section class="city-game-map-wake-loop" aria-labelledby="city-game-map-wake-loop-title">
  <h2 class="group-label" id="city-game-map-wake-loop-title">${escapeMapHtml(copy.wake_loop_title)}</h2>
  <ul class="city-game-map-wake-loop-lines">${items}</ul>
</section>`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
/**
 * Full-width district sketch — primary board surface (map-first layout).
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 * @param {ReturnType<typeof resolveBoardContextView> | null} [contextView]
 */
export function buildMapSketchHeroHtml(season, copy, contextView = null) {
  const contest = buildMapContestOverlayHtml(season, copy);
  const contestClass =
    resolveNetworkLens(season).contest_layer && seasonMapVisibility(season) !== "public"
      ? " city-game-map-sketch-hero--contest"
      : "";
  return `<section class="city-game-map-sketch-hero${contestClass}" id="city-game-map-sketch-hero" aria-label="Network map">
  ${contest}
  <figure class="city-game-map-mobile-sketch city-game-map-sketch-hero-figure">
    ${buildMapSchematicSvg(
      season,
      { hidePinLabels: false, hideZoneLabels: true, mobileSketch: true, networkLens: true },
      contextView
    )}
    <figcaption class="city-game-map-figcaption">${escapeMapHtml(copy.sketch_caption || copy.diagram_note)}</figcaption>
  </figure>
</section>`;
}

/**
 * Contest layer hint on the sketch (Signal War fog — no heatmap).
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapContestOverlayHtml(season, copy) {
  if (!resolveNetworkLens(season).contest_layer) return "";
  const mode = seasonMapVisibility(season);
  if (mode === "public") return "";
  const lead =
    mode === "rumor_only" ? copy.fog_lead_rumor_only : copy.fog_lead_signal_war;
  return `<p class="city-game-map-contest-overlay" id="city-game-map-contest-overlay" role="status">${escapeMapHtml(lead)}</p>`;
}

export function buildMapLiveStateHtml(season, copy) {
  const launchCopy = resolveLaunchCopy(season);
  return `<section class="city-game-map-live-state city-game-map-live-state--compact" id="city-game-map-live-state" aria-labelledby="city-game-map-live-state-title">
  ${buildMapFirstPaintHtml(season, launchCopy)}
  <article class="hc-emphasis-card hc-emphasis-card--info city-game-map-plate city-game-map-live-state-plate">
    <div class="hc-emphasis-card__main">
      <span class="hc-emphasis-card__dot hc-emphasis-card__dot--info" aria-hidden="true"></span>
      <div class="hc-emphasis-card__copy">
        <h2 class="hc-emphasis-card__eyebrow city-game-map-live-state-title" id="city-game-map-live-state-title">${escapeMapHtml(copy.section_live_state_title)}</h2>
        ${buildMapMissionSummaryHtml(season, copy, launchCopy, { compact: true, inPlate: true })}
      </div>
    </div>
  </article>
  <div
    class="city-game-map-signal-war city-game-map-signal-war--inline"
    id="city-game-map-signal-war"
    aria-label="Signal War standings"
    hidden
  >
    <ul id="city-game-map-signal-war-lines" class="guestbook-lines guestbook-lines-update"></ul>
  </div>
</section>`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapActivityHtml(season, copy) {
  return `<section class="city-game-map-activity" id="city-game-map-activity" aria-labelledby="city-game-map-activity-title">
  <h2 class="group-label" id="city-game-map-activity-title">${escapeMapHtml(copy.section_activity_title)}</h2>
  <p class="city-game-map-sync" id="city-game-map-sync" aria-live="polite">Syncing…</p>
  <div
    class="city-game-map-ticker"
    data-city-game-ticker
    data-season-id="${escapeMapHtml(String(season.season_id ?? "cr_season_01_wake"))}"
  >
    <ul
      id="city-game-live-map-ticker"
      class="guestbook-lines guestbook-lines-update"
      aria-label="Live city headlines"
      aria-live="polite"
    >
      <li>Waiting for city whispers…</li>
    </ul>
  </div>
</section>`;
}

/**
 * First N unlock edges for above-fold routes strip.
 * @param {Record<string, unknown>} season
 * @param {number} [limit]
 */
export function selectRoutesStripEdges(season, limit = 3) {
  const edges = orderUnlockEdgesForPreview(season);
  return edges.slice(0, Math.max(0, limit));
}

/**
 * @param {Record<string, unknown>} edge
 * @param {Record<string, unknown>} season
 * @param {{ primaryNode?: string; startLabel?: string; openLabel?: string; lockedLabel?: string; interactive?: boolean }} [options]
 */
export function buildMapRouteRowHtml(edge, season, options = {}) {
  const primaryNode = options.primaryNode ?? networkLensNextNodeId(season);
  const startLabel =
    options.startLabel?.trim() || resolveNetworkLensCopy(season).next_pin_label;
  const openLabel = options.openLabel?.trim() || DEFAULT_MAP_COPY.route_state_open;
  const lockedLabel = options.lockedLabel?.trim() || DEFAULT_MAP_COPY.route_state_locked;
  const fromLabel =
    nodeRows(season).find((n) => n.node_id === edge.from)?.label ?? edge.from;
  const toLabel = nodeRows(season).find((n) => n.node_id === edge.to)?.label ?? edge.to;
  const detail =
    typeof edge.label === "string" && edge.label.trim()
      ? edge.label.trim()
      : `${fromLabel} unlocks ${toLabel}`;
  const isNext = edge.from === primaryNode;
  const stateLabel = isNext ? startLabel : lockedLabel;
  const rowClass = `city-game-map-route-row${isNext ? " city-game-map-route-row--next" : ""}`;
  const attrs = `data-edge-from="${escapeMapHtml(edge.from)}" data-edge-to="${escapeMapHtml(edge.to)}" data-route-locked="${isNext ? "false" : "true"}"`;
  if (options.interactive) {
    return `<li class="city-game-map-route-item"><button type="button" class="${rowClass}" ${attrs} data-focus-route-from="${escapeMapHtml(edge.from)}" data-focus-route-to="${escapeMapHtml(edge.to)}">
  <span class="city-game-map-route-state" aria-hidden="true">${escapeMapHtml(stateLabel)}</span>
  <span class="city-game-map-route-detail">${escapeMapHtml(detail)}</span>
</button></li>`;
  }
  return `<li class="${rowClass}" ${attrs}>
  <span class="city-game-map-route-state" aria-hidden="true">${escapeMapHtml(stateLabel)}</span>
  <span class="city-game-map-route-detail">${escapeMapHtml(detail)}</span>
</li>`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 * @param {{ edges?: Record<string, unknown>[]; interactive?: boolean; openLabel?: string; lockedLabel?: string; startLabel?: string }} [options]
 */
export function buildMapRouteListHtml(season, copy, options = {}) {
  const edges = options.edges ?? orderUnlockEdgesForPreview(season);
  if (!edges.length) return "";
  const primaryNode = networkLensNextNodeId(season);
  const startLabel = options.startLabel ?? resolveNetworkLensCopy(season).next_pin_label;
  const rowOpts = {
    primaryNode,
    startLabel,
    openLabel: options.openLabel ?? copy.route_state_open,
    lockedLabel: options.lockedLabel ?? copy.route_state_locked,
    interactive: options.interactive === true,
  };
  return edges.map((edge) => buildMapRouteRowHtml(edge, season, rowOpts)).join("");
}

/**
 * Compact connected-routes strip — above fold, outside drawer (P1 routes surfacing).
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapRoutesStripHtml(season, copy) {
  const edges = selectRoutesStripEdges(season, 3);
  if (!edges.length) return "";
  const drawerSummary = resolveNetworkLensCopy(season).drawer_summary;
  const moreLabel = copy.routes_strip_more_label?.trim() || drawerSummary;
  return `<section class="city-game-map-routes-strip" id="city-game-map-routes-strip" aria-labelledby="city-game-map-routes-strip-title">
  <h2 class="group-label city-game-map-routes-strip-title" id="city-game-map-routes-strip-title">${escapeMapHtml(copy.routes_strip_title)}</h2>
  <p class="group-intro short city-game-map-routes-strip-intro">${escapeMapHtml(copy.routes_strip_intro)}</p>
  <ul class="city-game-map-route-list city-game-map-route-list--interactive">${buildMapRouteListHtml(season, copy, { edges, interactive: true })}</ul>
  <button type="button" class="city-game-map-routes-strip-more" data-open-map-drawer>${escapeMapHtml(moreLabel)}</button>
</section>`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapRoutesPreviewHtml(season, copy) {
  const edges = orderUnlockEdgesForPreview(season);
  if (!edges.length) return "";
  const intro = copy.unlock_intro?.trim() || DEFAULT_MAP_COPY.unlock_intro;
  return `<section class="city-game-map-routes-preview" aria-labelledby="city-game-map-routes-preview-title">
  <h2 class="group-label" id="city-game-map-routes-preview-title">${escapeMapHtml(copy.routes_preview_title)}</h2>
  <p class="group-intro short city-game-map-routes-intro">${escapeMapHtml(intro)}</p>
  <ul class="city-game-map-route-list city-game-map-route-list--interactive">${buildMapRouteListHtml(season, copy, { edges, interactive: true })}</ul>
</section>`;
}

/**
 * @param {string} nodeId
 * @param {Record<string, unknown>} season
 */
export function formatSpotlightUnlockEffect(nodeId, season) {
  const edge = resolvePrimaryUnlockEdge(nodeId, season);
  if (!edge) return "";
  if (typeof edge.label === "string" && edge.label.trim()) {
    const normalized = edge.label.trim();
    if (/^unlocks /i.test(normalized)) {
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
    if (/ unlocks /i.test(normalized)) {
      const tail = normalized.replace(/^.* unlocks /i, "");
      return `Unlocks ${tail.charAt(0).toUpperCase()}${tail.slice(1)}`;
    }
    return normalized;
  }
  const toRow = nodeRows(season).find((row) => row.node_id === edge.to);
  const toLabel = toRow?.label ?? edge.to;
  return `Unlocks ${abbreviatePinLabel(String(toLabel ?? "")) || String(toLabel ?? "")}`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapLobbyHeaderHtml(season, copy) {
  const hook = formatHookLine(null, copy);
  const progress = formatProgressLine(null, copy, season);
  return `<header
    class="city-game-map-lobby"
    data-hook="${escapeMapHtml(copy.hook)}"
    data-hook-stirring="${escapeMapHtml(copy.hook_stirring)}"
    data-hook-awake="${escapeMapHtml(copy.hook_awake)}"
    data-progress-suffix="${escapeMapHtml(copy.progress_suffix)}"
  >
    <p class="city-game-map-hook" id="city-game-map-hook">${escapeMapHtml(hook)}</p>
    <p class="city-game-map-progress" id="city-game-map-progress" aria-live="polite">${escapeMapHtml(progress)}</p>
  </header>`;
}

/**
 * @param {Record<string, unknown>} season
 */
export function resolveMapStartHere(season) {
  const copy = season.map_copy;
  const block =
    copy && typeof copy === "object" && copy.start_here && typeof copy.start_here === "object"
      ? /** @type {Record<string, unknown>} */ (copy.start_here)
      : null;
  const title =
    (typeof block?.title === "string" && block.title.trim()) || DEFAULT_START_HERE.title;
  const rawSteps = Array.isArray(block?.steps) ? block.steps : DEFAULT_START_HERE.steps;
  const steps = rawSteps
    .map((step) => String(step ?? "").trim())
    .filter(Boolean);
  if (!steps.length) {
    return { title: DEFAULT_START_HERE.title, steps: [...DEFAULT_START_HERE.steps] };
  }
  return { title, steps };
}

/**
 * @param {Record<string, unknown>} season
 */
export function buildMapStartHereHtml(season) {
  const { title, steps } = resolveMapStartHere(season);
  const items = steps
    .map((step) => `<li>${escapeMapHtml(step)}</li>`)
    .join("");
  return `<section class="city-game-map-start-here" aria-labelledby="city-game-map-start-here-title">
    <h3 class="group-label" id="city-game-map-start-here-title">${escapeMapHtml(title)}</h3>
    <ol class="city-game-map-start-steps">${items}</ol>
  </section>`;
}

/**
 * @param {ReturnType<typeof resolveLaunchCopy>} launchCopy
 */
export function buildMapActionsStripHtml(launchCopy) {
  const items = launchCopy.hero_steps
    .map((step) => `<span class="city-game-map-action">${escapeMapHtml(step)}</span>`)
    .join('<span class="city-game-map-action-sep" aria-hidden="true"> · </span>');
  return `<p class="city-game-map-actions" aria-label="${escapeMapHtml(launchCopy.hero_aria_label)}">${items}</p>`;
}

/**
 * @param {ReturnType<typeof resolveLaunchCopy>} launchCopy
 */
export function buildMapCodeHintHtml(launchCopy) {
  return `<p class="city-game-map-code-hint">${escapeMapHtml(launchCopy.code_hint)}</p>`;
}

/**
 * @param {ReturnType<typeof resolveLaunchCopy>} launchCopy
 */
export function buildMapPrivacyInlineHtml(launchCopy) {
  return `<p class="city-game-map-privacy-inline idea-footnote">${escapeMapHtml(launchCopy.privacy_note)}</p>`;
}

/**
 * @param {Record<string, unknown>} season
 */
export function resolveSpotlightNode(season, contextView = null) {
  const nodeId = networkLensNextNodeId(season);
  return nodeRows(season, contextView).find((row) => row?.node_id === nodeId) ?? null;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveLaunchCopy>} launchCopy
 * @param {ReturnType<typeof resolveBoardContextView> | null} [contextView]
 */
export function buildMapSpotlightHtml(season, launchCopy, contextView = null) {
  const row = resolveSpotlightNode(season, contextView);
  if (!row) return "";

  const nodeId = String(row.node_id ?? "");
  const label = escapeMapHtml(String(row.label ?? row.node_id ?? "Spotlight"));
  const mapsUrl = escapeMapHtml(buildMapsSearchUrl(season, row));
  const scanHint = escapeMapHtml(launchCopy.spotlight_scan_hint);
  const countPlaceholder = escapeMapHtml(launchCopy.count_placeholder);
  const kicker = escapeMapHtml(launchCopy.spotlight_kicker);
  const lead = escapeMapHtml(launchCopy.spotlight_lead);
  const effect = formatSpotlightUnlockEffect(nodeId, season);
  const effectHtml = effect
    ? `<p class="city-game-map-spotlight-effect">${escapeMapHtml(effect)}</p>`
    : "";
  const chainLabel = escapeMapHtml(
    launchCopy.spotlight_chain_label?.trim() || DEFAULT_MAP_COPY.spotlight_chain_label || "Move 1 · Quorum chain"
  );

  return `<article
    class="city-game-map-spotlight"
    id="city-game-map-spotlight"
    data-node-id="${escapeMapHtml(nodeId)}"
    data-count-placeholder="${countPlaceholder}"
    data-scan-hint="${scanHint}"
    aria-labelledby="city-game-map-spotlight-title"
  >
    <p class="city-game-map-spotlight-chain">${chainLabel}</p>
    <p class="city-game-map-spotlight-kicker">${kicker}</p>
    <h2 class="city-game-map-spotlight-title" id="city-game-map-spotlight-title">${label}</h2>
    <p class="city-game-map-spotlight-lead">${lead}</p>
    ${effectHtml}
    <p class="city-game-map-spotlight-count" id="city-game-map-spotlight-count" aria-live="polite">${countPlaceholder}</p>
    <div class="city-game-map-spotlight-actions">
      <span class="city-game-map-spotlight-live" id="city-game-map-spotlight-live"><span class="city-game-map-spotlight-hint">${scanHint}</span></span>
      <a class="city-game-map-maps-link city-game-map-maps-link--secondary" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">Open in Maps</a>
    </div>
  </article>`;
}

/**
 * Tier-4 selection panel — shown when a pin or list row is focused (SF-3).
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapSelectionPanelHtml(season, copy) {
  const lensCopy = resolveNetworkLensCopy(season);
  const nextId = networkLensNextNodeId(season);
  const row = nodeRows(season).find((entry) => entry?.node_id === nextId);
  const placeholderTitle = row?.label ? String(row.label) : "Pick a place on the map";
  return `<article
    class="hc-emphasis-card hc-emphasis-card--info city-game-map-plate city-game-map-selection-panel"
    id="city-game-map-selection-panel"
    hidden
    aria-labelledby="city-game-map-selection-title"
    data-placeholder-title="${escapeMapHtml(placeholderTitle)}"
  >
    <div class="hc-emphasis-card__main">
      <span class="hc-emphasis-card__dot hc-emphasis-card__dot--info" aria-hidden="true"></span>
      <div class="hc-emphasis-card__copy">
        <p class="hc-emphasis-card__eyebrow city-game-map-selection-kicker">${escapeMapHtml(lensCopy.selection_kicker)}</p>
        <h2 class="hc-emphasis-card__title city-game-map-selection-title" id="city-game-map-selection-title"></h2>
        <p class="hc-emphasis-card__detail city-game-map-selection-state" data-selection-effect aria-live="polite"></p>
        <div class="city-game-map-selection-chips" data-selection-chips hidden></div>
      </div>
    </div>
    <div class="hc-emphasis-card__actions city-game-map-selection-actions">
      <span class="city-game-map-selection-scan" data-selection-scan></span>
      <a class="city-game-map-maps-link city-game-map-maps-link--secondary" data-selection-maps target="_blank" rel="noopener noreferrer" hidden>Open in Maps</a>
      <a class="city-game-map-discovery-link city-game-map-discovery-link--secondary" data-selection-discovery hidden>Discovery pin</a>
    </div>
  </article>`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapListLensToggleHtml(season, copy) {
  const lens = resolveNetworkLens(season);
  const lensCopy = lens.copy;
  const spineCount = lens.play_spine.length;
  const totalCount = nodeRows(season).length;
  const spinePressed = lens.default_list === "spine" ? "true" : "false";
  const allPressed = lens.default_list === "all" ? "true" : "false";
  const spineLabel = `${lensCopy.list_lens_spine_label} (${spineCount})`;
  const allLabel = `${lensCopy.list_lens_all_label} (${totalCount})`;
  return `<div class="city-game-map-list-lens" role="group" aria-label="${escapeMapHtml(lensCopy.list_lens_aria)}">
  <button type="button" class="city-game-map-list-lens-btn" data-list-lens="spine" aria-pressed="${spinePressed}">${escapeMapHtml(spineLabel)}</button>
  <button type="button" class="city-game-map-list-lens-btn" data-list-lens="all" aria-pressed="${allPressed}">${escapeMapHtml(allLabel)}</button>
</div>`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveLaunchCopy>} launchCopy
 */
export function buildMapFirstPaintHtml(season, launchCopy, contextView = null) {
  const copy = resolveMapCopy(season);
  const summary = copy.how_scan_summary?.trim() || DEFAULT_MAP_COPY.how_scan_summary;
  return `<details class="city-game-map-how-details">
      <summary class="city-game-map-how-summary">${escapeMapHtml(summary)}</summary>
      <div class="city-game-map-how-body">
        ${buildMapActionsStripHtml(launchCopy)}
        ${buildMapCodeHintHtml(launchCopy)}
      </div>
    </details>`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 * @param {ReturnType<typeof resolveLaunchCopy>} launchCopy
 */
export function buildMapPlacesSectionHtml(season, copy, launchCopy, contextView = null) {
  const districtFilter = isDenseMapBoard(season) ? buildDistrictFilterHtml(season) : "";
  const discoveryCrosslinks = renderDiscoveryMapCrosslinkStrip(
    contextView?.pin_region,
    escapeMapHtml
  );
  return `<section class="city-game-map-places-list" id="city-game-map-places" aria-labelledby="city-game-map-list-title">
  <div class="city-game-map-list-panel">
    <h2 class="city-game-map-list-title" id="city-game-map-list-title">${escapeMapHtml(copy.section_places_title)}</h2>
    ${discoveryCrosslinks}
    ${buildMapListLensToggleHtml(season, copy)}
    <details class="city-game-map-filters-details" id="city-game-map-filters">
      <summary class="city-game-map-filters-summary">${escapeMapHtml(copy.filters_summary)}</summary>
      <div class="city-game-map-browse-filters">
        ${districtFilter}
        ${buildTypeFilterHtml(season)}
        ${buildStateFilterHtml()}
      </div>
      ${buildBoardFilterSummaryHtml()}
    </details>
    <div class="city-game-map-list-scroll">
      ${buildMapSelectionBarHtml()}
      ${buildMapNodeListHtml(season, launchCopy, contextView)}
    </div>
  </div>
</section>`;
}

/**
 * @deprecated Use buildMapPlacesSectionHtml — kept for tests referencing browse id.
 */
export function buildMapBrowseHtml(season, copy, launchCopy) {
  return buildMapPlacesSectionHtml(season, copy, launchCopy);
}

/**
 * Short label for schematic pins. Drop redundant district prefixes when space is tight.
 * @param {string} label
 */
export function abbreviatePinLabel(label) {
  const raw = String(label ?? "").trim();
  if (!raw) return "";
  const stripped = raw.replace(/^(NewBo|Czech Village|Greene Square|Downtown|Riverwalk)\s+/i, "");
  const text = stripped || raw;
  if (text.length <= 14) return text;
  return `${text.slice(0, 12)}…`;
}

/**
 * External maps search URL. Optional per-node `maps_query` overrides label + city.
 * @param {Record<string, unknown>} season
 * @param {{ label?: string; maps_query?: string }} row
 */
export function buildMapsSearchUrl(season, row) {
  const custom =
    typeof row.maps_query === "string" && row.maps_query.trim() ? row.maps_query.trim() : "";
  const query = custom || [row.label, season.city].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(query))}`;
}

/**
 * @param {Record<string, unknown>} season
 */
function nodePositionMap(season) {
  const positions = /** @type {Record<string, { x: number; y: number }>} */ (
    season.map_layout?.nodes ?? {}
  );
  return positions;
}

/**
 * Place rows — pin lens (context.place_rows) or season.nodes fallback.
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveBoardContextView> | null} [contextView]
 */
function nodeRows(season, contextView = null) {
  if (contextView?.place_rows?.length) return contextView.place_rows;
  return Array.isArray(season.nodes) ? season.nodes : [];
}

/**
 * @param {Record<string, unknown>} season
 * @param {{ finale_wake_title?: string }} copy
 */
export function buildFinaleFootnoteHtml(season, copy) {
  const wakeTitle = copy.finale_wake_title?.trim() || DEFAULT_MAP_COPY.finale_wake_title;
  const fragmentCount = season.automation?.fragment_nodes?.length ?? 3;
  return `<p class="city-game-map-finale-footnote idea-footnote" id="city-game-map-finale-footnote" data-wake-title="${escapeMapHtml(wakeTitle)}">${escapeMapHtml(wakeTitle)}: 0 / ${fragmentCount}</p>`;
}

/**
 * @param {{ finale_wake_title?: string; roles_summary?: string }} copy
 * @deprecated E0 — Explore By chips replace the static glossary; kept for tests importing only.
 */
export function buildMapRolesLegendHtml(copy) {
  return "";
}

/**
 * @param {Record<string, unknown>} season
 */
export function buildMapSchematicSvg(season, options = {}, contextView = null) {
  const hidePinLabels = Boolean(options.hidePinLabels);
  const hideZoneLabels = Boolean(options.hideZoneLabels);
  const mobileSketch = Boolean(options.mobileSketch);
  const networkLens = Boolean(options.networkLens);
  const lens = resolveNetworkLens(season);
  const positions = nodePositionMap(season);
  const rows = nodeRows(season, contextView);
  const edges = Array.isArray(season.unlock_edges) ? season.unlock_edges : [];

  const edgeLines = edges
    .map((edge) => {
      const from = positions[edge.from];
      const to = positions[edge.to];
      if (!from || !to) return "";
      const x1 = from.x * 100;
      const y1 = from.y * 100;
      const x2 = to.x * 100;
      const y2 = to.y * 100;
      const onSpine =
        networkLens &&
        lens.play_spine.includes(edge.from) &&
        lens.play_spine.includes(edge.to);
      const edgeClass = mobileSketch
        ? onSpine
          ? "city-game-map-edge city-game-map-edge--express"
          : "city-game-map-edge city-game-map-edge--soft"
        : onSpine
          ? "city-game-map-edge city-game-map-edge--express"
          : "city-game-map-edge";
      return `<line class="${edgeClass}" data-edge-from="${escapeMapHtml(edge.from)}" data-edge-to="${escapeMapHtml(edge.to)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
    })
    .join("");

  const pins = [...rows]
    .sort((a, b) => {
      if (!networkLens) return 0;
      const aId = String(a.node_id ?? "");
      const bId = String(b.node_id ?? "");
      const pinRank = (nodeId) => {
        if (nodeId === lens.next_node_id) return 2;
        if (isNetworkLensSpineNode(season, nodeId)) return 1;
        return 0;
      };
      return pinRank(aId) - pinRank(bId);
    })
    .map((row) => {
      const pos = positions[row.node_id];
      if (!pos) return "";
      const cx = pos.x * 100;
      const cy = pos.y * 100;
      const nodeId = String(row.node_id ?? "");
      const pinLabel = escapeMapHtml(abbreviatePinLabel(row.label ?? row.node_id));
      const fullLabel = escapeMapHtml(row.label ?? row.node_id);
      const role = escapeMapHtml(row.role ?? "");
      const district = escapeMapHtml(row.district ?? "");
      const visibility = nodeRowStaticVisibility(season, row);
      const boardVisibility = visibility === "public" ? "public" : "hidden";
      const boardStates = visibility === "public" ? "unlocked" : "locked";
      const isSpine = networkLens && isNetworkLensSpineNode(season, nodeId);
      const isNext = networkLens && nodeId === lens.next_node_id;
      const nextPinLabel = escapeMapHtml(resolveNetworkLensCopy(season).next_pin_label);
      const staticState = escapeMapHtml(
        ROW_ROLE_STATUS_HINT[row.role] ?? ROW_ROLE_STATUS_HINT.temp_drop ?? "Unknown"
      );
      let pinStateClass =
        visibility === "public" ? "" : " city-game-map-pin--locked";
      if (isSpine) pinStateClass += " city-game-map-pin--spine";
      if (isNext) pinStateClass += " city-game-map-pin--next";
      const labelMarkup = networkLens
        ? `<text class="city-game-map-pin-label" y="6.8" text-anchor="middle">${pinLabel}</text>
  <text class="city-game-map-pin-state" y="10.8" text-anchor="middle">${staticState}</text>
  ${isNext ? `<text class="city-game-map-pin-next" y="-3.6" text-anchor="middle">${nextPinLabel}</text>` : ""}`
        : hidePinLabels
          ? `<text class="city-game-map-pin-label" y="6.8" text-anchor="middle" visibility="hidden">${pinLabel}</text>`
          : `<text class="city-game-map-pin-label" y="6.8" text-anchor="middle">${pinLabel}</text>`;
      return `<g class="city-game-map-pin${pinStateClass}" data-node-id="${escapeMapHtml(nodeId)}" data-district="${district}" data-role="${role}" data-board-visibility="${boardVisibility}" data-board-states="${boardStates}"${isSpine ? ' data-spine-node="1"' : ""} transform="translate(${cx} ${cy})" aria-label="${fullLabel}" tabindex="-1" role="img">
  <title>${fullLabel}</title>
  <circle class="city-game-map-pin-hit" r="${mobileSketch ? "6.5" : "6"}" fill="transparent" stroke="none" />
  <circle class="city-game-map-pin-dot" r="${mobileSketch ? (isSpine ? "3.2" : "2.8") : "3.2"}" />
  ${labelMarkup}
</g>`;
    })
    .join("");

  const layout = season.map_layout && typeof season.map_layout === "object" ? season.map_layout : {};
  const zoneRows = Array.isArray(layout.district_zones) ? layout.district_zones : [];
  const districtZones = zoneRows
    .map((z) => {
      const zoneLabel = hideZoneLabels
        ? ""
        : `<text class="city-game-map-zone-label" x="${z.x + 4}" y="${z.y + 8}">${escapeMapHtml(z.label ?? z.id ?? "")}</text>`;
      return `<rect class="city-game-map-zone" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="2" />
${zoneLabel}`;
    })
    .join("");
  const cityLabel = String(season.city ?? "city").trim() || "city";
  const svgTitle =
    typeof layout.svg_title === "string" && layout.svg_title.trim()
      ? layout.svg_title.trim()
      : `Schematic ${cityLabel} districts and city goals`;

  return `<svg class="city-game-map-svg" viewBox="0 0 100 100" role="img" aria-labelledby="city-game-map-svg-title" focusable="false">
<title id="city-game-map-svg-title">${escapeMapHtml(svgTitle)}</title>
${districtZones}
${edgeLines}
${pins}
</svg>`;
}

/**
 * @param {Record<string, unknown>} season
 */
export function buildMapNodeListHtml(season, launchCopy = resolveLaunchCopy(season), contextView = null) {
  const spotlightId = networkLensNextNodeId(season);
  const rows = nodeRows(season, contextView);
  const pinRegion = String(contextView?.pin_region ?? "").trim();
  const byDistrict = new Map();
  for (const row of rows) {
    const district = row.district ?? "other";
    if (!byDistrict.has(district)) byDistrict.set(district, []);
    byDistrict.get(district).push(row);
  }

  const districtOrder = Array.isArray(season.districts) ? season.districts : [...byDistrict.keys()];

  return districtOrder
    .filter((d) => byDistrict.has(d))
    .map((district) => {
      const label = CITY_GAME_DISTRICT_LABELS[district] ?? district;
      const districtRows = [...byDistrict.get(district)].sort((a, b) => {
        if (a?.node_id === spotlightId) return -1;
        if (b?.node_id === spotlightId) return 1;
        return 0;
      });
      const items = districtRows
        .map((row) => {
          const districtLabel = CITY_GAME_DISTRICT_LABELS[row.district] ?? row.district;
          const roleLabel = resolveRoleShortLabel(row.role, season);
          const scanUrl = row.scan_url && typeof row.scan_url === "string" ? row.scan_url.trim() : "";
          const mapsUrl = buildMapsSearchUrl(season, row);
          const rowCta = resolveRowScanCta(row.role, launchCopy, { hasScanUrl: Boolean(scanUrl) });
          const role = escapeMapHtml(row.role ?? "");
          const nodeId = String(row.node_id ?? "");
          const staticVisibility = nodeRowStaticVisibility(season, row);
          const omittedAttr = staticVisibility === "omitted" ? " hidden" : "";
          const clueClass = staticVisibility === "clue" ? " city-game-map-node-row--clue" : "";
          const omittedClass =
            staticVisibility === "omitted" ? " city-game-map-node-row--fog-omitted" : "";
          const mystery =
            staticVisibility === "clue" ? formatMysteryNodeCopy(nodeId, row.role, season) : null;
          const title = mystery ? mystery.title : String(row.label ?? "");
          const consequenceLine = mystery
            ? mystery.consequence
            : formatNodeConsequenceLine(nodeId, row.role, season);
          const cardCopy = buildNodeCardCopy(row.role, season, {
            nodeId,
            why: consequenceLine,
            mysteryTitle: mystery ? mystery.title : undefined,
          });
          const cardSlotsHtml = buildMapNodeCardSlotsHtml(cardCopy);
          const boardVisibility = staticVisibility === "public" ? "public" : "hidden";
          const boardStates =
            staticVisibility === "public"
              ? deriveNodeBoardStates(null, row.role).join(" ")
              : "locked";
          const primaryCta =
            staticVisibility === "clue"
              ? `<span class="city-game-map-live-hint city-game-map-row-cta">${escapeMapHtml(rowCta)}</span>`
              : scanUrl
                ? `<a class="city-game-map-scan-link city-game-map-row-cta" href="${escapeMapHtml(scanUrl)}">${escapeMapHtml(rowCta)}</a>`
                : `<span class="city-game-map-live-hint city-game-map-row-cta">${escapeMapHtml(rowCta)}</span>`;
          const spotlightClass =
            row.node_id === spotlightId ? " city-game-map-node-row--spotlight" : "";
          const spineAttr = isNetworkLensSpineNode(season, nodeId) ? ' data-spine-node="1"' : "";
          const pinId = String(row.pin_id ?? "").trim();
          const pinIdAttr = pinId ? ` data-pin-id="${escapeMapHtml(pinId)}"` : "";
          const discoveryLink =
            pinRegion && pinId
              ? renderDiscoveryPinBookmarkLink(pinRegion, pinId, escapeMapHtml)
              : "";
          const secondaryActions =
            staticVisibility === "clue"
              ? ""
              : buildMapNodeSecondaryActionsHtml(mapsUrl, discoveryLink);
          return `<li class="city-game-map-node-row city-game-map-node-row--state-first${spotlightClass}${clueClass}${omittedClass}" data-node-id="${escapeMapHtml(nodeId)}" data-district="${escapeMapHtml(row.district ?? "")}" data-role="${role}" data-board-visibility="${boardVisibility}" data-board-states="${escapeMapHtml(boardStates)}"${spineAttr}${pinIdAttr} tabindex="0"${omittedAttr}>
  <div class="city-game-map-node-identity" data-state-first="entity">
    <span class="city-game-map-node-title">${escapeMapHtml(title)}</span>
    <span class="city-game-map-node-meta">${escapeMapHtml(districtLabel)} · ${escapeMapHtml(roleLabel)}</span>
  </div>
  <div class="city-game-map-node-chip-band" data-node-chips hidden aria-label="Live chips"></div>
  <p class="city-game-map-node-card-line city-game-map-node-card-state city-game-map-node-card-why" data-state-first="current-state"><span class="city-game-map-node-card-label">Current state</span><span class="city-game-map-node-effect city-game-map-node-card-text" data-node-effect data-node-card-why>${escapeMapHtml(consequenceLine)}</span></p>
  <span class="city-game-map-node-actions" data-state-first="actions">
    <span class="city-game-map-node-live">${primaryCta}</span>
  </span>
  <div class="city-game-map-node-details" data-state-first="details">${cardSlotsHtml}${secondaryActions}</div>
</li>`;
        })
        .join("");
      return `<div class="city-game-map-district" data-district="${escapeMapHtml(district)}">
  <h3 class="city-game-map-district-label">${escapeMapHtml(label)}</h3>
  <ul class="city-game-map-node-list">${items}</ul>
</div>`;
    })
    .join("");
}

/**
 * @param {Record<string, unknown>} season
 */
export function buildUnlockEdgesHtml(season) {
  const edges = Array.isArray(season.unlock_edges) ? season.unlock_edges : [];
  if (!edges.length) return "";
  const items = edges
    .map((edge) => {
      const fromLabel =
        nodeRows(season).find((n) => n.node_id === edge.from)?.label ?? edge.from;
      const toLabel = nodeRows(season).find((n) => n.node_id === edge.to)?.label ?? edge.to;
      const detail =
        typeof edge.label === "string" && edge.label.trim()
          ? edge.label.trim()
          : `${fromLabel} unlocks ${toLabel}`;
      return `<li class="city-game-map-edge-row" data-edge-from="${escapeMapHtml(edge.from)}" data-edge-to="${escapeMapHtml(edge.to)}" data-route-locked="true">
  <span class="city-game-map-route-state" aria-hidden="true">Locked</span>
  <span class="city-game-map-edge-nodes">${escapeMapHtml(detail)}</span>
</li>`;
    })
    .join("");
  return `<ul class="city-game-map-unlock-list">${items}</ul>`;
}

/**
 * @param {Record<string, unknown>} season
 * @returns {string}
 */
export function buildFogLegendHtml(season) {
  const copy = resolveMapCopy(season);
  const mode =
    season?.signal_war &&
    typeof season.signal_war === "object" &&
    typeof /** @type {{ map_visibility?: string }} */ (season.signal_war).map_visibility ===
      "string"
      ? /** @type {{ map_visibility?: string }} */ (season.signal_war).map_visibility.trim()
      : "public";
  if (mode !== "signal_war" && mode !== "rumor_only") return "";
  const lead =
    mode === "rumor_only" ? copy.fog_lead_rumor_only : copy.fog_lead_signal_war;
  return `<section class="city-game-map-fog" aria-labelledby="city-game-map-fog-title">
    <h4 class="group-label" id="city-game-map-fog-title">${escapeMapHtml(copy.fog_title)}</h4>
    <p class="group-intro short">${escapeMapHtml(lead)}</p>
  </section>`;
}

/**
 * Advanced drawer body — goals, duplicate sketch, fog legend (inside network lens drawer).
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapAdvancedDrawerBodyHtml(season, copy, contextView = null) {
  const sketchSummary = copy.sketch_summary;
  const dense = isDenseMapBoard(season);
  return `<div class="city-game-map-drawer-advanced">
    <section class="city-game-map-unlock" aria-labelledby="city-game-map-unlock-title">
      <h4 class="group-label" id="city-game-map-unlock-title">${escapeMapHtml(copy.section_goals_title)}</h4>
      ${buildUnlockEdgesHtml(season)}
      ${buildFinaleFootnoteHtml(season, copy)}
    </section>
    <details class="city-game-map-sketch-details${dense ? " city-game-map-sketch-details--dense" : ""}" id="district-sketch">
      <summary class="city-game-map-sketch-summary">${escapeMapHtml(sketchSummary)}</summary>
      <div class="city-game-map-sketch-block">
        <figure class="city-game-map-figure">
          ${buildMapSchematicSvg(season, { hidePinLabels: dense }, contextView)}
          <figcaption class="city-game-map-figcaption">${escapeMapHtml(copy.diagram_note)}</figcaption>
        </figure>
      </div>
    </details>
    ${buildFogLegendHtml(season)}
    <p class="city-game-map-privacy idea-footnote">${escapeMapHtml(copy.privacy_note)} <a href="/data-policy.html">Data policy</a></p>
  </div>`;
}

/**
 * Single collapsible drawer — activity, routes, legend, dual victory, advanced (Phase 2).
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapNetworkLensDrawerHtml(season, copy, contextView = null) {
  const summary = resolveNetworkLensCopy(season).drawer_summary;
  return `<details class="city-game-map-drawer" id="city-game-map-drawer">
  <summary class="city-game-map-drawer-summary">${escapeMapHtml(summary)}</summary>
  <div class="city-game-map-drawer-body">
    ${buildMapActivityHtml(season, copy)}
    ${buildMapRoutesPreviewHtml(season, copy)}
    ${buildMapNetworkLegendHtml(season, resolveNetworkLensCopy(season))}
    <div id="city-game-map-dual-victory-mount" hidden aria-hidden="true"></div>
    ${buildMapAdvancedDrawerBodyHtml(season, copy, contextView)}
  </div>
</details>`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapAdvancedHtml(season, copy, contextView = null) {
  const sketchSummary = copy.sketch_summary;
  const dense = isDenseMapBoard(season);
  return `<details class="city-game-map-advanced" id="city-game-map-advanced">
  <summary class="city-game-map-advanced-summary">${escapeMapHtml(copy.advanced_summary)}</summary>
  <div class="city-game-map-advanced-body">
    <section class="city-game-map-unlock" aria-labelledby="city-game-map-unlock-title">
      <h4 class="group-label" id="city-game-map-unlock-title">${escapeMapHtml(copy.section_goals_title)}</h4>
      ${buildUnlockEdgesHtml(season)}
      ${buildFinaleFootnoteHtml(season, copy)}
    </section>
    <details class="city-game-map-sketch-details${dense ? " city-game-map-sketch-details--dense" : ""}" id="district-sketch">
      <summary class="city-game-map-sketch-summary">${escapeMapHtml(sketchSummary)}</summary>
      <div class="city-game-map-sketch-block">
        <figure class="city-game-map-figure">
          ${buildMapSchematicSvg(season, { hidePinLabels: dense }, contextView)}
          <figcaption class="city-game-map-figcaption">${escapeMapHtml(copy.diagram_note)}</figcaption>
        </figure>
      </div>
    </details>
    ${buildFogLegendHtml(season)}
    <p class="city-game-map-privacy idea-footnote">${escapeMapHtml(copy.privacy_note)} <a href="/data-policy.html">Data policy</a></p>
  </div>
</details>`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapStateSectionHtml(season, copy) {
  return `<section class="city-game-map-state" aria-labelledby="city-game-map-state-title">
    ${buildMapLobbyHeaderHtml(season, copy)}
    <h3 class="group-label" id="city-game-map-state-title">${escapeMapHtml(copy.section_state_title)}</h3>
    <p class="city-game-map-sync" id="city-game-map-sync" aria-live="polite">Syncing…</p>
    <div
      class="city-game-map-ticker"
      data-city-game-ticker
      data-season-id="${escapeMapHtml(String(season.season_id ?? "cr_season_01_wake"))}"
    >
      <ul
        id="city-game-live-map-ticker"
        class="guestbook-lines guestbook-lines-update"
        aria-label="Live city headlines"
        aria-live="polite"
      >
        <li>Waiting for city whispers…</li>
      </ul>
    </div>
    <div
      class="city-game-map-signal-war"
      id="city-game-map-signal-war"
      aria-label="City goal progress"
      hidden
    >
      <ul
        id="city-game-map-signal-war-lines"
        class="guestbook-lines guestbook-lines-update"
      ></ul>
    </div>
  </section>`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 * @param {ReturnType<typeof resolveLaunchCopy>} launchCopy
 */
export function buildMapWhatChangedHtml(season, copy, launchCopy, openAttr = "") {
  return `<details class="city-game-map-changed" id="city-game-map-changed"${openAttr}>
  <summary class="city-game-map-changed-summary">${escapeMapHtml(launchCopy.what_changed_summary)}</summary>
  <div class="city-game-map-changed-body">
    ${buildMapStateSectionHtml(season, copy)}
  </div>
</details>`;
}

/**
 * @param {Record<string, unknown>} season
 */
export function isLaunchMapBoard(season) {
  const kit = season.comprehension_kit;
  return Boolean(
    kit && typeof kit === "object" && typeof kit.primary_scan_node === "string" && kit.primary_scan_node.trim()
  );
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveBoardContextView>} [contextView]
 * @returns {string}
 */
export function buildMapBoardInnerHtml(season, contextView = resolveBoardContextView(season)) {
  const copy = resolveMapCopy(season);
  const launchCopy = resolveLaunchCopy(season);
  const lens = resolveNetworkLens(season);
  const dense = isDenseMapBoard(season);
  const launchClass = isLaunchMapBoard(season) ? " city-game-map-board--launch" : "";
  const denseClass = dense ? " city-game-map-board--dense" : "";
  const primaryNode = lens.next_node_id || "";
  const primaryAttr = primaryNode
    ? ` data-primary-node="${escapeMapHtml(primaryNode)}"`
    : "";
  const mapVisibility = seasonMapVisibility(season);
  const rumoredAttr = [...seasonRumoredNodeIds(season)].join(",");
  const contextId = escapeMapHtml(contextView.context_id);
  const contextKind = escapeMapHtml(contextView.context_kind);
  const memberCount = contextView.members.length;
  const lensCopy = resolveNetworkLensCopy(season);
  const pinRegion = escapeMapHtml(String(contextView.pin_region ?? ""));

  return `<div class="city-game-map-board city-game-map-board--network-lens city-game-map-board--map-first city-game-map-board--cold-sketch${launchClass}${denseClass}" data-context-id="${contextId}" data-context-kind="${contextKind}" data-member-count="${memberCount}" data-pin-region="${pinRegion}" data-pin-lens="1" data-snapshot-path="${escapeMapHtml(contextView.snapshot.path)}" data-active-type="all" data-active-state="all" data-active-district="all" data-active-explore="all" data-active-list-lens="${escapeMapHtml(lens.default_list)}" data-map-visibility="${escapeMapHtml(mapVisibility)}" data-rumored-nodes="${escapeMapHtml(rumoredAttr)}" data-route-start-label="${escapeMapHtml(lensCopy.next_pin_label)}" data-route-open-label="${escapeMapHtml(copy.route_state_open)}" data-route-locked-label="${escapeMapHtml(copy.route_state_locked)}"${primaryAttr}>
  ${buildMapOrientStripHtml(season, copy)}
  ${buildMapSketchHeroHtml(season, copy, contextView)}
  ${buildMapLiveStateHtml(season, copy)}
  ${buildMapRoutesStripHtml(season, copy)}
  ${buildMapSelectionPanelHtml(season, copy)}
  ${buildMapPlacesSectionHtml(season, copy, launchCopy, contextView)}
  ${buildMapNetworkLensDrawerHtml(season, copy, contextView)}
  <div id="city-game-map-debrief-mount" hidden aria-hidden="true"></div>
</div>`;
}

/**
 * @param {HTMLElement} mount
 * @param {string} message
 */
export function showMapBoardError(mount, message) {
  mount.innerHTML = `<p class="city-game-map-error" role="alert">${message} Try refreshing. Or scan any season sticker for live state.</p>`;
}

/**
 * @param {HTMLElement} mount
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveBoardContextView>} [contextView]
 */
export function renderMapBoard(mount, season, contextView = resolveBoardContextView(season)) {
  const layoutIssues = validateMapLayout(season);
  if (layoutIssues.length) {
    mount.innerHTML = `<p class="city-game-map-error" role="alert">City board unavailable: season map layout incomplete.</p>`;
    return { ok: false, issues: layoutIssues, contextView: null };
  }
  mount.innerHTML = buildMapBoardInnerHtml(season, contextView);
  return { ok: true, issues: [], contextView };
}
