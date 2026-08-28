import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  DOCKET_PHOTO_CAPTION,
  assertStarterFourPhotosNotLicensed,
  renderDocketPhotoSlotHtml,
  resolveDocketPhotoSlot,
} from "../../site/js/docket-photo-core.mjs";
import { validateDocketPhotoLicenseChecklist } from "../../site/js/docket-case-core.mjs";
import { assessWsDocketPhotoPreflight } from "../scripts/ws-docket-photo-preflight-core.mjs";
import {
  buildWsDocketPhotoKitHtml,
  validateWsDocketPhotoKitHtml,
} from "../scripts/ws-docket-photo-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = join(root, "site/data");

describe("docket-photo-core (Phase 2)", () => {
  it("fails open to monogram unless licensed site path", () => {
    expect(
      resolveDocketPhotoSlot({
        photoRef: "/assets/x.png",
        licenseStatus: "not_licensed",
      }).mode
    ).toBe("monogram");
    expect(
      resolveDocketPhotoSlot({
        photoRef: "https://evil.example/face.jpg",
        licenseStatus: "licensed",
      }).mode
    ).toBe("monogram");
    const ok = resolveDocketPhotoSlot({
      photoRef: "/assets/docket/demo.png",
      licenseStatus: "licensed",
      checklistPhotoRef: "/assets/docket/demo.png",
    });
    expect(ok.mode).toBe("photo");
    expect(ok.caption).toBe(DOCKET_PHOTO_CAPTION);
  });

  it("renders photo img only when licensed", () => {
    const mono = renderDocketPhotoSlotHtml({
      monogram: "SA",
      licenseStatus: "not_licensed",
    });
    expect(mono).toContain("docket-plate-mono-text");
    expect(mono).not.toContain("<img");
    const photo = renderDocketPhotoSlotHtml({
      monogram: "SA",
      photoRef: "/assets/red_qr_transparent_bg.png",
      licenseStatus: "licensed",
      checklistPhotoRef: "/assets/red_qr_transparent_bg.png",
      showCaption: true,
    });
    expect(photo).toContain("<img");
    expect(photo).toContain(DOCKET_PHOTO_CAPTION);
    expect(photo).toContain('data-docket-photo="1"');
  });

  it("keeps starter-four checklist not_licensed", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-photo-license-checklist.json"), "utf8")
    );
    expect(validateDocketPhotoLicenseChecklist(raw).ok).toBe(true);
    expect(assertStarterFourPhotosNotLicensed(raw).ok).toBe(true);
  });
});

describe("ws-docket-photo kit + preflight", () => {
  it("builds valid kit HTML", () => {
    const html = buildWsDocketPhotoKitHtml({ origin: "http://127.0.0.1:8788" });
    expect(validateWsDocketPhotoKitHtml(html)).toBe(true);
  });

  it("preflight ready after kit write", () => {
    const report = assessWsDocketPhotoPreflight(root);
    expect(report.engineeringMet).toBe(true);
  });
});
