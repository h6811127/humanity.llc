#!/usr/bin/env node
/**
 * Merge site/data/city-game-cr-season-01-wave-open-nodes.json into season config.
 * Usage: node worker/scripts/merge-city-game-wave-open.mjs [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SUMMER_WAVE_OPEN_NODE_COUNT } from "./city-game-summer-scale-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const CR_SEASON_PATH = join(root, "site/data/city-game-cr-season-01.json");
export const CR_WAVE_OPEN_PATH = join(
  root,
  "site/data/city-game-cr-season-01-wave-open-nodes.json"
);

/**
 * @param {Record<string, unknown>} season
 * @param {Record<string, unknown>} wave
 * @returns {Record<string, unknown>}
 */
export function mergeWaveOpenIntoSeason(season, wave) {
  const spine = (Array.isArray(season.nodes) ? season.nodes : []).filter(
    (n) => Number(String(n.node_id).replace("node_", "")) <= 15
  );
  if (spine.length !== 15) {
    throw new Error(`Expected 15 spine nodes, got ${spine.length}`);
  }

  const merged = structuredClone(season);
  merged.window = {
    starts_at: "2026-06-06T18:00:00-05:00",
    ends_at: "2026-09-01T22:00:00-05:00",
  };
  merged.map_copy = {
    ...(merged.map_copy && typeof merged.map_copy === "object" ? merged.map_copy : {}),
    subtitle: "Summer board · read-only",
  };
  const guide = merged.player_guide;
  if (guide && typeof guide === "object" && Array.isArray(guide.steps)) {
    merged.player_guide = {
      ...guide,
      steps: guide.steps.map((step, i) =>
        i === 1
          ? {
              ...step,
              body: "Search place names in Apple Maps or Google Maps. The city board is a district sketch, not turn-by-turn directions.",
            }
          : step
      ),
    };
  }

  merged.nodes = [...spine, ...(Array.isArray(wave.nodes) ? wave.nodes : [])];
  const layout = merged.map_layout && typeof merged.map_layout === "object" ? merged.map_layout : {};
  merged.map_layout = {
    ...layout,
    version: 1,
    nodes: {
      ...(layout.nodes && typeof layout.nodes === "object" ? layout.nodes : {}),
      ...(wave.map_layout_nodes && typeof wave.map_layout_nodes === "object"
        ? wave.map_layout_nodes
        : {}),
    },
  };
  merged.contribute_codes = {
    ...(merged.contribute_codes && typeof merged.contribute_codes === "object"
      ? merged.contribute_codes
      : {}),
    ...(wave.contribute_codes && typeof wave.contribute_codes === "object"
      ? wave.contribute_codes
      : {}),
  };

  const auto =
    merged.automation && typeof merged.automation === "object" ? merged.automation : {};
  const relaySet = new Set([
    ...(Array.isArray(auto.relay_capture_nodes) ? auto.relay_capture_nodes : []),
    ...(Array.isArray(wave.relay_capture_nodes_add) ? wave.relay_capture_nodes_add : []),
  ]);
  merged.automation = {
    ...auto,
    relay_capture_nodes: [...relaySet].sort(
      (a, b) => Number(a.replace("node_", "")) - Number(b.replace("node_", ""))
    ),
  };

  if (merged.nodes.length !== SUMMER_WAVE_OPEN_NODE_COUNT) {
    throw new Error(
      `After merge expected ${SUMMER_WAVE_OPEN_NODE_COUNT} nodes, got ${merged.nodes.length}`
    );
  }

  return merged;
}

/**
 * @param {{ write?: boolean }} [opts]
 */
export function loadAndMergeWaveOpenSeason(opts = {}) {
  const season = JSON.parse(readFileSync(CR_SEASON_PATH, "utf8"));
  const wave = JSON.parse(readFileSync(CR_WAVE_OPEN_PATH, "utf8"));
  const merged = mergeWaveOpenIntoSeason(season, wave);
  if (opts.write) {
    writeFileSync(CR_SEASON_PATH, `${JSON.stringify(merged, null, 2)}\n`);
  }
  return merged;
}

function main() {
  const write = process.argv.includes("--write");
  try {
    const merged = loadAndMergeWaveOpenSeason({ write });
    if (write) {
      console.log("Wrote", CR_SEASON_PATH, "—", merged.nodes.length, "nodes");
    } else {
      console.log("Dry run OK —", merged.nodes.length, "nodes. Pass --write to apply.");
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
