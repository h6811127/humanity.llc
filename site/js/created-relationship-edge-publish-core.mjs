/**
 * Build signed RelationshipEdge payloads from unlock_edges season draft (OG-2 / WS-E).
 * @see docs/WS_OBJECT_GRAPH_V1.md
 */

import { resolveSeasonTemplateRows } from "./city-game-season-template-core.mjs";
import {
  normalizeUnlockEdgesDraft,
  validateUnlockEdgesDraft,
} from "./created-child-object-game-node-unlock-edges-core.mjs";

export const RELATIONSHIP_EDGE_KIND_WITNESSES = "witnesses";
export const RELATIONSHIP_EDGE_KIND_UNLOCKS = "unlocks";

const EDGE_ID_RE = /^edge_[A-Za-z0-9_-]{4,76}$/;

/**
 * @param {string} seasonId
 */
function seasonToken(seasonId) {
  const raw = String(seasonId ?? "")
    .trim()
    .toLowerCase();
  if (raw.startsWith("cr_season")) return "cr";
  return raw
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
}

/**
 * @param {string} nodeId
 */
function nodeToken(nodeId) {
  return String(nodeId ?? "")
    .trim()
    .replace(/^node_/, "")
    .replace(/[^a-z0-9]+/gi, "");
}

/**
 * @param {string} seasonId
 * @param {string} fromNodeId
 * @param {string} toNodeId
 * @param {"witnesses" | "unlocks"} kind
 */
export function relationshipEdgeIdFromDraft(seasonId, fromNodeId, toNodeId, kind) {
  const kindToken = kind === RELATIONSHIP_EDGE_KIND_WITNESSES ? "witness" : "unlock";
  const base = `edge_${seasonToken(seasonId)}_${kindToken}_${nodeToken(fromNodeId)}_${nodeToken(toNodeId)}`;
  const safe = base.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80);
  if (!EDGE_ID_RE.test(safe)) {
    return `edge_${kindToken}_${nodeToken(fromNodeId)}_${nodeToken(toNodeId)}`.slice(0, 80);
  }
  return safe;
}

/**
 * @param {Array<{ node_id: string; role?: string; label?: string }>} templateRows
 * @param {string} fromNodeId
 * @param {{ label?: string }} [edgeDraft]
 */
export function resolveRelationshipEdgeKind(templateRows, fromNodeId, edgeDraft) {
  const fromTemplate = templateRows.find((row) => row.node_id === fromNodeId);
  if (fromTemplate?.role === "witness") return RELATIONSHIP_EDGE_KIND_WITNESSES;
  const label = String(edgeDraft?.label ?? fromTemplate?.label ?? "").toLowerCase();
  if (/\b(witness|vouch)\b/.test(label)) return RELATIONSHIP_EDGE_KIND_WITNESSES;
  return RELATIONSHIP_EDGE_KIND_UNLOCKS;
}

/**
 * WS-OBJECT-GRAPH-V1 scope: witness gates + quorum unlock paths on scan.
 * Fragment → finale edges stay in game_meta only (not signed RelationshipEdge).
 *
 * @param {Record<string, unknown>} season
 * @param {Array<{ from: string; to: string; label?: string }>} unlockEdges
 * @param {Array<{ node_id: string; role?: string; label?: string }>} templateRows
 */
export function filterUnlockEdgesForScanGraphPublish(season, unlockEdges, templateRows) {
  const quorum = new Set(
    (Array.isArray(season?.automation?.quorum_nodes)
      ? /** @type {string[]} */ (season.automation.quorum_nodes)
      : []
    ).map((nodeId) => String(nodeId).trim()).filter(Boolean)
  );
  return unlockEdges.filter((edge) => {
    const kind = resolveRelationshipEdgeKind(templateRows, edge.from, edge);
    if (kind === RELATIONSHIP_EDGE_KIND_WITNESSES) return true;
    return quorum.has(edge.from);
  });
}

/**
 * @param {Array<{ node_id: string; object_id?: string }>} templateRows
 * @param {string} nodeId
 */
export function objectIdForTemplateNode(templateRows, nodeId) {
  const row = templateRows.find((entry) => entry.node_id === nodeId);
  return row?.object_id ? String(row.object_id).trim() : "";
}

/**
 * @param {{
 *   profileId: string;
 *   seasonId: string;
 *   templateRows: Array<{ node_id: string; object_id?: string; role?: string; label?: string }>;
 *   edge: { from: string; to: string; label?: string };
 *   createdAt?: string;
 * }} input
 */
