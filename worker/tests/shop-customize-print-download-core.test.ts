import { describe, expect, it } from "vitest";

import {
  fetchPrintArtifactSvg,
  parsePrintArtifactDownloadResponse,
  printArtifactDownloadFilename,
} from "../../site/js/shop-customize-print-download-core.mjs";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

describe("shop-customize-print-download-core", () => {
  it("builds profile-qr filename", () => {
    expect(printArtifactDownloadFilename(PROFILE, QR)).toBe(`${PROFILE}-${QR}.svg`);
  });

  it("parses artwork_svg from print artifacts response", () => {
    const parsed = parsePrintArtifactDownloadResponse({
      scan_url: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
      artwork_svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    });
    expect(parsed.scanUrl).toContain(PROFILE);
    expect(parsed.svg).toContain("<svg");
  });

  it("fetchPrintArtifactSvg posts planned ids to /v1/print/artifacts", async () => {
    let posted: Record<string, unknown> | null = null;
    const result = await fetchPrintArtifactSvg({
      apiOrigin: "https://humanity.llc",
      profileId: PROFILE,
      qrId: QR,
      printArtifactId: "pa_test123",
      printFrameBackground: "full",
      printVariantId: "black-m",
      fetchImpl: async (_url, init) => {
        posted = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            scan_url: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
            artwork_svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      },
    });
    expect(posted).toMatchObject({
      profile_id: PROFILE,
      qr_id: QR,
      template_id: "hc-glitch-hoodie-v1",
      print_artifact_id: "pa_test123",
      print_frame_background: "full",
      print_variant_id: "black-m",
    });
    expect(result.svg).toContain("<svg");
  });
});
