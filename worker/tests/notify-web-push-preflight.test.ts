import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  assessNotifyWebPushPreflight,
  notifyWebPushEngineeringReady,
} from "../scripts/notify-web-push-preflight-core.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("notify-web-push-preflight", () => {
  it("reports engineering-ready when Tier 2 artifacts are present", () => {
    const report = assessNotifyWebPushPreflight(REPO_ROOT);
    expect(notifyWebPushEngineeringReady(report)).toBe(true);
    const snapshot = report.checks.find((row) => row.id === "client:transport_snapshot");
    expect(snapshot?.ok).toBe(true);
  });
});
