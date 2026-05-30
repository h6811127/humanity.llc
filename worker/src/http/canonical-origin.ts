/**
 * Canonical production host redirect (RC-13).
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md RC-13
 */

export const CANONICAL_SITE_HOST = "humanity.llc";

export function shouldRedirectWwwToCanonical(hostname: string): boolean {
  return hostname === `www.${CANONICAL_SITE_HOST}`;
}

export function buildCanonicalRedirectUrl(url: URL): string {
  return `https://${CANONICAL_SITE_HOST}${url.pathname}${url.search}${url.hash}`;
}

/**
 * @param {Request} request
 */
export function maybeCanonicalOriginRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  if (!shouldRedirectWwwToCanonical(url.hostname)) return null;
  return new Response(null, {
    status: 301,
    headers: {
      Location: buildCanonicalRedirectUrl(url),
      "Cache-Control": "public, max-age=86400",
    },
  });
}
