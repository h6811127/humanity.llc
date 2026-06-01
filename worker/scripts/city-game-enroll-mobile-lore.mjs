#!/usr/bin/env node
/**
 * Enroll Glitch hoodie print_artifact QRs as mobile_lore season nodes.
 *
 * Usage:
 *   npm run city-game:enroll-mobile-lore -- --profile-id PROF --artifact pa_abc123 --label "Courier A"
 *   npm run city-game:enroll-mobile-lore -- --list
 *
 * Writes enrollment rows to site/data/city-game-cr-season-01.json → mobile_lore_enrollment[]
 * (does not mint resolver objects — owner updates print_artifact status; operator may attach hints).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = path.join(root, "site/data/city-game-cr-season-01.json");

function usage() {
  console.log(`Usage:
  npm run city-game:enroll-mobile-lore -- --list
  npm run city-game:enroll-mobile-lore -- --profile-id PROFILE --artifact PRINT_ARTIFACT_ID --label "Courier name"
  npm run city-game:enroll-mobile-lore -- --write --profile-id PROFILE --artifact pa_x --label "Courier A"

--write persists to season JSON. Without --write, prints the row only.`);
}

function parseArgs(argv) {
  const out = { list: false, write: false, profileId: "", artifact: "", label: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list") out.list = true;
    else if (a === "--write") out.write = true;
    else if (a === "--profile-id") out.profileId = argv[++i] ?? "";
    else if (a === "--artifact") out.artifact = argv[++i] ?? "";
    else if (a === "--label") out.label = argv[++i] ?? "";
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (!fs.existsSync(seasonPath)) {
  console.error("Missing season config:", seasonPath);
  process.exit(1);
}

const season = JSON.parse(fs.readFileSync(seasonPath, "utf8"));
season.mobile_lore_enrollment = season.mobile_lore_enrollment ?? [];

if (args.list || (!args.profileId && !args.artifact)) {
  console.log("Season:", season.season_id);
  console.log("Mobile lore enrollments:", season.mobile_lore_enrollment.length);
  for (const row of season.mobile_lore_enrollment) {
    console.log(`  - ${row.label ?? row.print_artifact_id}: ${row.profile_id} / ${row.print_artifact_id}`);
  }
  if (!args.list && season.mobile_lore_enrollment.length === 0) usage();
  process.exit(0);
}

if (!args.profileId || !args.artifact) {
  usage();
  process.exit(1);
}

const row = {
  profile_id: args.profileId.trim(),
  print_artifact_id: args.artifact.trim(),
  label: args.label.trim() || "Mobile lore courier",
  role: "mobile_lore",
  enrolled_at: new Date().toISOString(),
};

const dup = season.mobile_lore_enrollment.some(
  (e) => e.print_artifact_id === row.print_artifact_id
);
if (dup) {
  console.error("Already enrolled:", row.print_artifact_id);
  process.exit(1);
}

console.log("Enrollment row:");
console.log(JSON.stringify(row, null, 2));

if (args.write) {
  season.mobile_lore_enrollment.push(row);
  fs.writeFileSync(seasonPath, `${JSON.stringify(season, null, 2)}\n`);
  console.log("\nWrote", seasonPath);
} else {
  console.log("\nDry run — re-run with --write to persist.");
}
