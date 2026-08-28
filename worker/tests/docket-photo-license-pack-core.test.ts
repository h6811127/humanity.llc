import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { validateDocketPhotoLicenseChecklist } from "../../site/js/docket-case-core.mjs";
import { assertStarterFourPhotosNotLicensed } from "../../site/js/docket-photo-core.mjs";
import {
  DOCKET_PHOTO_LICENSE_PACKS_KIND,
  DOCKET_PHOTO_LICENSE_PACK_KIT_REL,
  applyReadyDocketPhotoLicensePacksToChecklist,
  checklistRowFromDocketPhotoLicensePack,
  validateDocketPhotoLicensePacks,
} from "../../site/js/docket-photo-license-pack-core.mjs";
import { assessWsDocketLicensePackPreflight } from "../scripts/ws-docket-license-pack-preflight-core.mjs";
import {
  buildWsDocketLicensePackKitHtml,
  validateWsDocketLicensePackKitHtml,
} from "../scripts/ws-docket-license-pack-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = join(root, "site/data");

describe("docket-photo-license-pack-core (license-pack-v0)", () => {
  it("validates published packs registry", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-photo-license-packs.json"), "utf8")
    );
    const result = validateDocketPhotoLicensePacks(raw);
    expect(result.ok).toBe(true);
    expect(raw.kind).toBe(DOCKET_PHOTO_LICENSE_PACKS_KIND);
    expect(raw.starter_four_faces_live).toBe(false);
  });

  it("keeps starter-four checklist not_licensed while rehearsal is licensed", () => {
    const checklist = JSON.parse(
      readFileSync(join(dataDir, "docket-photo-license-checklist.json"), "utf8")
    );
    expect(validateDocketPhotoLicenseChecklist(checklist).ok).toBe(true);
    expect(assertStarterFourPhotosNotLicensed(checklist).ok).toBe(true);
    const rehearsal = checklist.cases.find((c) => c.id === "rehearsal-commons");
    expect(rehearsal.license_status).toBe("licensed");
    expect(rehearsal.photo_ref).toBe("/assets/docket/license-pack-rehearsal.svg");
    expect(
      existsSync(join(root, "site/assets/docket/license-pack-rehearsal.svg"))
    ).toBe(true);
  });

  it("refuses to materialize starter-four from a ready pack", () => {
    expect(() =>
      checklistRowFromDocketPhotoLicensePack({
        id: "bad",
        subject_id: "altman",
        status: "ready",
        photo_ref: "/assets/docket/license-pack-rehearsal.svg",
        license: {
          type: "press",
          attribution: "x",
          source_url: "https://example.com",
          obtained_at: "2026-07-17",
        },
      })
    ).toThrow(/starter-four/);
  });

  it("rejects starter-four ready packs in registry validation", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-photo-license-packs.json"), "utf8")
    );
    const musk = raw.packs.find((p) => p.subject_id === "musk");
    musk.status = "ready";
    musk.photo_ref = "/assets/docket/license-pack-rehearsal.svg";
    expect(validateDocketPhotoLicensePacks(raw).ok).toBe(false);
  });

  it("applyReady merges rehearsal and hardens starter-four", () => {
    const packs = JSON.parse(
      readFileSync(join(dataDir, "docket-photo-license-packs.json"), "utf8")
    );
    const merged = applyReadyDocketPhotoLicensePacksToChecklist(
      {
        version: 1,
        phase: 2,
        policy: "t",
        cases: [
          { id: "altman", photo_ref: "/assets/x.png", license_status: "licensed", notes: "leak" },
          { id: "netanyahu", photo_ref: null, license_status: "not_licensed", notes: "" },
          { id: "putin", photo_ref: null, license_status: "not_licensed", notes: "" },
          { id: "musk", photo_ref: null, license_status: "not_licensed", notes: "" },
        ],
      },
      packs
    );
    expect(assertStarterFourPhotosNotLicensed(merged).ok).toBe(true);
    expect(
      merged.cases.find((c) => c.id === "rehearsal-commons")?.license_status
    ).toBe("licensed");
  });
});

describe("ws-docket license-pack kit + preflight", () => {
  it("builds valid kit HTML", () => {
    const html = buildWsDocketLicensePackKitHtml({
      origin: "http://127.0.0.1:8788",
    });
    expect(() => validateWsDocketLicensePackKitHtml(html)).not.toThrow();
  });

  it("preflight passes when kit + packs are present", () => {
    const html = buildWsDocketLicensePackKitHtml({
      origin: "http://127.0.0.1:8788",
    });
    writeFileSync(join(root, DOCKET_PHOTO_LICENSE_PACK_KIT_REL), html);
    const report = assessWsDocketLicensePackPreflight(root);
    expect(report.engineeringMet).toBe(true);
  });
});
