import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { DOCKET_CASE_IDS, validateDocketCase } from "../../site/js/docket-case-core.mjs";
import {
  assertStarterFourDiscoveryOptInOff,
  buildDocketDiscoveryOptInLiveObject,
  DOCKET_CV3_DISCOVERY_OPT_IN_UNLOCKED,
  validateDocketDiscoveryOptInFields,
} from "../../site/js/docket-discovery-opt-in-core.mjs";
import {
  assessWsDocketCv3Preflight,
} from "../scripts/ws-docket-c-v3-preflight-core.mjs";
import {
  buildWsDocketCv3KitHtml,
  validateWsDocketCv3KitHtml,
} from "../scripts/ws-docket-c-v3-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = join(root, "site/data");

describe("docket-discovery-opt-in-core (WS-DOCKET-C-v3)", () => {
  it("unlocks discovery opt-in schema", () => {
    expect(DOCKET_CV3_DISCOVERY_OPT_IN_UNLOCKED).toBe(true);
  });

  it("builds valid opt-in live_object with child QR + dual approvals", () => {
    const live = buildDocketDiscoveryOptInLiveObject({
      caseId: "chapter-demo",
      profileId: "demoProfile01",
      qrId: "qr_demo_1",
      listedReason: "Chapter teach-in pin",
      approvals: ["hc-founders", "hc-reviewer"],
      regionId: "cedar-rapids-iowa",
    });
    expect(live.discovery_opt_in).toBe(true);
    expect(live.scan_path).toBe("/c/demoProfile01?q=qr_demo_1");
    const errors = [];
    validateDocketDiscoveryOptInFields(live, null, errors, {
      requireStewardMembership: false,
    });
    expect(errors).toEqual([]);
  });

  it("rejects opt-in without discovery block or approvals", () => {
    const errors = [];
    validateDocketDiscoveryOptInFields(
      {
        status: "bound",
        object_id: "obj_x",
        scan_path: "/c/p?q=qr_1",
        discovery_opt_in: true,
      },
      null,
      errors,
      { requireStewardMembership: false }
    );
    expect(errors.some((e) => e.includes("discovery object"))).toBe(true);
  });

  it("keeps starter-four published discovery_opt_in false", () => {
    const cases = DOCKET_CASE_IDS.map((id) =>
      JSON.parse(readFileSync(join(dataDir, `docket-case-${id}.json`), "utf8"))
    );
    expect(assertStarterFourDiscoveryOptInOff(cases).ok).toBe(true);
  });

  it("rejects incomplete discovery_opt_in true on published case", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-case-musk.json"), "utf8")
    );
    raw.live_object.discovery_opt_in = true;
    expect(validateDocketCase(raw).ok).toBe(false);
  });

  it("accepts schema-complete opt-in for rehearsal (published roster still gated separately)", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-case-altman.json"), "utf8")
    );
    raw.live_object = buildDocketDiscoveryOptInLiveObject({
      caseId: "altman",
      profileId: "docketAltmanChild01",
      qrId: "qr_docket_altman_v1",
      listedReason: "Chapter teach-in pin with venue consent",
      approvals: ["hc-founders", "hc-reviewer"],
    });
    expect(validateDocketCase(raw).ok).toBe(true);
    expect(assertStarterFourDiscoveryOptInOff([raw]).ok).toBe(false);
  });
});

describe("ws-docket-c-v3 kit + preflight", () => {
  it("builds valid kit HTML", () => {
    const html = buildWsDocketCv3KitHtml({ origin: "http://127.0.0.1:8788" });
    expect(() => validateWsDocketCv3KitHtml(html)).not.toThrow();
  });

  it("preflight passes when kit + npm scripts are present", () => {
    const report = assessWsDocketCv3Preflight(root);
    expect(report.engineeringMet).toBe(true);
  });
});
