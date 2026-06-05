/**
 * Production fetch helper for GitHub Actions post-deploy verify.
 *
 * Custom domain (humanity.llc) may return 403 from Cloudflare bot/WAF rules on
 * GitHub Actions runner IPs. CI sends a dedicated User-Agent + optional bypass
 * header; falls back to the Pages preview host when blocked.
 *
 * @see docs/CLOUDFLARE_CI_SECRETS.md § Post-deploy verify (WAF)
 */

export const CI_DEPLOY_VERIFY_HEADER = "X-HC-Deploy-Verify";
export const CI_DEPLOY_VERIFY_USER_AGENT = "humanity-llc-ci-deploy-verify/1";

const DEFAULT_SITE_ORIGIN = "https://humanity.llc";
const DEFAULT_PAGES_ORIGIN = "https://humanity-llc.pages.dev";

/**
 * @param {string} bodyText
 * @returns {boolean}
 */
export function isCloudflareBotChallengeBody(bodyText) {
  return bodyText.includes("Just a moment") || bodyText.includes("cf-chl");
}

/**
 * @returns {Record<string, string>}
 */
export function buildCiDeployVerifyHeaders() {
  /** @type {Record<string, string>} */
  const headers = {
    "User-Agent": CI_DEPLOY_VERIFY_USER_AGENT,
  };
  const secret = process.env.HC_CI_VERIFY_SECRET?.trim();
  if (secret) {
    headers[CI_DEPLOY_VERIFY_HEADER] = secret;
  }
  return headers;
}

/**
 * @param {string} [envOrigin]
 * @param {string} [fallbackEnv]
 * @returns {string[]}
 */
export function resolveCiSiteOrigins(envOrigin, fallbackEnv) {
  const primary = (envOrigin || process.env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN).replace(/\/$/, "");
  const fallback = (fallbackEnv || process.env.HC_CI_PAGES_ORIGIN || DEFAULT_PAGES_ORIGIN).replace(
    /\/$/,
    ""
  );
  return primary === fallback ? [primary] : [primary, fallback];
}

/**
 * @param {Response} res
 * @param {string} text
 * @returns {boolean}
 */
export function shouldRetryCiProductionFetch(res, text) {
  if (res.status === 403) return true;
  if (!res.ok && isCloudflareBotChallengeBody(text)) return true;
  return false;
}

/**
 * @param {string} path
 * @param {{ accept?: string, origins?: string[], redirect?: RequestRedirect }} [opts]
 * @returns {Promise<{ res: Response, text: string, url: string, origin: string }>}
 */
export async function fetchCiProductionUrl(path, opts = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origins = opts.origins ?? resolveCiSiteOrigins();
  const headers = {
    ...buildCiDeployVerifyHeaders(),
    Accept: opts.accept ?? "*/*",
  };

  /** @type {string | null} */
  let lastFailure = null;

  for (let index = 0; index < origins.length; index += 1) {
    const origin = origins[index];
    const url = `${origin}${normalizedPath}`;
    const res = await fetch(url, { headers, redirect: opts.redirect ?? "follow" });
    const text = await res.text();

    if (res.ok) {
      if (index > 0) {
        console.warn(
          `⚠ Primary origin blocked by WAF; verified via Pages preview (${origin}).\n` +
            "  Add HC_CI_VERIFY_SECRET + Cloudflare WAF skip rule to verify humanity.llc directly."
        );
      }
      return { res, text, url, origin };
    }

    if (shouldRetryCiProductionFetch(res, text) && index < origins.length - 1) {
      lastFailure = `${url} → ${res.status} ${res.statusText}`;
      continue;
    }

    return { res, text, url, origin };
  }

  throw new Error(lastFailure ?? "CI production fetch failed");
}
