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
 * @param {unknown} seed
 * @returns {string[]}
 */
export function collectSeedScanUrls(seed) {
  if (!seed || typeof seed !== "object") return [];
  const nodes = /** @type {{ nodes?: unknown }} */ (seed).nodes;
  if (!Array.isArray(nodes)) return [];
  /** @type {string[]} */
  const urls = [];
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const scanUrl = /** @type {Record<string, unknown>} */ (node).scan_url;
    if (typeof scanUrl === "string" && scanUrl.trim()) {
      urls.push(scanUrl.trim());
    }
  }
  return urls;
}

/**
 * Local seed-local defaults SCAN_ORIGIN to humanity.llc even against local D1, so
 * origin-alone checks are not enough — the profile path must match seed.profile_id.
 * @param {string} scanUrl
 * @param {string} profileId
 */
export function seedScanUrlEmbedsProfile(scanUrl, profileId) {
  const id = String(profileId ?? "").trim();
  if (!id || !scanUrl) return false;
  const encoded = encodeURIComponent(id);
  try {
    const url = new URL(scanUrl);
    const path = url.pathname.replace(/\/+$/, "");
    return (
      path === `/c/${id}` ||
      path === `/c/${encoded}` ||
      path.endsWith(`/c/${id}`) ||
      path.endsWith(`/c/${encoded}`)
    );
  } catch {
    return scanUrl.includes(`/c/${id}`) || scanUrl.includes(`/c/${encoded}`);
  }
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
 * Refuse `--write-season` that would overwrite a production-bound season root with a
 * local mint unless the operator explicitly opts into local URL rewrites.
 * Production mint (`--production-out`) remains allowed.
 * @param {{ productionOut: boolean; forceLocal: boolean; season: unknown }} input
 */
export function shouldRefuseLocalWriteSeason(input) {
  return !input.productionOut && !input.forceLocal && seasonLooksProductionBound(input.season);
}

/**
 * Guards for `sync-season-root -- --production` before rewriting committed season JSON.
 * Origin-only checks are insufficient: local seed-local often stamps humanity.llc URLs
 * for a local profile_id that does not exist on production D1.
 *
 * @param {{
 *   seed: { profile_id?: string; nodes?: Array<Record<string, unknown>> };
 *   season: Record<string, unknown>;
 *   force?: boolean;
 * }} input
 * @returns {{ ok: true; profileId: string } | { ok: false; code: string; message: string }}
 */
export function assessProductionSeedForSync(input) {
  const profileId =
    typeof input.seed?.profile_id === "string" ? input.seed.profile_id.trim() : "";
  if (!profileId) {
    return {
      ok: false,
      code: "SEED_MISSING_PROFILE",
      message: "Production seed has no profile_id.",
    };
  }

  const urls = collectSeedScanUrls(input.seed);
  if (urls.length === 0) {
    return {
      ok: false,
      code: "SEED_MISSING_SCAN_URLS",
      message: "Production seed has no node scan_url values.",
    };
  }

  for (const url of urls) {
    if (!PRODUCTION_SCAN_ORIGIN_RE.test(url)) {
      return {
        ok: false,
        code: "SEED_NON_PRODUCTION_URL",
        message: `Production sync refuses non-production scan_url: ${url}`,
      };
    }
    if (!seedScanUrlEmbedsProfile(url, profileId)) {
      return {
        ok: false,
        code: "SEED_PROFILE_URL_MISMATCH",
        message: `Production sync refuses scan_url that does not embed seed profile_id ${profileId}: ${url}`,
      };
    }
  }

  const previous =
    typeof input.season?.season_root_profile_id === "string"
      ? input.season.season_root_profile_id.trim()
      : "";
  if (previous && previous !== profileId && !input.force) {
    return {
      ok: false,
      code: "ROOT_PROFILE_CHANGE",
      message: `Refusing to change season_root_profile_id from ${previous} to ${profileId} without --force.`,
    };
  }

  return { ok: true, profileId };
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
