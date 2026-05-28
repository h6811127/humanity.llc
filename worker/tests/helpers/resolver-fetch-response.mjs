/**
 * Vitest fetch stub compatible with fetchResolverJson (Content-Type + status).
 * @param {unknown} body
 * @param {number} [status]
 */
export function resolverJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
