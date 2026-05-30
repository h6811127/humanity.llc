/**
 * Parse pasted humanity.llc scan URLs for hub same-tab open (PWA handoff).
 */

const PROFILE_ID_RE = /^[1-9A-HJ-NP-Za-km-z]{20,64}$/;

/**
 * @param {string | null | undefined} hostname
 */
export function isHumanityScanHost(hostname) {
  const host = String(hostname ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  return host === "humanity.llc" || host === "127.0.0.1" || host === "localhost";
}

/**
 * @param {string | null | undefined} raw
 * @param {string} [defaultOrigin]
 * @returns {string | null}
 */
export function parseHumanityScanUrl(raw, defaultOrigin = "https://humanity.llc") {
  const input = String(raw ?? "").trim();
  if (!input) return null;

  if (PROFILE_ID_RE.test(input)) {
    return new URL(`/c/${input}`, defaultOrigin).href;
  }

  try {
    const url = new URL(input, defaultOrigin);
    if (!isHumanityScanHost(url.hostname)) return null;
    const match = url.pathname.match(/^\/c\/([^/?#]+)/);
    if (!match?.[1] || !PROFILE_ID_RE.test(match[1])) return null;
    return url.href;
  } catch {
    return null;
  }
}
