#!/usr/bin/env node
/**
 * Print production scan URLs from city-game-production-seed.json for sharing / QR PNG download.
 *
 *   npm run city-game:export-qr-pack
 *
 * Requires: npm run city-game:seed-production -- --confirm-production
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "worker/.local/city-game-production-seed.json");
const outDir = join(root, "worker/.local/city-game-qr-pack");
const outMd = join(outDir, "SCAN_URLS.md");

function main() {
  if (!existsSync(seedPath)) {
    console.error("Missing production seed — run: npm run city-game:seed-production -- --confirm-production");
    process.exit(1);
  }

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const lines = [
    `# Cedar Rapids Season 1 — scan URLs`,
    ``,
    `Season root: \`${seed.profile_id}\` · handle @${seed.handle}`,
    `Window: see site/data/city-game-cr-season-01.json`,
    ``,
    `**Do not commit this folder** — gitignored via worker/.local/`,
    ``,
    `| Node | Place | Scan URL | Site code |`,
    `|------|-------|----------|-----------|`,
  ];

  for (const node of seed.nodes ?? []) {
    const code = node.contribute_site_code ?? "—";
    lines.push(`| ${node.node_id} | ${node.public_label} | ${node.scan_url} | ${code} |`);
  }

  lines.push("");
  lines.push("Season root card:");
  lines.push(seed.season_root_scan_url ?? "(missing)");
  lines.push("");
  lines.push("Download QR PNGs from /created/ or issue-qr responses when logged in as owner.");

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outMd, `${lines.join("\n")}\n`);

  console.log("Cedar Rapids QR pack\n");
  console.log("Wrote:", outMd.replace(root + "/", ""));
  console.log("\nPrimary spine scans:");
  for (const id of ["node_01", "node_04", "node_07", "node_13"]) {
    const row = seed.nodes?.find((n) => n.node_id === id);
    if (row) console.log(`  ${id}: ${row.scan_url}`);
  }
  console.log("\nOperator: paste game-operator private key at https://humanity.llc/game-operator/");
}

main();
