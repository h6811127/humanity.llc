#!/usr/bin/env node
/**
 * Generate a tap-friendly phone hub for local Cedar Rapids scans.
 *
 * Prerequisites:
 *   worker/.local/city-game-seed.json (npm run city-game:seed-local)
 *   pages:dev + worker:dev with --ip 0.0.0.0 for phone access
 *
 * Usage:
 *   npm run city-game:lan-hub
 *   npm run city-game:lan-hub -- --write-dev-vars
 *   LAN_HOST=192.168.1.42 npm run city-game:lan-hub
 *
 * Open on phone (one bookmark):
 *   http://<LAN>:8788/dev/city-game-lan-hub.html
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildLanHubHtml,
  detectLanHostFromInterfaces,
  normalizeLanHost,
  patchDevVarsScanOrigins,
} from "./city-game-lan-hub-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const devVarsPath = join(root, "worker/.dev.vars");
const outDir = join(root, "site/dev");
const outPath = join(outDir, "city-game-lan-hub.html");

function resolveLanHost() {
  const lanIdx = process.argv.indexOf("--lan");
  if (lanIdx !== -1) {
    const next = process.argv[lanIdx + 1]?.trim();
    if (next && !next.startsWith("-")) return normalizeLanHost(next);
  }
  if (process.env.LAN_HOST?.trim()) return normalizeLanHost(process.env.LAN_HOST);
  if (process.argv.includes("--lan") || !process.argv.includes("--host")) {
    return detectLanHostFromInterfaces(networkInterfaces());
  }
  const hostIdx = process.argv.indexOf("--host");
  if (hostIdx !== -1) {
    const next = process.argv[hostIdx + 1]?.trim();
    if (next) return normalizeLanHost(next);
  }
  return detectLanHostFromInterfaces(networkInterfaces());
}

function main() {
  if (!existsSync(seedPath)) {
    console.error("Missing seed file:", seedPath);
    console.error("Run: API_ORIGIN=http://127.0.0.1:8787 npm run city-game:seed-local -- --write-season");
    process.exit(1);
  }

  const lanHost = resolveLanHost();
  if (!lanHost) {
    console.error("Could not detect LAN IP. Pass --host 192.168.x.x or LAN_HOST=…");
    process.exit(1);
  }

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  if (!seed.profile_id || !Array.isArray(seed.nodes)) {
    console.error("Invalid seed shape — re-run city-game:seed-local");
    process.exit(1);
  }

  const html = buildLanHubHtml({
    lanHost,
    profileId: seed.profile_id,
    nodes: seed.nodes,
    siteCodes: season.contribute_codes ?? {},
  });

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, html, "utf8");

  const hubUrl = `http://${lanHost}:8788/dev/city-game-lan-hub.html`;
  console.log("Cedar Rapids local scan hub\n");
  console.log("LAN host:", lanHost);
  console.log("Wrote:", outPath);
  console.log("\n📱 Open on each phone (bookmark this):");
  console.log("  ", hubUrl);

  if (/guest|isolated|portal/i.test(process.env.WIFI_SSID ?? "")) {
    console.warn("\n⚠ Guest/captive Wi‑Fi often blocks phone → laptop traffic (AP isolation).");
    console.warn("  Use a phone hotspot, non-guest Wi‑Fi, or USB tethering if devices cannot connect.");
  }
  console.warn(
    "\n⚠ If the IP changed (new network), re-run this command and restart worker:dev:lan + pages:dev:lan."
  );

  if (process.argv.includes("--write-dev-vars")) {
    const prior = existsSync(devVarsPath) ? readFileSync(devVarsPath, "utf8") : "";
    writeFileSync(devVarsPath, patchDevVarsScanOrigins(prior, lanHost), "utf8");
    console.log("\n✓ Updated worker/.dev.vars SCAN_* origins — restart worker:dev");
  } else {
    console.log("\nDev vars (or re-run with --write-dev-vars):");
    console.log(`  SCAN_RESOLVER_ORIGIN=http://${lanHost}:8787`);
    console.log(`  SCAN_PAGES_JS_ORIGIN=http://${lanHost}:8788`);
  }

  console.log("\nStart dev on all interfaces:");
  console.log("  npm run worker:dev:lan");
  console.log("  npm run pages:dev:lan");
}

main();
