#!/usr/bin/env node
/**
 * Tier 2 Web Push ops preflight.
 *
 *   npm run notify:web-push:preflight
 *   npm run notify:web-push:preflight -- --strict
 *   npm run notify:web-push:preflight -- --api http://127.0.0.1:8787
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessNotifyWebPushPreflight,
  formatNotifyWebPushPreflightReport,
  notifyWebPushEngineeringReady,
  probeOperatorWebPushCapabilities,
} from "./notify-web-push-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");
const apiIdx = process.argv.indexOf("--api");
const apiOrigin = apiIdx >= 0 ? process.argv[apiIdx + 1] : null;

const report = assessNotifyWebPushPreflight(root);
console.log(formatNotifyWebPushPreflightReport(report));

if (apiOrigin) {
  console.log("");
  console.log(`Probing ${apiOrigin} …`);
  try {
    const probe = await probeOperatorWebPushCapabilities(apiOrigin);
    console.log(`${probe.ok ? "☑" : "☐"} operator capabilities — ${probe.detail}`);
    if (strict && !probe.ok) process.exit(1);
  } catch (err) {
    console.log(`☐ operator capabilities — ${err instanceof Error ? err.message : err}`);
    if (strict) process.exit(1);
  }
}

if (strict && !notifyWebPushEngineeringReady(report)) {
  process.exit(1);
}
