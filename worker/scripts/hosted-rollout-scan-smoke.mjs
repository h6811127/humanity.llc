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
 */
export async function smokeProductionScanPage(
  apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "")
) {
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

/**
 * @param {string} [apiOrigin]
 */
export async function smokeProductionLiveControlChallenge(
  apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "")
) {
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
