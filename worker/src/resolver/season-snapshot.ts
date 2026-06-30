import { listChildObjectsForParent } from "../db/child-objects";
import { listActiveChildObjectQrsForParent } from "../db/child-object-qr";
import {
  checkSeasonSnapshotRateLimit,
  hashIp,
} from "../db/rate-limit";
import type { Env } from "../env";
import { GAME_SEASON_ID_RE, isCityGameEnabled } from "../city-game/constants";
import { buildLiveMapHeadlines } from "../city-game/live-map-ticker";
import {
  buildMapNodeChips,
  deriveMapNodeSnapshot,
  type MapNodeChip,
  type MapNodeSnapshotRow,
} from "../city-game/map-node-snapshot";
import {
  seasonFinaleNodeId,
  seasonFragmentNodeIds,
  seasonNodeIdForObject,
  type CrSeasonConfig,
} from "../city-game/season-config";
import { publicUnlockEdges } from "../live-object/network-graph";
import { resolveSeasonById } from "../city-game/season-loader";
import { runRelayTerritoryDecayCron } from "../city-game/relay-decay-cron";
import {
  enforceGameSnapshotSeasonQuota,
  recordGameSnapshotSeasonUsage,
} from "../city-game/season-quota";
import { resolveSeasonWindowPhase } from "../city-game/season-window";
import { buildWitnessMetaByNodeId } from "../city-game/witness-gate";
import { buildSignalWarSnapshotSummary } from "../city-game/faction-network-score";
import { buildDualVictorySnapshot } from "../city-game/dual-victory";
import {
  filterNodesForMapBoard,
  rumoredNodeIdsForSeason,
  seasonMapVisibility,
} from "../city-game/map-fog-filter";
import {
  seasonRelayCapturePlayerEnabled,
} from "../city-game/season-config";
import { fragmentLatticeProgress } from "../city-game/unlock-engine";
import {
  ifNoneMatchSatisfied,
  weakEtagFromSerializedJson,
} from "../http/conditional-json";
import {
  clientIp,
  errorResponse,
  resolverHeaders,
} from "../http/resolver";

/** R-19 — colo-local snapshot cache (stale OK for map poll). */
const SNAPSHOT_CACHE_TTL_MS = 20_000;

type SnapshotCacheEntry = {
  serialized: string;
  etag: string;
  expiresAt: number;
};

const snapshotCache = new Map<string, SnapshotCacheEntry>();

function getCachedSnapshot(seasonId: string): SnapshotCacheEntry | null {
  const entry = snapshotCache.get(seasonId);
  if (!entry || Date.now() >= entry.expiresAt) {
    if (entry) snapshotCache.delete(seasonId);
    return null;
  }
  return entry;
}

function setCachedSnapshot(seasonId: string, serialized: string, etag: string): void {
  snapshotCache.set(seasonId, {
    serialized,
    etag,
    expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS,
  });
}

/** Test hook — clears colo-local snapshot cache between cases. */
export function resetSeasonSnapshotCacheForTests(): void {
  snapshotCache.clear();
}

