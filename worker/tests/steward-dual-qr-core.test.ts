import { describe, expect, it } from "vitest";

import {
  buildStewardDualQrMaterials,
  dualQrHandoffOrigin,
  isAllowedStewardHandoffEncodeUrl,
  resolveDualQrScanUrl,
  stewardDualQrDownloadFilenames,
} from "../../site/js/steward-dual-qr-core.mjs";
import { buildOfficialScanUrl } from "../../site/js/qr-scan-url-lock.mjs";
import { buildStewardHandoffShortUrl } from "../../site/js/steward-handoff-code-core.mjs";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const SCAN_URL = `https://humanity.llc/c/${PROFILE}?q=${QR}`;

describe("buildStewardDualQrMaterials (S7)", () => {
  it("keeps public scan URL unchanged and adds steward handoff URL", () => {
    const materials = buildStewardDualQrMaterials(SCAN_URL);
    expect(materials.publicScanUrl).toBe(SCAN_URL);
    expect(materials.hasStewardHandoff).toBe(true);
    expect(materials.stewardHandoffUrl).toBe(buildStewardHandoffShortUrl(SCAN_URL));
    expect(materials.stewardHandoffUrl).toMatch(/^https:\/\/humanity\.llc\/v\//);
  });

  it("returns no steward handoff for invalid scan URLs", () => {
    const materials = buildStewardDualQrMaterials("https://example.com/c/x?q=qr_y");
    expect(materials.hasStewardHandoff).toBe(false);
    expect(materials.stewardHandoffUrl).toBeNull();
  });

  it("resolveDualQrScanUrl rebuilds when session scan_url has extra query params", () => {
    const canonical = buildOfficialScanUrl(PROFILE, QR);
    const messy = `${canonical}&hc_ref=scan_customize`;
    expect(resolveDualQrScanUrl(messy, PROFILE, QR)).toBe(canonical);
    const materials = buildStewardDualQrMaterials(
      resolveDualQrScanUrl(messy, PROFILE, QR)!,
      "https://humanity.llc"
    );
    expect(materials.hasStewardHandoff).toBe(true);
  });

  it("dualQrHandoffOrigin follows the public scan URL host", () => {
    const scan = buildOfficialScanUrl(PROFILE, QR);
    expect(dualQrHandoffOrigin(scan, "https://www.humanity.llc")).toBe("https://humanity.llc");
  });
});

describe("isAllowedStewardHandoffEncodeUrl", () => {
  it("allows valid /v/ handoff URLs for QR encoding", () => {
    const short = buildStewardHandoffShortUrl(SCAN_URL)!;
    expect(isAllowedStewardHandoffEncodeUrl(short)).toBe(true);
    expect(isAllowedStewardHandoffEncodeUrl("https://humanity.llc/v/not-valid")).toBe(false);
  });
});

describe("stewardDualQrDownloadFilenames", () => {
  it("names public and steward PNG downloads distinctly", () => {
    const names = stewardDualQrDownloadFilenames(SCAN_URL, "demo");
    expect(names.publicFilename).toBe("humanity-demo-public-qr.png");
    expect(names.stewardFilename).toBe("humanity-demo-steward-handoff-qr.png");
  });
});

describe("/created/ dual-QR HTML guards (S7)", () => {
  it("includes steward QR column and download controls", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const html = readFileSync(join(process.cwd(), "site/created/index.html"), "utf8");
    expect(html).toContain('id="qr-img-steward"');
    expect(html).toContain('id="download-steward-qr"');
    expect(html).toContain('id="copy-steward-handoff"');
    expect(html).toContain('id="created-steward-qr-col"');
    expect(html).not.toContain('id="created-setup-steward-qr-img"');
    expect(html).toContain('id="created-print-steward-discovery"');
    expect(html).toContain('id="created-print-steward-cta"');
    expect(html).toContain("Download public QR");
  });

  it("created.mjs wires dual QR materials and print discovery", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(process.cwd(), "site/js/created.mjs"), "utf8");
    expect(src).toContain("buildStewardDualQrMaterials");
    expect(src).toContain("syncStewardDualQrMaterials");
    expect(src).toContain("renderBrandedQrToImage");
    expect(src).toContain("PRINT_SHARE_STEWARD_DISCOVERY");
    expect(src).toContain("created-print-steward-discovery");
  });
});
