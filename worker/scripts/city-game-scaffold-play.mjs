#!/usr/bin/env node
/**
 * Scaffold portable play rules pages from season JSON.
 *
 *   npm run city-game:scaffold-play -- --slug example-city --check
 *   npm run city-game:scaffold-play -- --season example_city_season_01 --apply
 *   npm run city-game:scaffold-play -- --all --check
 *
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § Phase E · Rules page generator
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  listSeasonJsonBasenames,
  loadSeasonJsonFile,
  resolveSeasonConfigFile,
  resolveSeasonPathFromCli,
  seasonLaunchContext,
} from "../../site/js/city-game-season-path-core.mjs";
import {
  PILOT_PLAY_SLUG,
  buildPlayPageHtml,
  seasonWantsAutoRulesPage,
  verifyPlayPageHtml,
} from "./city-game-scaffold-play-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const apply = process.argv.includes("--apply");
const check = process.argv.includes("--check") || !apply;
const all = process.argv.includes("--all");
const force = process.argv.includes("--force");

function usage() {
  console.log(`Usage:
  npm run city-game:scaffold-play -- --season <season_id> [--apply|--check]
  npm run city-game:scaffold-play -- --slug <play-slug> [--apply|--check]
  npm run city-game:scaffold-play -- --all [--apply|--check]

--apply   Write site/play/{slug}/index.html
--check   Verify page exists and matches season (default)
--all     Every season with auto_rules_page: true
--force   Allow overwriting ${PILOT_PLAY_SLUG} pilot page`);
}

/**
 * @returns {Array<{ basename: string; config: Record<string, unknown> }>}
 */
function resolveTargets() {
  if (all) {
    return listSeasonJsonBasenames(root)
      .map((basename) => ({
        basename,
        config: loadSeasonJsonFile(root, basename),
      }))
      .filter(({ config }) => seasonWantsAutoRulesPage(config));
  }

  const seasonPath = resolveSeasonPathFromCli(root);
  const basename = seasonPath.split("/").pop() ?? "";
  return [{ basename, config: JSON.parse(readFileSync(seasonPath, "utf8")) }];
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    usage();
    process.exit(0);
  }

  const targets = resolveTargets();
  if (!targets.length) {
    console.error("No seasons matched. Use --season, --slug, or --all with auto_rules_page seasons.");
    process.exit(1);
  }

  let failed = false;

  for (const { basename, config } of targets) {
    const ctx = seasonLaunchContext(config, basename);
    const outPath = join(root, ctx.rulesPageRel);
    const html = buildPlayPageHtml(config, basename);
    const verify = verifyPlayPageHtml(html, config);

    console.log(`\n${config.season_id} → ${ctx.rulesPageRel}`);

    if (ctx.slug === PILOT_PLAY_SLUG && apply && !force) {
      console.error(`  ✗ Refusing to overwrite pilot page without --force`);
      failed = true;
      continue;
    }

    if (apply) {
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, html, "utf8");
      console.log(`  ✓ Wrote ${ctx.rulesPageRel}`);
    }

    if (check) {
      if (existsSync(outPath)) {
        const onDisk = readFileSync(outPath, "utf8");
        const diskVerify = verifyPlayPageHtml(onDisk, config);
        if (diskVerify.ok) {
          console.log("  ✓ On-disk page matches season contract");
        } else {
          console.log("  ✗ On-disk page issues:");
          for (const issue of diskVerify.issues) console.log(`    · ${issue}`);
          if (!apply) failed = true;
        }
      } else if (!apply) {
        console.log("  ✗ Missing on-disk page (run with --apply)");
        failed = true;
      }

      if (!verify.ok) {
        console.log("  ✗ Generated HTML issues:");
        for (const issue of verify.issues) console.log(`    · ${issue}`);
        failed = true;
      } else if (apply) {
        console.log("  ✓ Generated HTML passes contract");
      }
    }
  }

  if (failed) process.exit(1);

  console.log("\nNext:");
  console.log("  npm run city-game:build-registry");
  console.log("  npm run city-game:comprehension-kit -- --production --season <id>");
  console.log("  npm run verify:city-game");
}

main();