export function buildRelationshipEdgeUnsignedFromUnlockDraft(input) {
  const fromObjectId = objectIdForTemplateNode(input.templateRows, input.edge.from);
  const toObjectId = objectIdForTemplateNode(input.templateRows, input.edge.to);
  if (!fromObjectId || !toObjectId) {
    return {
      ok: false,
      message: `Missing object_id for ${input.edge.from} → ${input.edge.to}. Register template nodes on Live first.`,
    };
  }

  const kind = resolveRelationshipEdgeKind(input.templateRows, input.edge.from, input.edge);
  const edgeId = relationshipEdgeIdFromDraft(
    input.seasonId,
    input.edge.from,
    input.edge.to,
    kind
  );
  const label =
    String(input.edge.label ?? "").trim() ||
    `${input.edge.from} opens ${input.edge.to}`;

  const pathRef = {
    from_node_id: input.edge.from,
    to_node_id: input.edge.to,
  };

  const base = {
    version: "1.0",
    type: "relationship_edge",
    edge_id: edgeId,
    kind,
    network_id: input.seasonId,
    steward_profile_id: input.profileId,
    from: { ref: "object_id", id: fromObjectId },
    to: { ref: "object_id", id: toObjectId },
    label,
    status: "active",
    created_at: input.createdAt ?? new Date().toISOString(),
  };

  if (kind === RELATIONSHIP_EDGE_KIND_WITNESSES) {
    return { ok: true, unsigned: { ...base, witness: pathRef } };
  }
  return { ok: true, unsigned: { ...base, unlock: pathRef } };
}

/**
 * @param {{
 *   profileId: string;
 *   seasonId: string;
 *   templateRows: Array<{ node_id: string; object_id?: string; role?: string; label?: string }>;
 *   unlockEdges: Array<{ from: string; to: string; label?: string }>;
 *   createdAt?: string;
 * }} input
 */
export function buildRelationshipEdgesFromUnlockDraft(input) {
  /** @type {Array<{ edge_id: string; kind: string; unsigned: Record<string, unknown> }>} */
  const built = [];
  /** @type {string[]} */
  const issues = [];

  for (const edge of input.unlockEdges) {
    const result = buildRelationshipEdgeUnsignedFromUnlockDraft({
      profileId: input.profileId,
      seasonId: input.seasonId,
      templateRows: input.templateRows,
      edge,
      createdAt: input.createdAt,
    });
    if (!result.ok) {
      issues.push(result.message);
      continue;
    }
    built.push({
      edge_id: String(result.unsigned.edge_id),
      kind: String(result.unsigned.kind),
      unsigned: result.unsigned,
    });
  }

  if (!built.length && input.unlockEdges.length) {
    return { ok: false, issues, edges: [] };
  }
  return { ok: issues.length === 0, issues, edges: built };
}

/**
 * @param {{
 *   season: Record<string, unknown>;
 *   profileId: string;
 *   seasonId: string;
 *   templateRows: Array<{ node_id: string; object_id?: string; role?: string; label?: string }>;
 *   unlockEdges: Array<{ from: string; to: string; label?: string }>;
 *   createdAt?: string;
 * }} input
 */
export function buildScanGraphRelationshipEdgesFromUnlockDraft(input) {
  const scoped = filterUnlockEdgesForScanGraphPublish(
    input.season,
    input.unlockEdges,
    input.templateRows
  );
  return buildRelationshipEdgesFromUnlockDraft({
    profileId: input.profileId,
    seasonId: input.seasonId,
    templateRows: input.templateRows,
    unlockEdges: scoped,
    createdAt: input.createdAt,
  });
}

/**
 * @param {Array<{ edge_id: string; status?: string }>} liveEdges
 * @param {string} edgeId
 */
export function liveRelationshipEdgeStatus(liveEdges, edgeId) {
  const row = liveEdges.find((entry) => entry.edge_id === edgeId);
  if (!row) return "missing";
  return row.status === "revoked" ? "revoked" : "active";
}

/**
 * Compare unlock_edges draft to active relationship edges on Live.
 * @param {{
 *   profileId: string;
 *   seasonId: string;
 *   templateRows: Array<{ node_id: string; object_id?: string; role?: string; label?: string }>;
 *   unlockEdges: Array<{ from: string; to: string; label?: string }>;
 *   liveEdges?: Array<{ edge_id?: string; status?: string }>;
 *   season?: Record<string, unknown>;
 * }} input
 */
