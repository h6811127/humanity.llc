#!/usr/bin/env node
/**
 * Respread map_layout.nodes inside district_zones (grid) for readable dense boards.
 * Usage: npm run city-game:spread-map-layout -- [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SUMMER_OPEN_NODE_COUNT } from "./city-game-summer-scale-core.mjs";
import {
  CR_SEASON_PATH,
  loadAndMergeWaveOpenSeason,
} from "./merge-city-game-wave-open.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = CR_SEASON_PATH;
const write = process.argv.includes("--write");

/** @type {Record<string, { x0: number; y0: number; x1: number; y1: number }>} */
const ZONE_BBOX = {
  newbo: { x0: 0.7, y0: 0.1, x1: 0.96, y1: 0.36 },
  czech_village: { x0: 0.05, y0: 0.3, x1: 0.34, y1: 0.58 },
  greene_square: { x0: 0.26, y0: 0.62, x1: 0.48, y1: 0.86 },
  river_spine: { x0: 0.36, y0: 0.44, x1: 0.58, y1: 0.72 },
  downtown: { x0: 0.5, y0: 0.12, x1: 0.76, y1: 0.48 },
};

/**
 * @param {number} count
 * @param {{ x0: number; y0: number; x1: number; y1: number }} box
 */
function gridPositions(count, box) {
  if (count <= 0) return [];
  const pad = 0.04;
  const w = box.x1 - box.x0 - pad * 2;
  const h = box.y1 - box.y0 - pad * 2;
  const aspect = w / Math.max(h, 0.01);
  const cols = Math.max(1, Math.ceil(Math.sqrt(count * aspect)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const out = [];
  let i = 0;
  for (let r = 0; r < rows && i < count; r++) {
    for (let c = 0; c < cols && i < count; c++) {
      const x =
        box.x0 + pad + ((c + 0.5) / cols) * w;
      const y =
        box.y0 + pad + ((r + 0.5) / rows) * h;
      out.push({
        x: Math.round(x * 1000) / 1000,
        y: Math.round(y * 1000) / 1000,
      });
      i++;
    }
  }
  return out;
}

/**
 * @param {Array<{ node_id: string; district: string }>} nodes
 */
export function spreadMapLayoutNodes(nodes) {
  /** @type {Record<string, { x: number; y: number }>} */
  const positions = {};
  const byDistrict = new Map();
  for (const row of nodes) {
    const d = row.district ?? "downtown";
    if (!byDistrict.has(d)) byDistrict.set(d, []);
    byDistrict.get(d).push(row.node_id);
  }
  for (const [district, ids] of byDistrict) {
    const box = ZONE_BBOX[district] ?? ZONE_BBOX.downtown;
    const sorted = [...ids].sort();
    const pts = gridPositions(sorted.length, box);
    sorted.forEach((id, idx) => {
      positions[id] = pts[idx];
    });
  }
  return positions;
}

function main() {
  let season = JSON.parse(readFileSync(seasonPath, "utf8"));
  if ((season.nodes ?? []).length < SUMMER_OPEN_NODE_COUNT) {
    season = loadAndMergeWaveOpenSeason({ write: true });
    console.log("Merged wave-open nodes —", season.nodes.length, "registry rows");
  }
  const nodes = season.nodes ?? [];
  const next = spreadMapLayoutNodes(nodes);
  season.map_layout = season.map_layout ?? { version: 1 };
  season.map_layout.version = 1;
  season.map_layout.nodes = next;

  if (!write) {
    console.log("Dry run —", Object.keys(next).length, "positions. Pass --write to apply.");
    return;
  }
  writeFileSync(seasonPath, `${JSON.stringify(season, null, 2)}\n`);
  console.log("Wrote", seasonPath, "—", Object.keys(next).length, "map_layout.nodes");
}

const isMain =
  import.meta.url === new URL(process.argv[1], "file:").href ||
  process.argv[1]?.endsWith("spread-city-game-map-layout.mjs");

if (isMain) main();
