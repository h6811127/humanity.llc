#!/usr/bin/env node
/**
 * WS-SW summer S4 — dual victory panel (**SW-13**).
 *   npm run city-game:scale-summer-s4
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateSeasonSummerS4 } from "./city-game-summer-s4-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const boardCorePath = join(root, "site/js/city-game-map-board-core.mjs");
const dualBoardPath = join(root, "site/js/city-game-dual-victory-board-core.mjs");

function main() {
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const result = validateSeasonSummerS4(season);

  console.log("WS-SW summer S4 — dual victory visible (SW-13)");
  console.log("  Board title:", season.signal_war?.dual_victory?.display?.board_title);

  const boardSrc = readFileSync(boardCorePath, "utf8");
  const dualSrc = readFileSync(dualBoardPath, "utf8");
  if (!boardSrc.includes("city-game-map-dual-victory-mount")) {
    result.issues.push("map-board missing #city-game-map-dual-victory-mount");
  }
  if (!dualSrc.includes("buildDualVictoryPanelHtml")) {
    result.issues.push("city-game-dual-victory-board-core.mjs missing panel builder");
  }

  /** @type {string[]} */
  const issues = [...result.issues];
  for (const i of issues) console.error("  fail:", i);

  if (!result.ok || issues.length > 0) {
    console.error("\n✗ summer S4 failed.");
    process.exit(1);
  }

  console.log("\n☑ summer S4 — dual_victory display + snapshot paths ready.");
  console.log("  Board: #city-game-map-dual-victory on /play/cedar-rapids/#city-state");
  console.log("  Doc: docs/CITY_GAME_SUMMER_MOMENTUM.md");
}

main();
