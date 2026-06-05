/**
 * Cedar Rapids city game — M1 static city state board (read-only).
 * @see docs/CITY_GAME_MAP_DASHBOARD.md · M4 interaction in city-game-map-interaction.mjs
 */

import {
  buildDistrictFilterHtml,
  isDenseMapBoard,
} from "./city-game-map-interaction-core.mjs";

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
  relay_gate: "Relay · gate",
  lore_archive: "Lore archive",
  sanctuary: "Sanctuary",
  temp_drop: "Temp drop",
  witness: "Witness seal",
  route_splitter: "Route splitter",
  finale: "Finale switch",
  care_loop: "Care loop",
  mobile_lore: "Mobile lore",
};

const DEFAULT_MAP_COPY = {
  title: "City state",
  subtitle: "Weekend board · read-only",
  hero_objective: "Find stickers around town. Scan them to move the city board.",
  live_hint: "Find stickers. Scan them. Help unlock city goals.",
  wayfinding_intro:
    "Start anywhere. Scan any game sticker you find. Planning from home? Search place names in your maps app; the sketch below is districts only, not streets.",
  diagram_note:
    "District sketch only. Not a street map. Names and Open in Maps links are how you find places.",
  privacy_note:
    "Same city truth for everyone. No account. No visit log. No GPS tracking.",
  unlock_intro:
    "Paths below wake when the city unlocks them together. Not when you personally check boxes.",
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
    live_hint: c.live_hint?.trim() || DEFAULT_MAP_COPY.live_hint,
    wayfinding_intro: c.wayfinding_intro?.trim() || DEFAULT_MAP_COPY.wayfinding_intro,
    diagram_note: c.diagram_note?.trim() || DEFAULT_MAP_COPY.diagram_note,
    privacy_note: c.privacy_note?.trim() || DEFAULT_MAP_COPY.privacy_note,
    unlock_intro: c.unlock_intro?.trim() || DEFAULT_MAP_COPY.unlock_intro,
  };
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
 * @param {string} nodeId
 */
