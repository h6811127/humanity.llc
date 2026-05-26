/**
 * Resolver health check for device shell (shared by coordinator + status chrome).
 */

/**
 * @param {string} apiOrigin
 * @returns {Promise<'ok' | 'degraded' | 'offline'>}
 */
export async function fetchResolverHealth(apiOrigin) {
  const url = new URL("/.well-known/hc/v1/health", apiOrigin).href;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.status === "degraded") return "degraded";
    return "ok";
  } catch {
    return "offline";
  } finally {
    clearTimeout(timer);
  }
}
