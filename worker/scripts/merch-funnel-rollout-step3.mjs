/**
 * Merch funnel close-out — step 3 (Worker API smoke).
 *
 * Verifies resolver health, print catalog, and artifact-intent route (not 405).
 *
 * Usage:
 *   npm run merch-funnel:rollout:step3
 *   npm run merch-funnel:rollout:step3 -- --preflight   # wrangler v1 route + Vitest (no API fetch)
 *   API_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:step3 -- --verify
 *   API_ORIGIN=http://127.0.0.1:8787 npm run merch-funnel:rollout:step3 -- --verify
 *
 * @see docs/MERCH_HEADLESS_COMMERCE.md § 4. Worker (middleware)
 */
import {
  assertMerchV1RouteInWrangler,
  runMerchRolloutPreflightVitest,
} from "./merch-funnel-rollout-preflight.mjs";

const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
const preflight = process.argv.includes("--preflight");
const verify = process.argv.includes("--verify");

function runPreflight() {
  console.log("Step 3 preflight — local Worker route gate (no API_ORIGIN fetch)\n");
  assertMerchV1RouteInWrangler();
  runMerchRolloutPreflightVitest();
  console.log("\n✅ Step 3 preflight OK.");
  console.log("Next:");
  console.log("  npm run worker:migrate:local && npm run worker:dev");
  console.log("  API_ORIGIN=http://127.0.0.1:8787 npm run merch-funnel:rollout:step3 -- --verify");
  console.log("  API_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:step3 -- --verify");
}

function printChecklist() {
  console.log("Step 3 — Worker API smoke\n");
  console.log("  0. Local preflight: npm run merch-funnel:rollout:step3 -- --preflight");
  console.log("  • GET /.well-known/hc/v1/health — database ok");
  console.log("  • GET /v1/print/catalog — approved templates");
  console.log("  • GET /v1/store/rows — story rows (SF-001)");
  console.log("  • GET /v1/store/products/tier0_glitch_hoodie_v1 — Glitch PDP catalog");
  console.log("  • POST /v1/store/artifact-intents — must not return 405 (route wired)");
  console.log("\nLocal dev:");
  console.log("  npm run worker:migrate:local && npm run worker:dev");
  console.log("  API_ORIGIN=http://127.0.0.1:8787 npm run merch-funnel:rollout:step3 -- --verify");
}

/**
 * @param {string} text
 */
function isCloudflareChallenge(text) {
  return text.includes("Just a moment") || text.includes("cf-chl");
}

/**
 * @param {string} label
 * @param {string} url
 * @param {RequestInit} [init]
 */
async function fetchJson(label, url, init) {
  console.log(`\n▶ ${label} (${url})`);
  const res = await fetch(url, init);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body, text };
}

async function smokeHealth() {
  const { res, body } = await fetchJson(
    "Health",
    `${apiOrigin}/.well-known/hc/v1/health`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) {
    console.error(`health failed (${res.status})`);
    process.exit(1);
  }
  if (body?.database === "schema_missing") {
    console.error("health.database is schema_missing — run: npm run worker:migrate:local (or remote)");
    process.exit(1);
  }
  console.log(`✓ health OK (status=${String(body?.status)}, database=${String(body?.database)})`);
  if (body?.build?.gitSha) {
    console.log(`  build.gitSha=${body.build.gitSha}`);
  }
}

async function smokePrintCatalog() {
  const { res, body, text } = await fetchJson(
    "Print catalog",
    `${apiOrigin}/v1/print/catalog`,
    { headers: { Accept: "application/json" } }
  );
  if (res.status === 403 && isCloudflareChallenge(text)) {
    console.warn(
      "⚠ print catalog blocked by Cloudflare bot challenge on /v1/* — smoke locally:\n" +
        "  API_ORIGIN=http://127.0.0.1:8787 npm run merch-funnel:rollout:step3 -- --verify"
    );
    return;
  }
  if (!res.ok) {
    console.error(`print catalog failed (${res.status})`);
    process.exit(1);
  }
  const templates = Array.isArray(body?.templates) ? body.templates : body?.products;
  if (!templates?.length) {
    console.error("print catalog returned no templates");
    process.exit(1);
  }
  const ids = templates.map((t) => t.template_id ?? t.id).filter(Boolean);
  console.log(`✓ print catalog OK (${ids.length} templates)`);
  for (const required of ["hc-sticker-square-v1", "hc-hoodie-live-object-v1"]) {
    if (!ids.includes(required)) {
      console.warn(`  ⚠ missing expected template ${required}`);
    }
  }
}

