/**
 * Production scan page smoke — catches Error 1101 when D1 lacks qr_credentials.object_id.
 *
 * @see docs/SCAN_WORKER_1101_POSTMORTEM.md
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
