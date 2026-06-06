import { describe, expect, it } from "vitest";

import { handleGetPrintCatalog, handlePostPrintArtifacts } from "../src/print/print-handlers";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

describe("print handlers (O-002)", () => {
  it("GET /v1/print/catalog returns approved templates", async () => {
    const res = await handleGetPrintCatalog();
    const json = (await res.json()) as { products: { template_id: string }[] };
    expect(res.status).toBe(200);
    expect(json.products.some((p) => p.template_id === "hc-sticker-square-v1")).toBe(true);
    expect(json.products.some((p) => p.template_id === "hc-hoodie-live-object-v1")).toBe(true);
    expect(json.products.some((p) => p.template_id === "hc-tier0-sticker-batch-v1")).toBe(true);
  });

  it("POST /v1/print/artifacts generates sticker SVG artwork", async () => {
    const res = await handlePostPrintArtifacts(
      new Request("https://humanity.llc/v1/print/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: PROFILE,
          qr_id: QR,
          print_artifact_id: "pa_previewTest123456",
          template_id: "hc-sticker-square-v1",
        }),
      })
    );
    const json = (await res.json()) as {
      scan_url: string;
      qr_scan_status: string;
      artwork: { format: string; bytes: number };
      artwork_svg: string;
    };
    expect(res.status).toBe(200);
    expect(json.scan_url).toContain(PROFILE);
    expect(json.scan_url).toContain(QR);
    expect(json.qr_scan_status).toBe("passed");
    expect(json.artwork.format).toBe("svg");
    expect(json.artwork.bytes).toBeGreaterThan(500);
    expect(json.artwork_svg).toContain("<svg");
    expect(json.artwork.bytes).toBe(json.artwork_svg.length);
  });

  it("POST /v1/print/artifacts honors glitch print_frame_background", async () => {
    const res = await handlePostPrintArtifacts(
      new Request("https://humanity.llc/v1/print/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: PROFILE,
          qr_id: QR,
          template_id: "hc-glitch-hoodie-v1",
          print_frame_background: "full",
          print_variant_id: "navy-m",
        }),
      })
    );
    const json = (await res.json()) as { print_frame_background: string; artwork_svg: string };
    expect(res.status).toBe(200);
    expect(json.print_frame_background).toBe("full");
    expect(json.artwork_svg).toContain("<svg");
  });
});