export function assessScanGraphPublish(input) {
  const unlockEdges = input.season
    ? filterUnlockEdgesForScanGraphPublish(input.season, input.unlockEdges, input.templateRows)
    : input.unlockEdges;

  const built = buildRelationshipEdgesFromUnlockDraft({
    profileId: input.profileId,
    seasonId: input.seasonId,
    templateRows: input.templateRows,
    unlockEdges,
  });

  /** @type {string[]} */
  const issues = [...built.issues];
  const expectedEdgeIds = built.edges.map((row) => row.edge_id);

  if (!unlockEdges.length) {
    return {
      ready: false,
      expectedEdgeIds,
      missingEdgeIds: [],
      publishedEdgeIds: [],
      issues: input.season
        ? [
            "Add witness or quorum unlock edges before publishing the scan graph (fragment → finale paths use game_meta only).",
          ]
        : ["Add at least one unlock edge before publishing the scan graph."],
    };
  }

  if (!built.edges.length) {
    return {
      ready: false,
      expectedEdgeIds,
      missingEdgeIds: [],
      publishedEdgeIds: [],
      issues: issues.length ? issues : ["Could not build relationship edges from draft."],
    };
  }

  const live = Array.isArray(input.liveEdges) ? input.liveEdges : null;
  if (!live) {
    return {
      ready: null,
      expectedEdgeIds,
      missingEdgeIds: expectedEdgeIds,
      publishedEdgeIds: [],
      issues,
    };
  }

  const liveActive = new Set(
    live
      .filter((row) => row?.status !== "revoked" && row?.edge_id)
      .map((row) => String(row.edge_id))
  );
  const missingEdgeIds = expectedEdgeIds.filter((edgeId) => !liveActive.has(edgeId));
  const publishedEdgeIds = expectedEdgeIds.filter((edgeId) => liveActive.has(edgeId));

  for (const edgeId of missingEdgeIds) {
    issues.push(`Scan graph edge not published on Live: ${edgeId}`);
  }

  return {
    ready: missingEdgeIds.length === 0 && issues.length === built.issues.length,
    expectedEdgeIds,
    missingEdgeIds,
    publishedEdgeIds,
    issues,
  };
}

/**
 * @param {Record<string, unknown>} season
 * @param {Record<string, unknown> | null | undefined} publishDraft
 */
export function assessUnlockGraphForStaging(season, publishDraft = null) {
  const templateRows = resolveSeasonTemplateRows(season);
  const edges = normalizeUnlockEdgesDraft(
    publishDraft && "unlock_edges" in publishDraft
      ? publishDraft.unlock_edges
      : season.unlock_edges
  );
  if (!edges.length) {
    return {
      ready: false,
      issues: [
        "No unlock_edges — add at least one route edge on /created/ (Route unlock edges) or in metadata draft.",
      ],
    };
  }
  const validation = validateUnlockEdgesDraft(templateRows, edges);
  return { ready: validation.ok, issues: validation.issues };
}

/**
 * Browser-safe scan graph staging check (no Node-only imports).
 *
 * @param {Record<string, unknown>} season
 * @param {Record<string, unknown> | null | undefined} publishDraft
 * @param {Array<{ edge_id?: string; status?: string }> | null | undefined} liveEdges
 * @param {string | null | undefined} [profileIdOverride]
 */
export function assessScanGraphPublishForStaging(
  season,
  publishDraft = null,
  liveEdges = null,
  profileIdOverride = null
) {
  const templateRows = resolveSeasonTemplateRows(season);
  const profileId = String(
    profileIdOverride ??
      publishDraft?.season_root_profile_id ??
      season.season_root_profile_id ??
      ""
  ).trim();
  const edges = normalizeUnlockEdgesDraft(
    publishDraft && "unlock_edges" in publishDraft
      ? publishDraft.unlock_edges
      : season.unlock_edges
  );
  const graph = assessUnlockGraphForStaging(season, publishDraft);
  if (!graph.ready) {
    return { ready: false, issues: graph.issues };
  }
  if (!profileId) {
    return {
      ready: null,
      issues: ["Pass --profile-id to verify scan graph edges are published on Live."],
    };
  }
  const publish = assessScanGraphPublish({
    profileId,
    seasonId: String(season.season_id ?? "").trim(),
    templateRows,
    unlockEdges: edges,
    liveEdges: liveEdges ?? undefined,
    season,
  });
  if (publish.ready === null) {
    return {
      ready: null,
      issues: ["Network relationship-edges check skipped."],
      expectedEdgeIds: publish.expectedEdgeIds,
      missingEdgeIds: publish.missingEdgeIds,
    };
  }
  return {
    ready: publish.ready,
    issues: publish.issues,
    expectedEdgeIds: publish.expectedEdgeIds,
    missingEdgeIds: publish.missingEdgeIds,
    publishedEdgeIds: publish.publishedEdgeIds,
  };
}
