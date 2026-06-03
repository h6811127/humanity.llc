#!/usr/bin/env node
/**
 * C3 E2 — one-phone scenario HTTP baseline + optional sign-off.
 *
 *   npm run city-game:install-qa-scenario
 *   npm run city-game:install-qa-scenario -- --sign-off --apply
 *
 * Prerequisites: worker:dev + city-game:seed-local (same as city-game:smoke-local).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyInstallQaScenarioPass,
  formatInstallQaScenarioReport,
  installQaDocHasE2Pass,
  INSTALL_QA_REL,
  runInstallQaScenarioHttpChecks,
} from "./city-game-install-qa-scenario-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const installQaPath = join(root, INSTALL_QA_REL);
const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:8787").replace(/\/$/, "");
const signOff = process.argv.includes("--sign-off");
const skipHttp = process.argv.includes("--skip-http");
const apply = process.argv.includes("--apply");
let dateIso = new Date().toISOString().slice(0, 10);
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === "--date" && process.argv[i + 1]) {
    dateIso = process.argv[++i];
  }
}

async function main() {
  const installQaDoc = existsSync(installQaPath) ? readFileSync(installQaPath, "utf8") : "";

  if (signOff && apply && skipHttp) {
    writeFileSync(
      installQaPath,
      applyInstallQaScenarioPass(installQaDoc, { dateIso }),
      "utf8"
    );
    console.log("Updated:", INSTALL_QA_REL, "(E2)");
    console.log("✅ E2 scenario sign-off recorded (--skip-http).");
    return;
  }

  const health = await fetch(`${apiOrigin}/.well-known/hc/v1/health`).catch(() => null);
  if (!health?.ok) {
    console.error("Resolver not reachable at", apiOrigin);
    console.error("Start: npm run worker:dev  (or npm run city-game:dev -- --lan)");
    process.exit(1);
  }

  if (!existsSync(seedPath)) {
    console.error("Missing seed — npm run city-game:seed-local -- --write-season");
    process.exit(1);
  }

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const result = await runInstallQaScenarioHttpChecks({
    apiOrigin,
    nodes: seed.nodes ?? [],
  });

  console.log(
    formatInstallQaScenarioReport({
      ...result,
      e2SignedOff: installQaDocHasE2Pass(installQaDoc),
    })
  );

  if (!result.ok) {
    process.exit(1);
  }

  if (signOff && apply) {
    writeFileSync(
      installQaPath,
      applyInstallQaScenarioPass(installQaDoc, { dateIso }),
      "utf8"
    );
    console.log("\nUpdated:", INSTALL_QA_REL, "(E2)");
    console.log("✅ E2 scenario sign-off recorded.");
    return;
  }

  if (signOff && !apply) {
    console.log("\n(Dry run — add --apply to mark E2 in install QA doc.)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
