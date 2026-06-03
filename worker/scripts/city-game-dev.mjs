#!/usr/bin/env node
/**
 * One-command Cedar Rapids local dev — env, migrate/seed (optional), worker + pages, hub, browser.
 *
 *   npm run city-game:dev              # laptop localhost
 *   npm run city-game:dev -- --bootstrap   # + migrate + seed if missing
 *   npm run city-game:dev -- --lan     # phone LAN (needs non-guest Wi‑Fi)
 *
 * @see docs/CITY_GAME_LOCAL_DEV.md
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildLanHubHtml, detectLanHostFromInterfaces } from "./city-game-lan-hub-core.mjs";
import {
  buildComprehensionKitHtml,
  resolveKitScanUrls,
} from "./city-game-comprehension-kit-core.mjs";
import {
  buildInstallQaWalkKitHtml,
  resolveInstallQaWalkNodes,
} from "./city-game-install-qa-walk-core.mjs";
import { ensureCityGameDevVars } from "./city-game-local-env-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const devVarsPath = join(root, "worker/.dev.vars");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const hubPath = join(root, "site/dev/city-game-lan-hub.html");
const comprehensionPath = join(root, "site/dev/city-game-comprehension.html");
const installQaWalkPath = join(root, "site/dev/city-game-install-qa-walk.html");

const bootstrap = process.argv.includes("--bootstrap");
const lanMode = process.argv.includes("--lan");
const noOpen = process.argv.includes("--no-open");

/** @type {import("node:child_process").ChildProcess[]} */
const children = [];

function runSync(label, cmd, args, env = process.env) {
  console.log(`\n=== ${label} ===\n`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function killPorts(ports) {
  for (const port of ports) {
    spawnSync("sh", ["-c", `lsof -ti :${port} 2>/dev/null | xargs kill -9 2>/dev/null || true`], {
      cwd: root,
      stdio: "ignore",
    });
  }
}

async function waitForOk(url, timeoutMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

function spawnDev(name, npmScript, extraArgs = []) {
  const child = spawn("npm", ["run", npmScript, "--", ...extraArgs], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`\n${name} exited with code ${code}`);
    }
  });
  children.push(child);
  return child;
}

function writeHub(host) {
  if (!existsSync(seedPath)) return null;
  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  if (!seed.profile_id || !Array.isArray(seed.nodes)) return null;

  const html = buildLanHubHtml({
    lanHost: host,
    profileId: seed.profile_id,
    nodes: seed.nodes,
    siteCodes: season.contribute_codes ?? {},
  });
  mkdirSync(dirname(hubPath), { recursive: true });
  writeFileSync(hubPath, html, "utf8");
  return `http://${host}:8788/dev/city-game-lan-hub`;
}

/** @returns {string | null} */
function writeComprehensionKit(host, hubUrl) {
  if (!existsSync(seedPath)) return null;
  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  if (!seed.profile_id || !Array.isArray(seed.nodes)) return null;

  const kitNodes = resolveKitScanUrls(seed.nodes, seed.profile_id, host);
  const html = buildComprehensionKitHtml({ host, hubUrl, kitNodes });
  mkdirSync(dirname(comprehensionPath), { recursive: true });
  writeFileSync(comprehensionPath, html, "utf8");
  return `http://${host}:8788/dev/city-game-comprehension`;
}

/** @returns {string | null} */
function writeInstallQaWalkKit(host) {
  if (!existsSync(seedPath)) return null;
  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  if (!seed.profile_id || !Array.isArray(seed.nodes)) return null;

  const nodes = resolveInstallQaWalkNodes(seed.nodes, seed.profile_id, host);
  const html = buildInstallQaWalkKitHtml(nodes, { host });
  mkdirSync(dirname(installQaWalkPath), { recursive: true });
  writeFileSync(installQaWalkPath, html, "utf8");
  return `http://${host}:8788/dev/city-game-install-qa-walk`;
}

function openUrl(url) {
  if (noOpen || !url) return;
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [url], { stdio: "ignore", shell: process.platform === "win32" });
}

function shutdown() {
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function main() {
  console.log("Cedar Rapids city game — local dev\n");

  const lanHost = lanMode ? detectLanHostFromInterfaces(networkInterfaces()) : "127.0.0.1";
  if (lanMode && !lanHost) {
    console.error("Could not detect LAN IP for --lan. Use non-guest Wi‑Fi or a hotspot.");
    process.exit(1);
  }

  const prior = existsSync(devVarsPath) ? readFileSync(devVarsPath, "utf8") : "";
  const envPatch = ensureCityGameDevVars(prior, { host: lanHost, lan: lanMode });
  writeFileSync(devVarsPath, envPatch.text, "utf8");
  console.log("✓ worker/.dev.vars", envPatch.resolverOrigin, envPatch.pagesOrigin);

  if (bootstrap) {
    runSync("D1 migrate", "npm", ["run", "worker:migrate:local"]);
    runSync("child-object QR schema", "npm", ["run", "worker:apply-child-object-qr-schema"]);
  }

  killPorts([8787, 8788]);

  const workerScript = lanMode ? "worker:dev:lan" : "worker:dev";
  const pagesScript = lanMode ? "pages:dev:lan" : "pages:dev";

  console.log("\nStarting worker + pages (Ctrl+C stops both)…\n");
  spawnDev("worker", workerScript, ["--inspector-port", "9230"]);
  await new Promise((r) => setTimeout(r, 1500));
  spawnDev("pages", pagesScript, ["--inspector-port", "9231"]);

  const workerOk = await waitForOk(`${envPatch.resolverOrigin}/.well-known/hc/v1/health`);
  if (!workerOk) {
    console.error("\nWorker did not become ready on", envPatch.resolverOrigin);
    shutdown();
  }
  console.log("✓ Worker ready");

  if (bootstrap && !existsSync(seedPath)) {
    runSync("seed local season", "npm", ["run", "city-game:seed-local", "--", "--write-season"], {
      ...process.env,
      API_ORIGIN: envPatch.resolverOrigin,
    });
  }

  const pagesOk = await waitForOk(`${envPatch.pagesOrigin}/`);
  if (!pagesOk) {
    console.error("\nPages did not become ready on", envPatch.pagesOrigin);
    shutdown();
  }
  console.log("✓ Pages ready");

  const hubUrl = writeHub(envPatch.host);
  if (hubUrl) {
    console.log("\n📋 Scan hub (tap links — no copy/paste):");
    console.log("  ", hubUrl);
    const comprehensionUrl = writeComprehensionKit(envPatch.host, hubUrl);
    if (comprehensionUrl) {
      console.log("\n📝 GT comprehension kit (Phase D human gate):");
      console.log("  ", comprehensionUrl);
    }
    const walkUrl = writeInstallQaWalkKit(envPatch.host);
    if (walkUrl) {
      console.log("\n📱 Install QA walk kit (C3 · 3 phones × 15 nodes):");
      console.log("  ", walkUrl);
    }
    openUrl(hubUrl);
  } else if (bootstrap) {
    console.warn("\n⚠ No hub — seed missing. Re-run with --bootstrap or npm run city-game:seed-local -- --write-season");
  } else {
    console.warn("\n⚠ No hub — seed missing. Run: npm run city-game:dev -- --bootstrap");
  }

  if (lanMode) {
    console.warn(
      "\n⚠ Guest/corp Wi‑Fi often blocks phones from reaching your laptop. If phones fail, use home Wi‑Fi or a hotspot."
    );
  }

  console.log("\nRunning. Ctrl+C to stop both servers.");
}

main().catch((err) => {
  console.error(err);
  shutdown();
});
