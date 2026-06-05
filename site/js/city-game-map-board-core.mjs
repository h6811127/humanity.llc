/**
 * Cedar Rapids city game — M1 static city state board (read-only).
 * @see docs/CITY_GAME_MAP_DASHBOARD.md · M4 interaction in city-game-map-interaction.mjs
 */

import { buildBoardFilterSummaryHtml } from "./city-game-map-filter-summary-core.mjs";
import {
  buildDistrictFilterHtml,
  isDenseMapBoard,
} from "./city-game-map-interaction-core.mjs";
import { buildExploreFilterHtml } from "./city-game-map-explore-core.mjs";
import { comprehensionPrimaryNodeId } from "./city-game-player-guide-core.mjs";

/** Default row hint before snapshot chips replace the live cell. */
export const MAP_ROW_SCAN_HINT = "Scan sticker there.";

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
  steps: ["Find a sticker", "Scan it", "Add to the city."],
};

const DEFAULT_MAP_COPY = {
  title: "Weekend city board",
  subtitle: "Summer board · read-only",
  hero_objective: "The city is asleep. Find fragments before the weekend ends.",
  hook: "The city is asleep.",
  hook_stirring: "Something is stirring.",
  hook_awake: "The city woke.",
  progress_suffix: "fragments recovered",
  code_hint: "Code is on the back of the sticker.",
  row_scan_hint: MAP_ROW_SCAN_HINT,
  spotlight_scan_hint: "Scan sticker · enter code",
  count_placeholder: "Scan for live count",
  browse_summary: "Browse all places",
  live_hint: "Find stickers. Scan them. Help unlock city goals.",
  wayfinding_intro:
    "Start anywhere. Scan any game sticker you find. Planning from home? Search place names in your maps app; the sketch below is districts only, not streets.",
  diagram_note: "District sketch — not a street map.",
  privacy_note: "No account. No visit log. No GPS tracking.",
  unlock_intro:
    "Paths below wake when the city unlocks them together. Not when you personally check boxes.",
  section_state_title: "Quest log",
  section_places_title: "Places",
  section_goals_title: "City goals",
  advanced_summary: "Map & mechanics",
  sketch_summary: "District sketch",
  finale_wake_title: "Wake the city",
  fog_title: "Hidden on the sketch",
  fog_lead_signal_war: "Some pins stay hidden until the city claims them.",
  fog_lead_rumor_only: "The sketch shows rumored spots only — scan to find the rest.",
  roles_summary: "Place types",
};

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
    spotlight_scan_hint: c.spotlight_scan_hint?.trim() || DEFAULT_MAP_COPY.spotlight_scan_hint,
    count_placeholder: c.count_placeholder?.trim() || DEFAULT_MAP_COPY.count_placeholder,
    browse_summary: c.browse_summary?.trim() || DEFAULT_MAP_COPY.browse_summary,
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
export function resolveSpotlightNode(season) {
  const nodeId = comprehensionPrimaryNodeId(season);
  return nodeRows(season).find((row) => row?.node_id === nodeId) ?? null;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveLaunchCopy>} launchCopy
 */
export function buildMapSpotlightHtml(season, launchCopy) {
  const row = resolveSpotlightNode(season);
  if (!row) return "";

  const nodeId = escapeMapHtml(String(row.node_id ?? ""));
  const label = escapeMapHtml(String(row.label ?? row.node_id ?? "Spotlight"));
  const mapsUrl = escapeMapHtml(buildMapsSearchUrl(season, row));
  const scanHint = escapeMapHtml(launchCopy.spotlight_scan_hint);
  const countPlaceholder = escapeMapHtml(launchCopy.count_placeholder);

  return `<article
    class="city-game-map-spotlight"
    id="city-game-map-spotlight"
    data-node-id="${nodeId}"
    data-count-placeholder="${countPlaceholder}"
    data-scan-hint="${scanHint}"
    aria-labelledby="city-game-map-spotlight-title"
  >
    <h2 class="city-game-map-spotlight-title" id="city-game-map-spotlight-title">${label}</h2>
    <p class="city-game-map-spotlight-count" id="city-game-map-spotlight-count" aria-live="polite">${countPlaceholder}</p>
    <div class="city-game-map-spotlight-actions">
      <a class="city-game-map-maps-link" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">Open in Maps</a>
      <span class="city-game-map-spotlight-live" id="city-game-map-spotlight-live"><span class="city-game-map-spotlight-hint">${scanHint}</span></span>
    </div>
  </article>`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveLaunchCopy>} launchCopy
 */
