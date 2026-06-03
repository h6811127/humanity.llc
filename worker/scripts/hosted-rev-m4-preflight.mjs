/**
 * WS-REV R4 desk preflight — engineering gates before governance --apply.
 *
 * Usage: npm run hosted:rev:m4:preflight
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {string} label
 * @param {string[]} args
 */
function runNpm(label, args) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync("npm", args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  console.log("WS-REV R4 preflight — engineering + doc markers\n");
  runNpm("WS-REV regression bundle", ["run", "worker:test:hosted-rev"]);
  runNpm("M4 sign-off core unit tests", [
    "run",
    "worker:test",
    "--",
    "worker/tests/hosted-rev-m4-sign-off-core.test.ts",
  ]);
  runNpm("Site build", ["run", "build"]);
  console.log("\n✅ WS-REV R4 preflight complete. Record governance:");
  console.log("  npm run hosted:rev:m4-sign-off -- --pass --apply");
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main();
}
