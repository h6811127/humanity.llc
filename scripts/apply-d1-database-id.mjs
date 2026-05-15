/**
 * Ensures wrangler.toml has a real D1 database_id before deploy.
 *
 * - If database_id is already a UUID, exits 0.
 * - If D1_DATABASE_ID is set to a UUID, substitutes it (CI / Cloudflare Builds).
 * - Otherwise prints how to fix Cloudflare validation errors (e.g. 10021) and exits 1.
 *
 * IMPORTANT (Workers Builds / Git): the default deploy command is `npx wrangler deploy`,
 * which does NOT run npm lifecycle hooks — `predeploy` is never executed. Run this
 * script from the Build command and/or chain it in the Deploy command. See README.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const WRANGLER = resolve(process.cwd(), "wrangler.toml");
const PLACEHOLDER = "REPLACE_WITH_wrangler_d1_create_output";
/** Loose UUID match (Cloudflare D1 uses standard UUID strings). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isWorkersCi =
  process.env.WORKERS_CI === "1" ||
  process.env.WORKERS_CI === "true" ||
  process.env.CI === "true";

function readDatabaseId(toml) {
  const m = toml.match(/^\s*database_id\s*=\s*"([^"]*)"/m);
  return m?.[1]?.trim() ?? "";
}

const toml = readFileSync(WRANGLER, "utf8");
const current = readDatabaseId(toml);
const fromEnv = process.env.D1_DATABASE_ID?.trim();

if (current && current !== PLACEHOLDER && UUID_RE.test(current)) {
  process.exit(0);
}

if (fromEnv && UUID_RE.test(fromEnv)) {
  const next = toml.replace(
    /^(\s*database_id\s*=\s*")[^"]*(")/m,
    `$1${fromEnv}$2`
  );
  if (next === toml) {
    console.error("apply-d1-database-id: could not find database_id in wrangler.toml");
    process.exit(1);
  }
  writeFileSync(WRANGLER, next, "utf8");
  console.log("apply-d1-database-id: wrote D1_DATABASE_ID into wrangler.toml for this deploy.");
  process.exit(0);
}

const workersBuildsHint = isWorkersCi
  ? `
You are on Cloudflare Workers Builds (WORKERS_CI is set). The dashboard default deploy
command is "npx wrangler deploy", which does NOT run npm "predeploy".

Do one of the following in the dashboard (Worker → Settings → Builds):

  A) Build command (recommended): after dependencies install, inject the ID before deploy:
       npm run cf:inject-d1
     (If your build command is empty, set it to the above, or prepend to an existing
     build step. Ensure "Build variables and secrets" includes D1_DATABASE_ID.)

  B) Deploy command: chain the injector before Wrangler:
       npm run cf:inject-d1 && npx wrangler deploy

  C) Commit the real database_id in wrangler.toml on main (no env var needed).

Put D1_DATABASE_ID under Builds → "Build variables and secrets" (build-time), not only
Worker runtime "Variables" unless you know they are exported to the deploy step.
`
  : "";

console.error(`
apply-d1-database-id: D1 binding has no valid database_id (Cloudflare API often reports
this as error 10021: binding DB of type d1 must have a valid database_id).

${workersBuildsHint}
Otherwise (local / any CI):

  1) Paste your D1 UUID into wrangler.toml (replace ${PLACEHOLDER})
     — output of: npx wrangler d1 create humanity-commons
     — or list:  npx wrangler d1 list

  2) Or export D1_DATABASE_ID=<uuid> then run this script again (or "npm run deploy",
     which runs it via predeploy).

See: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
     https://developers.cloudflare.com/d1/get-started/
`);
process.exit(1);
