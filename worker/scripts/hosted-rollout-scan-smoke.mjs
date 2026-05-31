/**
 * Production scan page smoke — catches Error 1101 when D1 lacks qr_credentials.object_id.
 * Live-control smoke — catches FK drift on live_control_challenges after qr_credentials rebuild.
 *
 * @see docs/SCAN_WORKER_1101_POSTMORTEM.md
 * @see docs/LIVE_PROOF_FAILURE_INVESTIGATION.md
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const showcasePath = path.join(repoRoot, "site/data/showcase-status-plate.json");

/**
 * @param {string} apiOrigin
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function resolveScanSmokeUrl(apiOrigin, env = process.env) {
  const override = env.ROLLOUT_SCAN_SMOKE_URL?.trim();
  if (override) {
    return override.replace(/\/$/, "");
  }

  const origin = apiOrigin.replace(/\/$/, "");
  const data = JSON.parse(readFileSync(showcasePath, "utf8"));
  if (typeof data.scan_url === "string" && data.scan_url.trim()) {
    const url = new URL(data.scan_url);
    return `${origin}${url.pathname}${url.search}`;
  }

  const profileId = data.profile_id;
  const qrId = data.qr_id;
  if (!profileId || !qrId) {
    throw new Error("showcase-status-plate.json missing profile_id or qr_id");
  }
  return `${origin}/c/${profileId}?q=${encodeURIComponent(qrId)}`;
}

/**
 * @param {number} status
 * @param {string} bodyText
 * @returns {boolean}
 */
export function scanPageSmokeFailure(status, bodyText) {
  if (status >= 500) return true;
  if (/error code:\s*1101/i.test(bodyText)) return true;
  if (/Worker threw exception/i.test(bodyText)) return true;
  return false;
}

/**
 * @param {string} [apiOrigin]
 * @param {{ verifyHardening?: boolean }} [opts]
 */
export async function smokeProductionScanPage(
  apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, ""),
  opts = {}
) {
  const verifyHardening = opts.verifyHardening ?? false;
  const url = resolveScanSmokeUrl(apiOrigin);
  console.log(`\n▶ Smoke scan page (${url})`);
  const res = await fetch(url, {
    headers: { Accept: "text/html" },
    redirect: "follow",
  });
  const text = await res.text();
  if (scanPageSmokeFailure(res.status, text)) {
    console.error(
      `scan page smoke failed (${res.status}) — possible Worker 1101 / schema drift (missing object_id)`
    );
    console.error("Run: npm run worker:migrate:remote");
    console.error("See: docs/SCAN_WORKER_1101_POSTMORTEM.md");
    process.exit(1);
  }
  if (verifyHardening) {
    const missing = scanPageLiveControlHardeningMissing(text);
    if (missing.length) {
      console.error(
        `scan page missing live-control hardening markers (H-01/H-03): ${missing.join(", ")}`
      );
      console.error("Deploy worker with Slice A scan-html changes before printed QA.");
      process.exit(1);
    }
    console.log("scan page live-control hardening markers OK (H-01/H-03)");
  }
  console.log(`scan page OK (${res.status})`);
}

/**
 * @param {string} apiOrigin
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ profileId: string, qrId: string }}
 */
export function resolveLiveControlSmokeIds(apiOrigin, env = process.env) {
  const data = JSON.parse(readFileSync(showcasePath, "utf8"));
  const profileId = data.profile_id?.trim();
  const qrId = data.qr_id?.trim();
  if (!profileId || !qrId) {
    throw new Error("showcase-status-plate.json missing profile_id or qr_id");
  }
  void apiOrigin;
  void env;
  return { profileId, qrId };
}

/**
 * Operator URLs for H-12 pre-flight step 3 (two-browser loop).
 *
 * @param {string} apiOrigin
 * @param {NodeJS.ProcessEnv} [env]
 */
export function resolvePrintedQaOperatorUrls(apiOrigin, env = process.env) {
  const origin = apiOrigin.replace(/\/$/, "");
  const { profileId, qrId } = resolveLiveControlSmokeIds(origin, env);
  const scanUrl = resolveScanSmokeUrl(origin, env);
  const createdUrl = `${origin}/created/?profile_id=${encodeURIComponent(profileId)}&qr_id=${encodeURIComponent(qrId)}`;
  return { scanUrl, createdUrl, profileId, qrId };
}

/**
 * Canonical HTTPS scan URL encoded on printed QRs.
 *
 * @param {string} origin
 * @param {string} profileId
 * @param {string} qrId
 */
export function buildCanonicalPrintScanUrl(origin, profileId, qrId) {
  const base = origin.replace(/\/$/, "");
  return `${base}/c/${encodeURIComponent(profileId)}?q=${encodeURIComponent(qrId)}`;
}

/**
 * Validates scan URL before print (H-12 pre-flight step 4).
 *
 * @param {string} scanUrl
 * @param {{ profileId?: string; qrId?: string; expectedOrigin?: string }} [opts]
 * @returns {string[]}
 */
