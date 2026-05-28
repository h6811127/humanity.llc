/**
 * Aggregate device-local pilot summary JSON files for founder field notes.
 *
 * Usage:
 *   node worker/scripts/aggregate-pilot-summaries.mjs path/to/summary1.json path/to/summary2.json
 *   cat summaries/*.json | node worker/scripts/aggregate-pilot-summaries.mjs -
 *
 * @see docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md § Step 9
 */
import { readFileSync } from "node:fs";

import {
  aggregatePilotSummaries,
  formatPilotRollupReport,
  parsePilotSummary,
} from "../../site/js/pilot-summary-aggregate.mjs";

/**
 * @param {string} text
 * @param {string} [label]
 */
function loadSummary(text, label) {
  try {
    return parsePilotSummary(text.trim());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${label ?? "input"}: ${msg}`);
  }
}

/**
 * @param {string[]} chunks
 */
function loadFromStdin(chunks) {
  const text = chunks.join("");
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) throw new Error("stdin: expected JSON array");
    return parsed.map((row, i) => {
      const json = JSON.stringify(row);
      return loadSummary(json, `stdin[${i}]`);
    });
  }
  return [loadSummary(trimmed, "stdin")];
}

async function main() {
  const args = process.argv.slice(2);
  /** @type {import("../../site/js/pilot-summary-aggregate.mjs").PilotSummary[]} */
  const rows = [];

  if (args.length === 0 || (args.length === 1 && args[0] === "-")) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(String(chunk));
    rows.push(...loadFromStdin(chunks));
  } else {
    for (const path of args) {
      if (path === "-") continue;
      rows.push(loadSummary(readFileSync(path, "utf8"), path));
    }
  }

  if (!rows.length) {
    console.error("No pilot summaries provided.");
    process.exit(1);
  }

  const rollup = aggregatePilotSummaries(rows);
  console.log(formatPilotRollupReport(rollup));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
