/**
 * Redirect ban for public scan routes (SCANNER_EXPERIENCE Phase E).
 */

import { htmlResponse } from "../http/resolver";

const REDIRECT_QUERY_KEYS = new Set([
  "redirect",
  "url",
  "next",
  "continue",
  "dest",
  "destination",
  "goto",
  "return",
  "return_to",
  "u",
  "link",
  "out",
]);

export function scanRedirectQueryBlocked(url: URL): boolean {
  for (const key of url.searchParams.keys()) {
    if (REDIRECT_QUERY_KEYS.has(key.toLowerCase())) return true;
  }
  return false;
}

function isExternalLocation(location: string, requestUrl: string): boolean {
  try {
    const target = new URL(location, requestUrl);
    const origin = new URL(requestUrl).origin;
    return target.origin !== origin;
  } catch {
    return false;
  }
}

/**
 * Scan HTML/JSON MUST NOT redirect scanners off-origin (hidden redirect ban).
 */
export function guardScanResponse(request: Request, response: Response): Response {
  if (response.status < 300 || response.status >= 400) return response;
  const location = response.headers.get("Location");
  if (!location || !isExternalLocation(location, request.url)) return response;

  return htmlResponse(
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>Redirect blocked · humanity.llc</title></head><body><main><h1>Redirect blocked</h1><p>Humanity scan pages do not send you to external sites automatically. If an owner shared a link, open it only after reviewing the interstitial on <code>/c/…/out</code>.</p><p><a href="${escapeAttr(new URL(request.url).origin)}">Back to humanity.llc</a></p></main></body></html>`,
    403,
    { "Cache-Control": "no-store", "X-HC-Scan-Redirect-Blocked": "1" }
  );
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
