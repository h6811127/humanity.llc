/**
 * Resolver health check for device shell (shared by coordinator + status chrome).
 * @see docs/SITE_BUILD_VERSIONING.md — Phase 4 hub Worker line
 */
import { parseResolverHealthBuild } from "./build-meta-browser.mjs";

/**
 * @param {string} apiOrigin
 * @returns {Promise<{ ok: boolean; body: unknown } | null>}
 */
async function fetchHealthJson(apiOrigin) {
  const url = new URL("/.well-known/hc/v1/health", apiOrigin).href;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, body };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} apiOrigin
 * @returns {Promise<'ok' | 'degraded' | 'offline'>}
 */
export async function fetchResolverHealth(apiOrigin) {
  const result = await fetchHealthJson(apiOrigin);
  if (!result) return "offline";
  const body = /** @type {{ status?: string }} */ (result.body);
  if (!result.ok || body.status === "degraded") return "degraded";
  return "ok";
}

/**
 * @param {string} apiOrigin
 * @returns {Promise<import("./build-meta-browser.mjs").WorkerBuildMeta | null>}
 */
export async function fetchResolverHealthBuild(apiOrigin) {
  const result = await fetchHealthJson(apiOrigin);
  if (!result) return null;
  return parseResolverHealthBuild(result.body);
}
