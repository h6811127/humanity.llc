/**
 * Jamie-friendly player onboarding from season JSON (multi-city).
 */

import { seasonSlugFromRulesPath } from "./city-game-season-path-shared.mjs";

const DEFAULT_STEPS = [
  {
    title: "No required first stop",
    body: "Walk until you spot a game sticker, or pick a place from the list below and head there — any sticker works.",
  },
  {
    title: "Planning from home",
    body: "Search place names in Apple Maps or Google Maps. The weekend board is a district sketch, not turn-by-turn directions.",
  },
];

const DEFAULT_HERO_SUBLINE =
  'Jump to the <a href="#city-state">place list</a> — all spots by district, with Open in Maps links (scan each sticker for live chips).';

/**
 * @param {Record<string, unknown>} season
 */
function nodeById(season, nodeId) {
  return (Array.isArray(season.nodes) ? season.nodes : []).find((row) => row.node_id === nodeId);
}

/**
 * @param {Record<string, unknown>} season
 */
function primaryQuorumNodeId(season) {
  const auto = season.automation;
  if (auto && typeof auto === "object") {
    const quorum = /** @type {string[]} */ (auto.quorum_nodes ?? []);
    if (quorum[0]) return quorum[0];
  }
  return null;
}

/**
 * @param {Record<string, unknown>} season
 */
export function resolvePlayerGuide(season) {
  const guide = season.player_guide && typeof season.player_guide === "object"
    ? /** @type {Record<string, unknown>} */ (season.player_guide)
    : {};

  const steps = Array.isArray(guide.steps) && guide.steps.length
    ? guide.steps.map((row) => ({
        title: String(row.title ?? "").trim(),
        body: String(row.body ?? "").trim(),
      })).filter((row) => row.title && row.body)
    : DEFAULT_STEPS.map((row) => ({ ...row }));

  let quorumSpot = null;
  if (guide.quorum_spot && typeof guide.quorum_spot === "object") {
    const q = /** @type {Record<string, string>} */ (guide.quorum_spot);
    if (q.title?.trim() && q.body?.trim()) {
      quorumSpot = { title: q.title.trim(), body: q.body.trim() };
    }
  }
  if (!quorumSpot) {
    const quorumId = primaryQuorumNodeId(season);
    const row = quorumId ? nodeById(season, quorumId) : null;
    if (row?.label) {
      quorumSpot = {
        title: String(row.label),
        body: "The shared quorum spot — scan there to see collective progress and add your visit with the site code on the sticker.",
      };
    }
  }

  const heroSubline =
    typeof guide.hero_subline === "string" && guide.hero_subline.trim()
      ? guide.hero_subline.trim()
      : DEFAULT_HERO_SUBLINE;

  return { steps, quorumSpot, heroSubline };
}

/**
 * @param {Record<string, unknown>} season
 */
export function buildPlayerGuideListHtml(season) {
  const { steps, quorumSpot } = resolvePlayerGuide(season);
  const items = [...steps];
  if (quorumSpot) items.push(quorumSpot);

  return items
    .map(
      (row) => `<li class="list-row">
  <span class="list-content">
    <span class="list-title">${escapeHtml(row.title)}</span>
    <span class="list-sub">${escapeHtml(row.body)}</span>
  </span>
</li>`
    )
    .join("");
}

/**
 * @param {Record<string, unknown>} season
 */
export function seasonComprehensionPath(season) {
  const rules = String(season.rules_path ?? "").trim() || "/play/cedar-rapids/";
  return rules.replace(/\/?$/, "/comprehension/");
}

/**
 * Default GT probe nodes: quorum, fragment, sanctuary, care — by role heuristics.
 * @param {Record<string, unknown>} season
 */
export function resolveComprehensionProbeNodes(season) {
  const kit = season.comprehension_kit;
  if (kit && typeof kit === "object" && Array.isArray(kit.probe_nodes) && kit.probe_nodes.length) {
    const blurbs = kit.blurbs && typeof kit.blurbs === "object" ? kit.blurbs : {};
    return kit.probe_nodes.map((nodeId) => {
      const id = String(nodeId);
      const row = nodeById(season, id);
      return {
        node_id: id,
        label: row?.label ?? id,
        blurb: typeof blurbs[id] === "string" ? blurbs[id] : "",
      };
    });
  }

  const rows = Array.isArray(season.nodes) ? season.nodes : [];
  const byRole = (role) => rows.find((row) => row.role === role);
  const quorumId = primaryQuorumNodeId(season);
  const picks = [
    { node_id: quorumId, blurb: "GT-1 / GT-2 — collective unlock + seed clue" },
    { node_id: byRole("lore_archive")?.node_id, blurb: "GT-4 — trust path (no account)" },
    { node_id: byRole("sanctuary")?.node_id, blurb: "GT-3 — sanctuary / regroup" },
    { node_id: byRole("care_loop")?.node_id, blurb: "GT-5 — care stream vs game bulletins" },
  ].filter((row) => row.node_id);

  return picks.map((row) => ({
    node_id: row.node_id,
    label: nodeById(season, row.node_id)?.label ?? row.node_id,
    blurb: row.blurb,
  }));
}

/**
 * @param {Record<string, unknown>} season
 */
export function comprehensionPrimaryNodeId(season) {
  const kit = season.comprehension_kit;
  if (kit && typeof kit === "object" && typeof kit.primary_scan_node === "string") {
    return kit.primary_scan_node.trim() || primaryQuorumNodeId(season);
  }
  return primaryQuorumNodeId(season) ?? "node_04";
}

/**
 * @param {Record<string, unknown>} season
 */
export function seasonPlaySlug(season) {
  return seasonSlugFromRulesPath(String(season.rules_path ?? "")) ?? "cedar-rapids";
}

/** Jamie GT wayfinding checks — W3 uses quorum spot from season JSON. */
export function buildJamieWayfindingChecks(season) {
  const { quorumSpot } = resolvePlayerGuide(season);
  const quorumName = quorumSpot?.title ?? "Quorum spot";
  return [
    {
      id: "GT-W1",
      prompt: "How would you start? (any sticker / place list — no required first stop)",
    },
    {
      id: "GT-W2",
      prompt: "Planning from home: maps app + place names — not numbered dots on the sketch",
    },
    {
      id: "GT-W3",
      prompt: `${quorumName}: find it via place list or Open in Maps — scan there for quorum mechanics`,
    },
  ];
}

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
