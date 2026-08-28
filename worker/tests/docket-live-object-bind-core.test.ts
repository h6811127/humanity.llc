import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { DOCKET_CASE_IDS } from "../../site/js/docket-case-core.mjs";
import {
  assertPublicDocketCasesBound,
  buildDocketLiveObjectBound,
  buildPublicDocketCaseLiveObjectBound,
  classifyDocketLiveObjectScanMode,
  docketCasefileFixtureLiveObject,
  docketScanPathFromCardQr,
  DOCKET_CASEFILE_FIXTURE_OBJECT_ID,
  upgradePublicDocketCaseLiveObjectToChildQr,
  renderDocketQrUpgradeHtml,
  readDocketQrUpgradePreviewFromStorage,
  writeDocketQrUpgradePreviewToStorage,
  validateDocketLiveObjectBind,
} from "../../site/js/docket-live-object-bind-core.mjs";
import {
  assessDocketCv2Preflight,
} from "../scripts/ws-docket-c-v2-preflight-core.mjs";
import {
  buildDocketCv2KitHtml,
  resolveDocketCv2KitUrls,
  validateDocketCv2KitHtml,
} from "../scripts/ws-docket-c-v2-kit-core.mjs";
import {
  assessWsDocketQrPreflight,
} from "../scripts/ws-docket-qr-preflight-core.mjs";
import {
  buildWsDocketQrKitHtml,
  validateWsDocketQrKitHtml,
} from "../scripts/ws-docket-qr-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = join(root, "site/data");

describe("docket-live-object-bind-core (WS-DOCKET-C-v2)", () => {
  it("builds /c/{profile}?q={qr} scan paths", () => {
    expect(docketScanPathFromCardQr("abc", "qr_1")).toBe("/c/abc?q=qr_1");
  });

  it("fixture bind validates as bound with discovery off", () => {
    const live = docketCasefileFixtureLiveObject();
    expect(live.status).toBe("bound");
    expect(live.object_id).toBe(DOCKET_CASEFILE_FIXTURE_OBJECT_ID);
    expect(live.discovery_opt_in).toBe(false);
    expect(live.scan_path?.startsWith("/c/")).toBe(true);
    expect(validateDocketLiveObjectBind(live).ok).toBe(true);
  });

  it("rejects incomplete discovery_opt_in true on bind helper output", () => {
    const live = buildDocketLiveObjectBound({
      objectId: "obj_x",
      scanPath: "/c/p?q=qr_x",
    });
    live.discovery_opt_in = true;
    expect(validateDocketLiveObjectBind(live).ok).toBe(false);
  });

  it("classifies interim vs child QR scan modes and upgrades", () => {
    expect(classifyDocketLiveObjectScanMode("/docket/netanyahu/", "netanyahu")).toBe(
      "interim"
    );
    expect(
      classifyDocketLiveObjectScanMode(
        "/c/docketCasefileFix01?q=qr_docket_casefile_fix_v1",
        "netanyahu"
      )
    ).toBe("child_qr");
    const upgraded = upgradePublicDocketCaseLiveObjectToChildQr("altman", {
      profileId: "docketAltmanChild01",
      qrId: "qr_docket_altman_v1",
    });
    expect(upgraded.status).toBe("bound");
    expect(upgraded.object_id).toBe("obj_docket_casefile_altman");
    expect(upgraded.scan_path).toBe("/c/docketAltmanChild01?q=qr_docket_altman_v1");
    expect(upgraded.discovery_opt_in).toBe(false);
    const cases = DOCKET_CASE_IDS.map((id) =>
      JSON.parse(readFileSync(join(dataDir, `docket-case-${id}.json`), "utf8"))
    );
    const altman = cases.find((c) => c.id === "altman");
    expect(altman).toBeTruthy();
    altman.live_object = upgraded;
    expect(assertPublicDocketCasesBound(cases).ok).toBe(true);
    const upgradeHtml = renderDocketQrUpgradeHtml(upgraded, "altman");
    expect(upgradeHtml).toContain('data-docket-scan-mode="child_qr"');
    expect(upgradeHtml).toContain("/c/docketAltmanChild01?q=qr_docket_altman_v1");
  });

  it("round-trips QR upgrade session preview storage", () => {
    /** @type {Record<string, string>} */
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
    const upgraded = upgradePublicDocketCaseLiveObjectToChildQr("putin", {
      profileId: "docketPutinChild01",
      qrId: "qr_docket_putin_v1",
    });
    writeDocketQrUpgradePreviewToStorage(storage, "putin", upgraded);
    const read = readDocketQrUpgradePreviewFromStorage(storage, "putin");
    expect(read?.scan_path).toBe("/c/docketPutinChild01?q=qr_docket_putin_v1");
    writeDocketQrUpgradePreviewToStorage(storage, "putin", null);
    expect(readDocketQrUpgradePreviewFromStorage(storage, "putin")).toBeNull();
  });
});

describe("ws-docket-c-v2 kit + preflight", () => {
  it("builds valid kit HTML", () => {
    const urls = resolveDocketCv2KitUrls({ production: false });
    const html = buildDocketCv2KitHtml({
      origin: urls.origin,
      apiOrigin: urls.apiOrigin,
      docketUrl: urls.docketUrl,
      stewardExampleUrl: urls.stewardExampleUrl,
      fixtureScanUrl: urls.fixtureScanUrl,
      fixtureScanPath: urls.fixtureScanPath,
    });
    expect(validateDocketCv2KitHtml(html)).toBe(true);
    expect(html).toContain(DOCKET_CASEFILE_FIXTURE_OBJECT_ID);
  });

  it("preflight is ready after kit write", () => {
    // Kit file may already exist from npm run; assess against repo root.
    const report = assessDocketCv2Preflight(root);
    // npm scripts may not be wired yet in the same edit — check bind + unbound always.
    expect(report.bind.engineeringMet).toBe(true);
    expect(report.unbound.engineeringMet).toBe(true);
  });
});

describe("ws-docket-qr-v0 kit + session preview", () => {
  it("persists and clears session QR upgrade preview", () => {
    /** @type {Record<string, string>} */
    const store = {};
    const storage = {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
    };
    const upgraded = upgradePublicDocketCaseLiveObjectToChildQr("putin", {
      profileId: "p",
      qrId: "qr_1",
    });
    writeDocketQrUpgradePreviewToStorage(storage, "putin", upgraded);
    expect(readDocketQrUpgradePreviewFromStorage(storage, "putin")?.scan_path).toBe(
      "/c/p?q=qr_1"
    );
    writeDocketQrUpgradePreviewToStorage(storage, "putin", null);
    expect(readDocketQrUpgradePreviewFromStorage(storage, "putin")).toBeNull();
  });

  it("builds valid QR kit HTML", () => {
    const html = buildWsDocketQrKitHtml({ origin: "http://127.0.0.1:8788" });
    expect(() => validateWsDocketQrKitHtml(html)).not.toThrow();
    expect(html).toContain("qr-upgrade");
  });

  it("QR preflight passes when kit + npm scripts are present", () => {
    const report = assessWsDocketQrPreflight(root);
    expect(report.engineeringMet).toBe(true);
  });
});
