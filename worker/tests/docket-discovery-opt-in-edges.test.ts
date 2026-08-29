import { describe, expect, it } from "vitest";

import {
  DOCKET_STARTER_CASE_IDS,
  assertStarterFourDiscoveryOptInOff,
  isDocketChildObjectScanPathForDiscovery,
  readDocketDiscoveryOptInPreview,
  validateDocketDiscoveryOptInFields,
  writeDocketDiscoveryOptInPreview,
} from "../../site/js/docket-discovery-opt-in-core.mjs";

function optInLive(overrides = {}) {
  return {
    status: "bound",
    object_id: "obj_docket_casefile_chapter-demo",
    scan_path: "/c/demoProfile01?q=qr_demo_1",
    discovery_opt_in: true,
    discovery: {
      listed_reason: "Chapter teach-in pin",
      approvals: ["hc-founders", "hc-reviewer"],
    },
    ...overrides,
  };
}

describe("docket discovery opt-in edges", () => {
  it("rejects scan paths that are not a single child-QR pair", () => {
    expect(isDocketChildObjectScanPathForDiscovery("/c/demoProfile01?q=qr_demo_1")).toBe(
      true
    );
    expect(isDocketChildObjectScanPathForDiscovery("/docket/altman/")).toBe(false);
    expect(isDocketChildObjectScanPathForDiscovery("/c/foo/bar?q=qr_x")).toBe(false);
    expect(isDocketChildObjectScanPathForDiscovery("/c/foo?q=qr_x&extra=1")).toBe(false);
    expect(isDocketChildObjectScanPathForDiscovery("/c/?q=qr_x")).toBe(false);
    expect(isDocketChildObjectScanPathForDiscovery("/c/foo")).toBe(false);
    expect(isDocketChildObjectScanPathForDiscovery("")).toBe(false);
  });

  it("requires bound child QR, listed reason, and dual steward approvals", () => {
    const stewards = [
      { id: "hc-founders" },
      { id: "hc-reviewer" },
    ];
    const unbound = [];
    validateDocketDiscoveryOptInFields(
      optInLive({ status: "unbound" }),
      stewards,
      unbound
    );
    expect(unbound.some((e) => e.includes("status bound"))).toBe(true);

    const oneGate = [];
    validateDocketDiscoveryOptInFields(
      optInLive({
        discovery: { listed_reason: "Chapter", approvals: ["hc-founders"] },
      }),
      stewards,
      oneGate
    );
    expect(oneGate.some((e) => e.includes("approvals needs ≥2"))).toBe(true);

    const stranger = [];
    validateDocketDiscoveryOptInFields(
      optInLive({
        discovery: {
          listed_reason: "Chapter",
          approvals: ["hc-founders", "hc-outsider"],
        },
      }),
      stewards,
      stranger
    );
    expect(stranger.some((e) => e.includes("not in stewards[]"))).toBe(true);

    const nestedPath = [];
    validateDocketDiscoveryOptInFields(
      optInLive({ scan_path: "/c/foo/bar?q=qr_x" }),
      stewards,
      nestedPath
    );
    expect(nestedPath.some((e) => e.includes("child QR scan_path"))).toBe(true);
  });

  it("fails starter-four gate when a roster case is missing or opted in", () => {
    const opted = DOCKET_STARTER_CASE_IDS.map((id) => ({
      id,
      live_object: { discovery_opt_in: false },
    }));
    expect(assertStarterFourDiscoveryOptInOff(opted).ok).toBe(true);

    opted[0].live_object.discovery_opt_in = true;
    expect(assertStarterFourDiscoveryOptInOff(opted).ok).toBe(false);

    const missing = opted.slice(1).map((row) => ({
      ...row,
      live_object: { discovery_opt_in: false },
    }));
    const report = assertStarterFourDiscoveryOptInOff(missing);
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.includes("missing from cases"))).toBe(true);
  });

  it("swallows corrupt discovery preview storage instead of throwing", () => {
    const mem = {};
    const storage = {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => {
        mem[k] = String(v);
      },
      removeItem: (k) => {
        delete mem[k];
      },
    };
    writeDocketDiscoveryOptInPreview(storage, "chapter-demo", optInLive());
    expect(readDocketDiscoveryOptInPreview(storage, "chapter-demo")?.discovery_opt_in).toBe(
      true
    );

    mem[Object.keys(mem)[0]] = "{not-json";
    expect(readDocketDiscoveryOptInPreview(storage, "chapter-demo")).toBeNull();
    expect(readDocketDiscoveryOptInPreview(null, "chapter-demo")).toBeNull();
  });
});