export function buildMapFirstPaintHtml(season, launchCopy) {
  return `<div class="city-game-map-first-paint">
    ${buildMapActionsStripHtml(launchCopy)}
    ${buildMapCodeHintHtml(launchCopy)}
    ${buildMapSpotlightHtml(season, launchCopy)}
  </div>`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 * @param {ReturnType<typeof resolveLaunchCopy>} launchCopy
 */
export function buildMapBrowseHtml(season, copy, launchCopy) {
  return `<details class="city-game-map-browse" id="city-game-map-browse">
  <summary class="city-game-map-browse-summary">${escapeMapHtml(launchCopy.browse_summary)}</summary>
  <div class="city-game-map-browse-body">
    <div class="city-game-map-list-panel">
      <h2 class="city-game-map-list-title" id="city-game-map-list-title">${escapeMapHtml(copy.section_places_title)}</h2>
      <div class="city-game-map-browse-filters">
        ${buildDistrictFilterHtml(season)}
        ${buildExploreFilterHtml(season)}
      </div>
      ${buildBoardFilterSummaryHtml()}
      ${buildMapNodeListHtml(season, launchCopy)}
    </div>
  </div>
</details>`;
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
 * @param {Record<string, unknown>} season
 */
function nodeRows(season) {
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
export function buildMapSchematicSvg(season) {
  const positions = nodePositionMap(season);
  const rows = nodeRows(season);
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
      return `<line class="city-game-map-edge" data-edge-from="${escapeMapHtml(edge.from)}" data-edge-to="${escapeMapHtml(edge.to)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
    })
    .join("");

  const pins = rows
    .map((row) => {
      const pos = positions[row.node_id];
      if (!pos) return "";
      const cx = pos.x * 100;
      const cy = pos.y * 100;
      const pinLabel = escapeMapHtml(abbreviatePinLabel(row.label ?? row.node_id));
      const fullLabel = escapeMapHtml(row.label ?? row.node_id);
      const role = escapeMapHtml(row.role ?? "");
      const district = escapeMapHtml(row.district ?? "");
      return `<g class="city-game-map-pin" data-node-id="${escapeMapHtml(row.node_id)}" data-district="${district}" data-role="${role}" transform="translate(${cx} ${cy})" aria-label="${fullLabel}" tabindex="-1" role="img">
  <title>${fullLabel}</title>
  <circle class="city-game-map-pin-dot" r="3.2" />
  <text class="city-game-map-pin-label" y="6.8" text-anchor="middle">${pinLabel}</text>
</g>`;
    })
    .join("");

  const layout = season.map_layout && typeof season.map_layout === "object" ? season.map_layout : {};
  const zoneRows = Array.isArray(layout.district_zones) ? layout.district_zones : [];
  const districtZones = zoneRows
    .map(
      (z) =>
        `<rect class="city-game-map-zone" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="2" />
<text class="city-game-map-zone-label" x="${z.x + 4}" y="${z.y + 8}">${escapeMapHtml(z.label ?? z.id ?? "")}</text>`
    )
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
export function buildMapNodeListHtml(season, launchCopy = resolveLaunchCopy(season)) {
  const rowHint = launchCopy.row_scan_hint?.trim() || MAP_ROW_SCAN_HINT;
  const spotlightId = comprehensionPrimaryNodeId(season);
  const rows = nodeRows(season);
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
          const scanUrl = row.scan_url && typeof row.scan_url === "string" ? row.scan_url.trim() : "";
          const mapsUrl = buildMapsSearchUrl(season, row);
          const liveLine = scanUrl
            ? `<a class="city-game-map-scan-link" href="${escapeMapHtml(scanUrl)}">Open live scan</a>`
            : `<span class="city-game-map-live-hint">${escapeMapHtml(rowHint)}</span>`;
          const role = escapeMapHtml(row.role ?? "");
          const spotlightClass =
            row.node_id === spotlightId ? " city-game-map-node-row--spotlight" : "";
          return `<li class="city-game-map-node-row${spotlightClass}" data-node-id="${escapeMapHtml(row.node_id)}" data-district="${escapeMapHtml(row.district ?? "")}" data-role="${role}" tabindex="0">
  <span class="city-game-map-node-title">${escapeMapHtml(row.label)}</span>
  <span class="city-game-map-node-meta">${escapeMapHtml(districtLabel)}</span>
  <span class="city-game-map-node-actions">
    <a class="city-game-map-maps-link" href="${escapeMapHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">Open in Maps</a>
    <span class="city-game-map-node-live">${liveLine}</span>
  </span>
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
      return `<li class="city-game-map-edge-row" data-edge-from="${escapeMapHtml(edge.from)}" data-edge-to="${escapeMapHtml(edge.to)}">
  <span class="city-game-map-edge-nodes">${escapeMapHtml(fromLabel)} → ${escapeMapHtml(toLabel)}</span>
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
 * @param {Record<string, unknown>} season
 * @param {ReturnType<typeof resolveMapCopy>} copy
 */
export function buildMapAdvancedHtml(season, copy) {
  const sketchSummary = copy.sketch_summary;
  return `<details class="city-game-map-advanced" id="city-game-map-advanced">
  <summary class="city-game-map-advanced-summary">${escapeMapHtml(copy.advanced_summary)}</summary>
  <div class="city-game-map-advanced-body">
    <section class="city-game-map-unlock" aria-labelledby="city-game-map-unlock-title">
      <h4 class="group-label" id="city-game-map-unlock-title">${escapeMapHtml(copy.section_goals_title)}</h4>
      ${buildUnlockEdgesHtml(season)}
      ${buildFinaleFootnoteHtml(season, copy)}
    </section>
    <details class="city-game-map-sketch-details" id="district-sketch">
      <summary class="city-game-map-sketch-summary">${escapeMapHtml(sketchSummary)}</summary>
      <div class="city-game-map-sketch-block">
        <figure class="city-game-map-figure">
          ${buildMapSchematicSvg(season)}
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
export function buildMapWhatChangedHtml(season, copy, launchCopy) {
  return `<details class="city-game-map-changed" id="city-game-map-changed">
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
 * @returns {string}
 */
export function buildMapBoardInnerHtml(season) {
  const copy = resolveMapCopy(season);
  const launchCopy = resolveLaunchCopy(season);
  const dense = isDenseMapBoard(season);
  const launchClass = isLaunchMapBoard(season) ? " city-game-map-board--launch" : "";
  const denseClass = dense ? " city-game-map-board--dense" : "";
  const primaryNode = isLaunchMapBoard(season) ? comprehensionPrimaryNodeId(season) : "";
  const primaryAttr = primaryNode
    ? ` data-primary-node="${escapeMapHtml(primaryNode)}"`
    : "";

  return `<div class="city-game-map-board${launchClass}${denseClass}" data-active-district="all" data-active-explore="all"${primaryAttr}>
  <section class="city-game-map-places city-game-map-places--primary" aria-labelledby="city-game-map-spotlight-title">
    ${buildMapFirstPaintHtml(season, launchCopy)}
    ${buildMapBrowseHtml(season, copy, launchCopy)}
  </section>
  ${buildMapWhatChangedHtml(season, copy, launchCopy)}
  ${buildMapAdvancedHtml(season, copy)}
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
 */
export function renderMapBoard(mount, season) {
  const layoutIssues = validateMapLayout(season);
  if (layoutIssues.length) {
    mount.innerHTML = `<p class="city-game-map-error" role="alert">City board unavailable: season map layout incomplete.</p>`;
    return { ok: false, issues: layoutIssues };
  }
  mount.innerHTML = buildMapBoardInnerHtml(season);
  return { ok: true, issues: [] };
}
