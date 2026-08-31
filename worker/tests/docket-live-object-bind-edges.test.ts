import { describe, expect, it } from "vitest";

import { DOCKET_CASE_IDS } from "../../site/js/docket-case-core.mjs";
import {
  assertPublicDocketCasesBound,
  buildDocketLiveObjectBound,
  buildPublicDocketCaseLiveObjectBound,
  classifyDocketLiveObjectScanMode,
  docketCasefileObjectId,
  docketScanPathFromCardQr,
  parseDocketChildObjectScanPath,
  readDocketQrUpgradePreviewFromStorage,
  upgradePublicDocketCaseLiveObjectToChildQr,
  validateDocketLiveObjectBind,
  writeDocketQrUpgradePreviewToStorage,
} from "../../site/js/docket-live-object-bind-core.mjs";

function memoryStorage() {
  /** @type {Record<string, string>} */
  const mem = {};
  return {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => {
      mem[k] = String(v);
    },
    removeItem: (k) => {
      delete mem[k];
    },
  };
}

describe("docket-live-object-bind-core reject edges", () => {
  it("parses only /c/{profile}?q={qr} without extra path or query hops", () => {
    expect(parseDocketChildObjectScanPath("/c/abc?q=qr_1")).toEqual({
      profileId: "abc",
      qrId: "qr_1",
    });
    expect(parseDocketChildObjectScanPath("/c/foo/bar?q=qr_1")).toBeNull();
    expect(parseDocketChildObjectScanPath("/c/foo?q=qr_1&extra=1")).toBeNull();
    expect(parseDocketChildObjectScanPath("/c/foo")).toBeNull();
    expect(parseDocketChildObjectScanPath("/c/?q=qr_1")).toBeNull();
    expect(parseDocketChildObjectScanPath("/c/foo?q=")).toBeNull();
    expect(parseDocketChildObjectScanPath("/docket/altman/")).toBeNull();
    expect(parseDocketChildObjectScanPath("")).toBeNull();
    expect(docketScanPathFromCardQr("", "qr_1")).toBeNull();
    expect(docketScanPathFromCardQr("abc", "")).toBeNull();
    expect(docketCasefileObjectId("")).toBeNull();
    expect(docketCasefileObjectId("  Altman  ")).toBe("obj_docket_casefile_altman");
  });

  it("classifies interim vs other vs none", () => {
    expect(classifyDocketLiveObjectScanMode("/docket/altman/", "altman")).toBe("interim");
    expect(classifyDocketLiveObjectScanMode("/c/abc?q=qr_1", "altman")).toBe("child_qr");
    expect(classifyDocketLiveObjectScanMode("/shop/customize/", "altman")).toBe("other");
    expect(classifyDocketLiveObjectScanMode("", "altman")).toBe("none");
    expect(classifyDocketLiveObjectScanMode(null, "altman")).toBe("none");
  });

  it("validateDocketLiveObjectBind rejects unbound ids and off-site scan paths", () => {
    expect(validateDocketLiveObjectBind(null).ok).toBe(false);
    expect(validateDocketLiveObjectBind([]).ok).toBe(false);
    expect(validateDocketLiveObjectBind({ status: "mystery", discovery_opt_in: false }).ok).toBe(
      false
    );

    expect(
      validateDocketLiveObjectBind({
        status: "bound",
        object_id: "obj_x",
        scan_path: null,
        discovery_opt_in: false,
      }).ok
    ).toBe(false);

    expect(
      validateDocketLiveObjectBind({
        status: "bound",
        object_id: "obj_x",
        scan_path: "https://evil.example/c/p?q=qr",
        discovery_opt_in: false,
      }).ok
    ).toBe(false);

    expect(
      validateDocketLiveObjectBind({
        status: "unbound",
        object_id: "obj_x",
        scan_path: null,
        discovery_opt_in: false,
      }).ok
    ).toBe(false);

    expect(
      validateDocketLiveObjectBind({
        status: "unbound",
        object_id: null,
        scan_path: "/docket/altman/",
        discovery_opt_in: false,
      }).ok
    ).toBe(false);

    expect(
      validateDocketLiveObjectBind({
        status: "unbound",
        object_id: null,
        scan_path: null,
        discovery_opt_in: false,
      }).ok
    ).toBe(true);
  });

  it("session QR preview swallows corrupt JSON and refuses interim paths", () => {
    const storage = memoryStorage();
    expect(readDocketQrUpgradePreviewFromStorage(null, "altman")).toBeNull();
    expect(readDocketQrUpgradePreviewFromStorage(storage, "altman")).toBeNull();

    storage.setItem("hc_docket_qr_upgrade_v0:altman", "{not-json");
    expect(readDocketQrUpgradePreviewFromStorage(storage, "altman")).toBeNull();

    storage.setItem(
      "hc_docket_qr_upgrade_v0:altman",
      JSON.stringify({ status: "mystery", discovery_opt_in: false })
    );
    expect(readDocketQrUpgradePreviewFromStorage(storage, "altman")).toBeNull();

    const leakedInterim = {
      status: "bound",
      object_id: "obj_docket_casefile_altman",
      scan_path: "/docket/altman/",
      discovery_opt_in: false,
    };
    storage.setItem("hc_docket_qr_upgrade_v0:altman", JSON.stringify(leakedInterim));
    expect(readDocketQrUpgradePreviewFromStorage(storage, "altman")?.scan_path).toBe(
      "/docket/altman/"
    );

    const interim = buildPublicDocketCaseLiveObjectBound("altman");
    expect(() => writeDocketQrUpgradePreviewToStorage(storage, "altman", interim)).toThrow(
      /\/c\/\{profile\}\?q=\{qr\}/
    );

    expect(() =>
      writeDocketQrUpgradePreviewToStorage(storage, "altman", {
        status: "bound",
        object_id: "obj_x",
        scan_path: "https://evil.example/",
        discovery_opt_in: false,
      })
    ).toThrow();
  });

  it("assertPublicDocketCasesBound rejects missing roster rows and discovery opt-in", () => {
    expect(assertPublicDocketCasesBound(null).ok).toBe(false);
    expect(assertPublicDocketCasesBound([]).ok).toBe(false);

    const cases = DOCKET_CASE_IDS.map((id) => ({
      id,
      live_object: buildPublicDocketCaseLiveObjectBound(id),
    }));
    expect(assertPublicDocketCasesBound(cases).ok).toBe(true);

    cases[0].live_object.discovery_opt_in = true;
    expect(assertPublicDocketCasesBound(cases).ok).toBe(false);

    cases[0].live_object.discovery_opt_in = false;
    cases[0].live_object.object_id = "obj_wrong";
    expect(assertPublicDocketCasesBound(cases).ok).toBe(false);

    cases[0].live_object.object_id = `obj_docket_casefile_${cases[0].id}`;
    cases[0].live_object.scan_path = "/shop/";
    expect(assertPublicDocketCasesBound(cases).ok).toBe(false);
  });

  it("upgrade and public bind throw on empty case ids", () => {
    expect(() => buildPublicDocketCaseLiveObjectBound("")).toThrow(/invalid case id/);
    expect(() =>
      upgradePublicDocketCaseLiveObjectToChildQr("", { profileId: "p", qrId: "qr_1" })
    ).toThrow(/invalid upgrade input/);
    expect(() =>
      upgradePublicDocketCaseLiveObjectToChildQr("altman", { profileId: "", qrId: "qr_1" })
    ).toThrow(/invalid upgrade input/);
  });

  it("bound helper always forces discovery_opt_in false", () => {
    const live = buildDocketLiveObjectBound({
      objectId: "obj_x",
      scanPath: "/c/p?q=qr_x",
    });
    expect(live.discovery_opt_in).toBe(false);
    expect(validateDocketLiveObjectBind(live).ok).toBe(true);
  });
});