export function validatePrintScanUrl(scanUrl, opts = {}) {
  const { profileId, qrId, expectedOrigin } = opts;
  const issues = [];
  if (typeof scanUrl !== "string" || !scanUrl.trim()) {
    issues.push("scan URL is empty");
    return issues;
  }
  if (/^hc:\/\//i.test(scanUrl.trim())) {
    issues.push("must not use hc:// scheme — print HTTPS resolver URL only");
  }
  let parsed;
  try {
    parsed = new URL(scanUrl.trim());
  } catch {
    issues.push("invalid URL");
    return issues;
  }
  if (parsed.protocol !== "https:") {
    issues.push("URL must use HTTPS");
  }
  if (expectedOrigin && parsed.origin !== expectedOrigin.replace(/\/$/, "")) {
    issues.push(`origin must be ${expectedOrigin.replace(/\/$/, "")}, got ${parsed.origin}`);
  }
  const pathProfile = parsed.pathname.startsWith("/c/")
    ? decodeURIComponent(parsed.pathname.slice(3))
    : "";
  if (!pathProfile) {
    issues.push("path must be /c/{profile_id}");
  }
  const q = parsed.searchParams.get("q")?.trim() ?? "";
  if (!q.startsWith("qr_")) {
    issues.push("query q must be a qr_… credential id");
  }
  if (profileId && pathProfile !== profileId) {
    issues.push(`profile_id mismatch (expected ${profileId})`);
  }
  if (qrId && q !== qrId) {
    issues.push(`qr_id mismatch (expected ${qrId}, got ${q || "missing"})`);
  }
  return issues;
}

/**
 * @param {string} bodyText
 * @returns {boolean}
 */
export function isCloudflareBotChallengeBody(bodyText) {
  return bodyText.includes("Just a moment") || bodyText.includes("cf-chl");
}

/**
 * @param {number} status
 * @param {string} bodyText
 * @returns {boolean}
 */
export function liveControlChallengeSmokeFailure(status, bodyText) {
  if (status >= 500) return true;
  if (/error code:\s*1101/i.test(bodyText)) return true;
  if (/Worker threw exception/i.test(bodyText)) return true;
  return false;
}

/** H-01/H-03 client hardening markers expected in production scan HTML. */
export const SCAN_PAGE_LIVE_CONTROL_HARDENING_MARKERS = [
  "parseLiveControlJsonResponse",
  "Could not create live proof request.",
  "Having trouble checking proof status. Tap to retry.",
  'id="live-control-poll-retry"',
];

/**
 * @param {string} html
 * @returns {string[]}
 */
export function scanPageLiveControlHardeningMissing(html) {
  return SCAN_PAGE_LIVE_CONTROL_HARDENING_MARKERS.filter((marker) => !html.includes(marker));
}

/**
 * @param {number} status
 * @param {string} bodyText
 * @returns {string[]}
 */
export function liveControlChallengeResponseIssues(status, bodyText) {
  const issues = [];
  if (liveControlChallengeSmokeFailure(status, bodyText)) {
    issues.push(`HTTP ${status} or Cloudflare 1101 HTML body (H-02)`);
    return issues;
  }
  if (status !== 201) {
    issues.push(`expected HTTP 201, got ${status}`);
    return issues;
  }
  try {
    const body = JSON.parse(bodyText);
    if (typeof body.challenge_id !== "string" || !body.challenge_id) {
      issues.push("missing challenge_id in JSON body");
    }
    if (typeof body.status_url !== "string" || !body.status_url) {
      issues.push("missing status_url in JSON body");
    }
  } catch {
    issues.push("challenge POST body is not JSON (H-02)");
  }
  return issues;
}

/**
 * @param {string} [apiOrigin]
 * @param {{ verifyJson?: boolean }} [opts]
 */
export async function smokeProductionLiveControlChallenge(
  apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, ""),
  opts = {}
) {
  const verifyJson = opts.verifyJson ?? false;
  const { profileId, qrId } = resolveLiveControlSmokeIds(apiOrigin);
  const url = `${apiOrigin}/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/live-control/challenges`;
  console.log(`\n▶ Smoke live-control challenge POST (${url})`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      qr_id: qrId,
      client_origin: apiOrigin,
    }),
  });
  const text = await res.text();
  if (res.status === 403 && isCloudflareBotChallengeBody(text)) {
    console.warn(
      "⚠ live-control challenge blocked by Cloudflare bot challenge — skipped in CI.\n" +
        "  Verify locally: API_ORIGIN=http://127.0.0.1:8787 npm run hosted:rollout:step4 -- --verify"
    );
    return;
  }
  if (verifyJson) {
    const issues = liveControlChallengeResponseIssues(res.status, text);
    if (issues.length) {
      console.error(`live-control challenge smoke failed: ${issues.join("; ")}`);
      console.error("Run: npm run worker:repair-live-control-challenges-fk -- --remote");
      console.error("See: docs/LIVE_PROOF_FAILURE_INVESTIGATION.md");
      process.exit(1);
    }
    console.log("live-control challenge JSON OK (H-02)");
    console.log(`live-control challenge OK (${res.status})`);
    return;
  }
  if (liveControlChallengeSmokeFailure(res.status, text)) {
    console.error(
      `live-control challenge smoke failed (${res.status}) — possible FK drift on live_control_challenges`
    );
    console.error("Run: npm run worker:repair-live-control-challenges-fk -- --remote");
    console.error("See: docs/LIVE_PROOF_FAILURE_INVESTIGATION.md");
    process.exit(1);
  }
  if (res.status !== 201) {
    console.error(`live-control challenge smoke failed (${res.status}): ${text.slice(0, 200)}`);
    process.exit(1);
  }
  console.log(`live-control challenge OK (${res.status})`);
}
