#!/usr/bin/env node
/**
 * Phase D launch surfaces — rules page (P3) + research banners (P4).
 *
 * Pre-launch (default):
 *   npm run city-game:launch-surfaces -- --check
 *
 * Launch day (after season dates + season root set):
 *   npm run city-game:launch-surfaces -- --apply
 *   npm run city-game:launch-surfaces -- --check --expect-applied
 *
 * Does NOT set CITY_GAME_ENABLED=1 — do that in wrangler.toml + deploy separately (E4).
 *
 * @see docs/CITY_GAME_LAUNCH_CHECKLIST.md
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { cityGameSeasonReadiness } from "./city-game-season-readiness.mjs";
import {
  RESEARCH_LAUNCH_PAGE_RELS,
  RULES_PAGE_REL,
  applyResearchPageLaunchPatches,
  applyRulesPageLaunchPatches,
  assessLaunchSurfacesApplied,
  assessLaunchSurfacesReady,
  rulesPageIsLaunchReady,
} from "./city-game-launch-surfaces-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");

const apply = process.argv.includes("--apply");
const check = process.argv.includes("--check") || !apply;
const expectApplied = process.argv.includes("--expect-applied");

function readRel(rel) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    throw new Error(`Missing file: ${rel}`);
  }
  return readFileSync(path, "utf8");
}

function usage() {
  console.log(`Usage:
  npm run city-game:launch-surfaces -- --check
  npm run city-game:launch-surfaces -- --apply
  npm run city-game:launch-surfaces -- --check --expect-applied

--check           Validate season + surface state (default)
--apply           Patch rules + research pages for public launch
--expect-applied  Fail if launch copy is not already applied

Does not enable CITY_GAME_ENABLED in wrangler.toml — see launch checklist E4.`);
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    usage();
    process.exit(0);
  }

  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const readiness = cityGameSeasonReadiness(season, { requireLaunch: apply || expectApplied });
  const surfaceReady = assessLaunchSurfacesReady(season);

  console.log("Cedar Rapids launch surfaces\n");
  console.log("Season:", season.season_id);

  if (readiness.issues.length) {
    console.log("\nSeason config issues:");
    for (const issue of readiness.issues) console.log(`  - ${issue}`);
    process.exit(1);
  }

  if (surfaceReady.issues.length && (apply || expectApplied)) {
    console.log("\nLaunch surface blockers:");
    for (const issue of surfaceReady.issues) console.log(`  - ${issue}`);
    process.exit(1);
  }

  const rulesHtml = readRel(RULES_PAGE_REL);
  const researchHtmlByRel = Object.fromEntries(
    RESEARCH_LAUNCH_PAGE_RELS.map((rel) => [rel, readRel(rel)])
  );

  if (expectApplied) {
    const { applied, issues } = assessLaunchSurfacesApplied(season, {
      rulesHtml,
      researchHtmlByRel,
    });
    if (!applied) {
      console.log("\nLaunch surfaces not applied:");
      for (const issue of issues) console.log(`  - ${issue}`);
      process.exit(1);
    }
    console.log("\n✅ Launch surfaces applied (rules + research pages).");
    process.exit(0);
  }

  if (check && !apply) {
    if (rulesHtml.includes("noindex") && rulesHtml.includes("Draft rules page")) {
      console.log("\n✓ Pre-launch state: rules page noindex + draft hint (expected).");
    } else if (rulesPageIsLaunchReady(rulesHtml)) {
      console.log("\n✓ Rules page appears launch-ready (noindex removed).");
    } else {
      console.log("\n⚠ Rules page is between draft and launch-ready — review manually.");
    }
    if (surfaceReady.issues.length) {
      console.log("\nBefore --apply, resolve:");
      for (const issue of surfaceReady.issues) console.log(`  - ${issue}`);
    } else {
      console.log("\nSeason window ready for --apply when launch checklist is signed.");
    }
    console.log("\nNext: E4 wrangler CITY_GAME_ENABLED=1 + deploy · P1/P2 human gates");
    process.exit(0);
  }

  if (apply) {
    const patches = [
      { rel: RULES_PAGE_REL, next: applyRulesPageLaunchPatches(rulesHtml, season) },
      ...RESEARCH_LAUNCH_PAGE_RELS.map((rel) => ({
        rel,
        next: applyResearchPageLaunchPatches(researchHtmlByRel[rel], season, rel),
      })),
    ];

    console.log("\nPlanned patches:");
    for (const { rel, next } of patches) {
      const before = rel === RULES_PAGE_REL ? rulesHtml : researchHtmlByRel[rel];
      console.log(`  ${before !== next ? "✎" : "·"} ${rel}`);
    }

    for (const { rel, next } of patches) {
      writeFileSync(join(root, rel), next);
    }

    console.log("\n✅ Wrote launch surfaces:");
    console.log("  -", RULES_PAGE_REL, "(removed noindex, live season window)");
    for (const rel of RESEARCH_LAUNCH_PAGE_RELS) {
      console.log("  -", rel);
    }
    console.log("\nStill required for launch day:");
    console.log("  - worker/wrangler.toml CITY_GAME_ENABLED=1 + Worker deploy (E4)");
    console.log("  - npm run build && Pages deploy");
    console.log("  - npm run city-game:launch-surfaces -- --check --expect-applied");
  }
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