async function smokeArtifactIntentRoute() {
  const url = `${apiOrigin}/v1/store/artifact-intents`;
  const { res, text } = await fetchJson("Artifact intent route", url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: "{}",
  });
  if (res.status === 403 && isCloudflareChallenge(text)) {
    console.warn(
      "⚠ artifact-intents blocked by Cloudflare bot challenge — confirm route in worker/wrangler.toml;\n" +
        "  local smoke: API_ORIGIN=http://127.0.0.1:8787 npm run merch-funnel:rollout:step3 -- --verify"
    );
    return;
  }
  if (res.status === 405) {
    console.error(
      "artifact-intents returned 405 — humanity.llc/v1/* route missing from Worker (see worker/wrangler.toml)"
    );
    process.exit(1);
  }
  console.log(`✓ artifact-intents route wired (POST returned ${res.status}, expected 4xx not 405)`);
}

async function smokeStoreCatalog() {
  const rowsUrl = `${apiOrigin}/v1/store/rows`;
  const { res: rowsRes, body: rowsBody, text: rowsText } = await fetchJson(
    "Store rows",
    rowsUrl,
    { headers: { Accept: "application/json" } }
  );
  if (rowsRes.status === 403 && isCloudflareChallenge(rowsText)) {
    console.warn(
      "⚠ store rows blocked by Cloudflare bot challenge — smoke locally:\n" +
        "  API_ORIGIN=http://127.0.0.1:8787 npm run merch-funnel:rollout:step3 -- --verify"
    );
    return;
  }
  if (!rowsRes.ok) {
    const err =
      rowsBody && typeof rowsBody === "object" && rowsBody.error
        ? String(rowsBody.error)
        : String(rowsRes.status);
    console.error(
      `store rows failed (${rowsRes.status}, error=${err}) — wire GET /v1/store/rows in worker/src/index.ts`
    );
    process.exit(1);
  }
  if (!Array.isArray(rowsBody?.rows) || rowsBody.rows.length === 0) {
    console.error("store rows returned no published rows");
    process.exit(1);
  }
  console.log(`✓ store rows OK (${rowsBody.rows.length} rows)`);

  const glitchId = "tier0_glitch_hoodie_v1";
  const productUrl = `${apiOrigin}/v1/store/products/${glitchId}`;
  const { res: productRes, body: productBody, text: productText } = await fetchJson(
    "Store product (Glitch hoodie)",
    productUrl,
    { headers: { Accept: "application/json" } }
  );
  if (productRes.status === 403 && isCloudflareChallenge(productText)) {
    return;
  }
  if (!productRes.ok) {
    const err =
      productBody && typeof productBody === "object" && productBody.error
        ? String(productBody.error)
        : String(productRes.status);
    console.error(
      `store product failed (${productRes.status}, error=${err}) — wire GET /v1/store/products/{id} in worker/src/index.ts`
    );
    process.exit(1);
  }
  if (productBody?.product_id !== glitchId) {
    console.error(`store product mismatch (expected ${glitchId})`);
    process.exit(1);
  }
  console.log(`✓ store product OK (${productBody.title ?? glitchId})`);
}

async function main() {
  console.log("Merch funnel rollout — step 3 (Worker API smoke)");
  console.log("Docs: docs/MERCH_HEADLESS_COMMERCE.md § 4\n");

  if (preflight) {
    runPreflight();
    return;
  }

  if (!verify) {
    printChecklist();
    console.log("\n⏭  Run with --verify to smoke API_ORIGIN.");
    return;
  }

  await smokeHealth();
  await smokePrintCatalog();
  await smokeStoreCatalog();
  await smokeArtifactIntentRoute();

  console.log("\n✅ Step 3 complete. Next: npm run merch-funnel:rollout:step4");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