function nodeTags(season, nodeId) {
  const tags = [];
  const auto = season.automation;
  if (auto && typeof auto === "object") {
    const a = /** @type {Record<string, unknown>} */ (auto);
    if (a.quorum_nodes?.includes?.(nodeId)) tags.push("Quorum");
    if (a.fragment_nodes?.includes?.(nodeId)) tags.push("Fragment");
    if (a.finale_node === nodeId) tags.push("Finale");
    if (a.witness_scarcity_node === nodeId) tags.push("Witness scarcity");
  }
  if (season.contribute_codes?.[nodeId]) tags.push("Site code");
  return tags;
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
      : `Schematic ${cityLabel} season nodes and unlock paths`;

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
export function buildMapNodeListHtml(season) {
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
      const items = byDistrict
        .get(district)
        .map((row) => {
          const roleLabel = CITY_GAME_ROLE_LABELS[row.role] ?? row.role;
          const districtLabel = CITY_GAME_DISTRICT_LABELS[row.district] ?? row.district;
          const tags = nodeTags(season, row.node_id);
          const tagHtml = tags.length
            ? `<span class="city-game-map-node-tags">${tags.map((t) => `<span class="city-game-map-tag">${escapeMapHtml(t)}</span>`).join("")}</span>`
            : "";
          const scanUrl = row.scan_url && typeof row.scan_url === "string" ? row.scan_url.trim() : "";
          const mapsUrl = buildMapsSearchUrl(season, row);
          const liveLine = scanUrl
            ? `<a class="city-game-map-scan-link" href="${escapeMapHtml(scanUrl)}">Open live scan</a>`
            : `<span class="city-game-map-live-hint">Scan sticker for live state</span>`;
          return `<li class="city-game-map-node-row" data-node-id="${escapeMapHtml(row.node_id)}" data-district="${escapeMapHtml(row.district ?? "")}" tabindex="0">
  <span class="city-game-map-node-title">${escapeMapHtml(row.label)}</span>
  <span class="city-game-map-node-meta">${escapeMapHtml(roleLabel)} · ${escapeMapHtml(districtLabel)}</span>
  ${tagHtml}
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
      const detail = edge.label ? escapeMapHtml(String(edge.label)) : "";
      return `<li class="city-game-map-edge-row" data-edge-from="${escapeMapHtml(edge.from)}" data-edge-to="${escapeMapHtml(edge.to)}">
  <span class="city-game-map-edge-nodes">${escapeMapHtml(fromLabel)} → ${escapeMapHtml(toLabel)}</span>
  ${detail ? `<span class="city-game-map-edge-detail">${detail}</span>` : ""}
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
  const mode =
    season?.signal_war &&
    typeof season.signal_war === "object" &&
    typeof /** @type {{ map_visibility?: string }} */ (season.signal_war).map_visibility ===
      "string"
      ? /** @type {{ map_visibility?: string }} */ (season.signal_war).map_visibility.trim()
      : "public";
  if (mode !== "signal_war" && mode !== "rumor_only") return "";
  const lead =
    mode === "rumor_only"
      ? "Board pins show rumored relays and faction holds only — scan to discover the rest."
      : "Board pins show owned relays, rumored hints, and cooperative nodes — unclaimed relays stay off the sketch.";
  return `<section class="city-game-map-fog" aria-labelledby="city-game-map-fog-title">
    <h3 class="group-label" id="city-game-map-fog-title">Signal War · fog</h3>
    <p class="group-intro short">${escapeMapHtml(lead)} Full place names stay in the district list below.</p>
  </section>`;
}

/**
 * @param {Record<string, unknown>} season
 * @returns {string}
 */
export function buildMapBoardInnerHtml(season) {
  const copy = resolveMapCopy(season);
  const dense = isDenseMapBoard(season);
  const denseClass = dense ? " city-game-map-board--dense" : "";
  const sketchOpenAttr = dense ? "" : " open";
  const sketchSummary = dense
    ? "District sketch (optional) — tap to expand schematic pins"
    : "District sketch";
  const fragmentCount = season.automation?.fragment_nodes?.length ?? 3;
  const finaleId = season.automation?.finale_node ?? "node_13";
  const finaleLabel =
    nodeRows(season).find((n) => n.node_id === finaleId)?.label ?? finaleId;

  return `<div class="city-game-map-board${denseClass}" data-active-district="all">
  <header class="city-game-map-header">
    <p class="city-game-map-eyebrow">${escapeMapHtml(copy.subtitle)}</p>
    <h2 class="city-game-map-title" id="city-state-title">${escapeMapHtml(copy.title)}</h2>
    <p class="city-game-map-lead">${escapeMapHtml(copy.live_hint)}</p>
    <p class="city-game-map-wayfinding">${escapeMapHtml(copy.wayfinding_intro)}</p>
    <p class="city-game-map-privacy">${escapeMapHtml(copy.privacy_note)} <a href="/data-policy.html">Data policy</a></p>
  </header>
  <section
    class="city-game-map-ticker"
    aria-labelledby="city-game-map-ticker-title"
    data-city-game-ticker
    data-season-id="${escapeMapHtml(String(season.season_id ?? "cr_season_01_wake"))}"
  >
    <h3 class="group-label" id="city-game-map-ticker-title">Live map flavor</h3>
    <ul
      id="city-game-live-map-ticker"
      class="guestbook-lines guestbook-lines-update"
      aria-label="Live city headlines"
      aria-live="polite"
    >
      <li>Loading weekend headlines…</li>
    </ul>
  </section>
  <section
    class="city-game-map-signal-war"
    id="city-game-map-signal-war"
    aria-labelledby="city-game-map-signal-war-title"
    hidden
  >
    <h3 class="group-label" id="city-game-map-signal-war-title">Signal War · network</h3>
    <ul
      id="city-game-map-signal-war-lines"
      class="guestbook-lines guestbook-lines-update"
      aria-label="Faction network totals"
    ></ul>
  </section>
  <div class="city-game-map-shell">
    <p class="city-game-map-sync" id="city-game-map-sync" aria-live="polite">Loading live city state…</p>
    <div class="city-game-map-list-panel" aria-labelledby="city-game-map-list-title">
      <h3 class="group-label city-game-map-list-title" id="city-game-map-list-title">Places by district</h3>
      ${buildDistrictFilterHtml(season)}
      ${buildMapNodeListHtml(season)}
    </div>
    <details class="city-game-map-sketch-details" id="district-sketch"${sketchOpenAttr}>
      <summary class="city-game-map-sketch-summary">${escapeMapHtml(sketchSummary)}</summary>
      <div class="city-game-map-sketch-block">
        <figure class="city-game-map-figure">
          ${buildMapSchematicSvg(season)}
          <figcaption class="city-game-map-figcaption">${escapeMapHtml(copy.diagram_note)} Live chips refresh from the season snapshot when the game is enabled.</figcaption>
        </figure>
      </div>
    </details>
  </div>
  <section class="city-game-map-unlock" aria-labelledby="city-game-map-unlock-title">
    <h3 class="group-label" id="city-game-map-unlock-title">Unlock paths</h3>
    <p class="group-intro short">${escapeMapHtml(copy.unlock_intro)}</p>
    ${buildUnlockEdgesHtml(season)}
    <p class="idea-footnote" id="city-game-map-finale-footnote"><strong>${escapeMapHtml(finaleLabel)}</strong> needs <strong>${fragmentCount}</strong> district fragments plus quorum and witness paths above.</p>
  </section>
  ${buildFogLegendHtml(season)}
  <section class="city-game-map-legend" aria-labelledby="city-game-map-legend-title">
    <h3 class="group-label" id="city-game-map-legend-title">Roles</h3>
    <ul class="tag-chips tag-chips-neutral" aria-label="Node role types">
      ${Object.entries(CITY_GAME_ROLE_LABELS)
        .map(([key, label]) => `<li data-role="${escapeMapHtml(key)}">${escapeMapHtml(label)}</li>`)
        .join("")}
    </ul>
  </section>
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
