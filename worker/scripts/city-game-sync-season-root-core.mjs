const PRODUCTION_SCAN_ORIGIN_RE = /^https:\/\/(?:www\.)?humanity\.llc\//i;

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function collectSeasonScanUrls(value) {
  if (!value || typeof value !== "object") return [];
  /** @type {string[]} */
  const urls = [];
  const season = /** @type {Record<string, unknown>} */ (value);
  const charter =
    season.network_charter && typeof season.network_charter === "object"
      ? /** @type {Record<string, unknown>} */ (season.network_charter)
      : null;
  for (const candidate of [
    charter?.status_plate_scan_url,
    charter?.game_node_scan_url,
    ...(Array.isArray(season.nodes)
      ? season.nodes.map((node) =>
          node && typeof node === "object"
            ? /** @type {Record<string, unknown>} */ (node).scan_url
            : null
        )
      : []),
  ]) {
    if (typeof candidate === "string" && candidate.trim()) {
      urls.push(candidate.trim());
    }
  }
  return urls;
}

/**
 * @param {unknown} season
 */
export function seasonLooksProductionBound(season) {
  return collectSeasonScanUrls(season).some((url) => PRODUCTION_SCAN_ORIGIN_RE.test(url));
}

/**
 * @param {{ useProduction: boolean; forceLocal: boolean; season: unknown }} input
 */
export function shouldRefuseLocalSeasonRootSync(input) {
  return !input.useProduction && !input.forceLocal && seasonLooksProductionBound(input.season);
}

/**
 * @param {{
 *   season: Record<string, unknown>;
 *   seed: { profile_id?: string; nodes?: Array<Record<string, unknown>> };
 * }} input
 */
export function applySeasonRootSync(input) {
  const profileId = input.seed.profile_id?.trim();
  if (!profileId) {
    throw new Error("Seed has no profile_id");
  }

  const season = structuredClone(input.season);
  const previous =
    typeof season.season_root_profile_id === "string"
      ? season.season_root_profile_id.trim() || null
      : null;

  /** @type {Map<string, Record<string, unknown>>} */
  const seedByNode = new Map(
    (Array.isArray(input.seed.nodes) ? input.seed.nodes : [])
      .filter((row) => row?.node_id)
      .map((row) => [String(row.node_id), row])
  );

  let scanUrlsUpdated = 0;
  if (Array.isArray(season.nodes)) {
    for (const node of season.nodes) {
      if (!node || typeof node !== "object") continue;
      const row = /** @type {Record<string, unknown>} */ (node);
      const nodeId = String(row.node_id ?? "").trim();
      const seedRow = seedByNode.get(nodeId);
      const scanUrl = typeof seedRow?.scan_url === "string" ? seedRow.scan_url : "";
      if (!scanUrl) continue;
      if (row.scan_url !== scanUrl) {
        row.scan_url = scanUrl;
        scanUrlsUpdated += 1;
      }
      if (typeof seedRow?.qr_id === "string" && row.qr_id !== seedRow.qr_id) {
        row.qr_id = seedRow.qr_id;
      }
    }
  }

  const node04 = seedByNode.get("node_04");
  const node04ScanUrl = typeof node04?.scan_url === "string" ? node04.scan_url : "";
  if (
    node04ScanUrl &&
    season.network_charter &&
    typeof season.network_charter === "object"
  ) {
    /** @type {Record<string, unknown>} */ (season.network_charter).game_node_scan_url =
      node04ScanUrl;
  }

  season.season_root_profile_id = profileId;
  return { season, previous, profileId, scanUrlsUpdated };
}
