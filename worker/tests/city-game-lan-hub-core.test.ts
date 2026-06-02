import { describe, expect, it } from "vitest";

import {
  buildLanHubHtml,
  buildLanScanUrl,
  detectLanHostFromInterfaces,
  patchDevVarsScanOrigins,
  rewriteScanUrlForLan,
} from "../scripts/city-game-lan-hub-core.mjs";

describe("city-game-lan-hub-core", () => {
  it("detects first non-internal IPv4", () => {
    expect(
      detectLanHostFromInterfaces({
        en0: [{ family: "IPv4", internal: false, address: "192.168.1.42" }],
      })
    ).toBe("192.168.1.42");
  });

  it("rewrites localhost scan URLs for LAN", () => {
    expect(
      rewriteScanUrlForLan(
        "http://127.0.0.1:8787/c/prof?q=qr_x",
        "192.168.1.42"
      )
    ).toBe("http://192.168.1.42:8787/c/prof?q=qr_x");
  });

  it("builds scan URL from profile + qr", () => {
    expect(buildLanScanUrl("prof1", "qr_abc", "192.168.1.42")).toBe(
      "http://192.168.1.42:8787/c/prof1?q=qr_abc"
    );
  });

  it("renders hub HTML with tap links and site codes", () => {
    const html = buildLanHubHtml({
      lanHost: "192.168.1.42",
      profileId: "prof1",
      nodes: [
        {
          node_id: "node_04",
          public_label: "River Lantern",
          qr_id: "qr_river",
          local_scan_url: "http://127.0.0.1:8787/c/prof1?q=qr_river",
        },
        {
          node_id: "node_10",
          public_label: "Library witness",
          qr_id: "qr_wit",
        },
      ],
      siteCodes: {
        node_04: { code: "CR-LANTERN-7K" },
        node_10: { code: "CR-WITNS-4P" },
      },
    });
    expect(html).toContain("http://192.168.1.42:8787/c/prof1?q=qr_river");
    expect(html).toContain("CR-LANTERN-7K");
    expect(html).toContain("CR-WITNS-4P");
    expect(html).toContain("192.168.1.42:8788");
  });

  it("patches SCAN_* lines in dev vars", () => {
    const out = patchDevVarsScanOrigins(
      "CITY_GAME_ENABLED=1\nSCAN_RESOLVER_ORIGIN=http://127.0.0.1:8787\n",
      "192.168.1.42"
    );
    expect(out).toContain("SCAN_RESOLVER_ORIGIN=http://192.168.1.42:8787");
    expect(out).toContain("SCAN_PAGES_JS_ORIGIN=http://192.168.1.42:8788");
  });
});
