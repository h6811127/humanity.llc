/**
 * Device shell E2E — CI sign-off bundle (remediation step 4).
 *
 * Usage:
 *   npm run device-shell:e2e
 *   npm run device-shell:e2e:signoff   # prints install hint, then runs bundle
 *
 * @see docs/DEVICE_SHELL_E2E_CI_REMEDIATION.md § Step 4
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEVICE_SHELL_E2E_SPECS } from "./device-shell-e2e-specs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const signoff = process.argv.includes("--signoff");

function main() {
  console.log("Device shell E2E — CI sign-off bundle");
  console.log("Docs: docs/DEVICE_SHELL_E2E_CI_REMEDIATION.md § Step 4\n");

  if (signoff) {
    console.log("One-time per machine:");
    console.log("  npm run e2e:install\n");
  }

  console.log(`▶ playwright test (${DEVICE_SHELL_E2E_SPECS.length} specs)`);
  const result = spawnSync(
    "npx",
    ["playwright", "test", ...DEVICE_SHELL_E2E_SPECS],
    {
      cwd: repoRoot,
      stdio: "inherit",
      shell: false,
      env: { ...process.env, CI: process.env.CI || "" },
    }
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  console.log("\n✅ Device shell E2E bundle passed. Update DEVICE_SHELL_E2E_CI_REMEDIATION.md Status when CI is green.");
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main();
}
