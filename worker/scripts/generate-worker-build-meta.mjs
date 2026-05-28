/**
 * Writes worker/src/generated/worker-build-meta.ts for Worker deploy identity.
 * @see docs/SITE_BUILD_VERSIONING.md — Phase 3
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMetaSourceFromEnv,
  renderWorkerBuildMetaModule,
  resolveGitShaFromRoot,
} from "../../site/js/build-meta-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "worker/src/generated");
const outPath = join(outDir, "worker-build-meta.ts");

const meta = {
  gitSha: resolveGitShaFromRoot(root),
  builtAt: new Date().toISOString(),
  source: buildMetaSourceFromEnv(root),
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, renderWorkerBuildMetaModule(meta), "utf8");
console.log(`Wrote ${outPath} (${meta.gitSha})`);