function cachedSnapshotResponse(
  request: Request,
  entry: SnapshotCacheEntry
): Response {
  const headers = resolverHeaders({
    ETag: entry.etag,
    "Cache-Control": "public, max-age=15",
    "Content-Type": "application/json",
  });
  if (ifNoneMatchSatisfied(request, entry.etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(entry.serialized, { status: 200, headers });
}

export type SeasonSnapshotPublicNode = {
  node_id: string;
  label: string;
  district: string;
  role: string;
  lifecycle: MapNodeSnapshotRow["lifecycle"];
  map_mode: MapNodeSnapshotRow["map_mode"];
  public_state: string;
  route_open: boolean | null;
  scan_url: string | null;
  chips: MapNodeChip[];
};

function buildScanUrl(
  origin: string,
  profileId: string,
  qrId: string
): string {
  return `${origin.replace(/\/$/, "")}/c/${encodeURIComponent(profileId)}?q=${encodeURIComponent(qrId)}`;
}

function publicNodeRow(
  row: MapNodeSnapshotRow,
  seasonWindowPhase: ReturnType<typeof resolveSeasonWindowPhase>,
  scanUrl: string | null,
  rumored: Set<string>
): SeasonSnapshotPublicNode {
  return {
    node_id: row.node_id,
    label: row.label,
    district: row.district,
    role: row.role,
    lifecycle: row.lifecycle,
    map_mode: row.map_mode,
    public_state: row.public_state,
    route_open: row.route_open,
    scan_url: scanUrl,
    chips: buildMapNodeChips(row, seasonWindowPhase, { rumored }),
  };
}

function dedupeSnapshotHeadlines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function buildFinaleSummary(nodes: MapNodeSnapshotRow[], season: CrSeasonConfig) {
  const finaleId = seasonFinaleNodeId(season);
  const finale = nodes.find((row) => row.node_id === finaleId);
  const required = seasonFragmentNodeIds(season).length;
  if (!finale) {
    return {
      node_id: finaleId,
      fragments: { claimed: 0, required, complete: false },
      open: false,
    };
  }
  const fragmentIds = seasonFragmentNodeIds(season);
  const lattice = fragmentLatticeProgress(finale.game_meta, fragmentIds);
  return {
    node_id: finaleId,
    fragments: {
      claimed: lattice.claimed,
      required: lattice.required,
      complete: lattice.complete,
    },
    open: /finale switch live|alley arch is waking/i.test(finale.public_state),
  };
}

/**
 * GET /.well-known/hc/v1/seasons/{season_id}/snapshot
 * Read-only aggregate city state — no scan logging, no unlock repair.
 */
export async function handleGetSeasonSnapshot(
  request: Request,
  env: Env,
  seasonId: string
): Promise<Response> {
  if (!isCityGameEnabled(env)) {
    return errorResponse("NOT_FOUND", "Season snapshot unavailable.", 404);
  }
  if (!GAME_SEASON_ID_RE.test(seasonId)) {
    return errorResponse("NOT_FOUND", "Season not found.", 404);
  }
  const season = resolveSeasonById(seasonId);
  if (!season) {
    return errorResponse("NOT_FOUND", "Season not found.", 404);
  }
  if (!env.DB) {
    return errorResponse("SERVICE_UNAVAILABLE", "Database unavailable.", 503);
  }

  const ipHash = await hashIp(clientIp(request));
  const rate = await checkSeasonSnapshotRateLimit(env.DB, ipHash);
  if (!rate.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      "Too many snapshot requests from this network. Try again later.",
      429,
      rate.retryAfterSec ? { "Retry-After": String(rate.retryAfterSec) } : undefined
    );
  }

  const cached = getCachedSnapshot(seasonId);
  if (cached) {
    return cachedSnapshotResponse(request, cached);
  }

  const seasonQuota = await enforceGameSnapshotSeasonQuota(env.DB, season);
  if (seasonQuota) return seasonQuota;

  const now = new Date();
  await runRelayTerritoryDecayCron(env.DB, env, now, season);

  const origin = new URL(request.url).origin;
  const windowPhase = resolveSeasonWindowPhase(now, season);
  const nodes: MapNodeSnapshotRow[] = [];
  const scanUrlByNode = new Map<string, string>();
  const rootProfile = season.season_root_profile_id;
  if (rootProfile) {
    const [rows, activeQrs] = await Promise.all([
      listChildObjectsForParent(env.DB, rootProfile),
      listActiveChildObjectQrsForParent(env.DB, rootProfile),
    ]);
    for (const qr of activeQrs) {
      const nodeId = seasonNodeIdForObject(qr.object_id, season);
      if (!nodeId || scanUrlByNode.has(nodeId)) continue;
      scanUrlByNode.set(
        nodeId,
        buildScanUrl(origin, rootProfile, qr.qr_id)
      );
    }
    const witnessMetaByNodeId = buildWitnessMetaByNodeId(rows, season);
    for (const row of rows) {
      if (row.status !== "active") continue;
      const snap = deriveMapNodeSnapshot({
        child: row,
        season,
        env,
        now,
        witnessMetaByNodeId,
      });
      if (snap) nodes.push(snap);
    }
    nodes.sort((a, b) => a.node_id.localeCompare(b.node_id));
  }

  const signalWar = buildSignalWarSnapshotSummary({ nodes, season, now });
  const dualVictory = buildDualVictorySnapshot({
    nodes,
    factionPoints: signalWar.faction_network_points,
    season,
    now,
  });
  const boardNodes = filterNodesForMapBoard({ nodes, season, now });
  const mapVisibility = seasonMapVisibility(season);
  const rumored = rumoredNodeIdsForSeason(season, now);
  const rumoredIds = [...rumored].sort();
  const headlines = dedupeSnapshotHeadlines([
    ...dualVictory.summary_lines.slice(0, 1),
    ...signalWar.summary_lines.slice(0, 2),
    ...buildLiveMapHeadlines({ season, nodes, now }),
  ]);

  const body = {
    season_id: season.season_id,
    title: season.title?.trim() || "Wake the city · Signal War",
    window_phase: windowPhase,
    generated_at: now.toISOString(),
    map_visibility: mapVisibility,
    rumored_node_ids: rumoredIds,
    signal_war: {
      ...signalWar,
      player_capture_enabled: seasonRelayCapturePlayerEnabled(season),
      dual_victory: dualVictory,
    },
    headlines,
    nodes: boardNodes.map((row) =>
      publicNodeRow(row, windowPhase, scanUrlByNode.get(row.node_id) ?? null, rumored)
    ),
    unlock_edges: publicUnlockEdges(season.unlock_edges, (nodeId) => {
      const row = nodes.find((n) => n.node_id === nodeId);
      return row?.game_meta.unlocked_by ?? [];
    }),
    finale: buildFinaleSummary(nodes, season),
  };

  const serialized = JSON.stringify(body);
  const etag = await weakEtagFromSerializedJson(serialized);
  await recordGameSnapshotSeasonUsage(env.DB, seasonId);
  setCachedSnapshot(seasonId, serialized, etag);
  return cachedSnapshotResponse(request, {
    serialized,
    etag,
    expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS,
  });
}
