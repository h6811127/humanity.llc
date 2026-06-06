/**
 * Download print SVG from POST /v1/print/artifacts (Tier 1 Glitch planned QR).
 * @see docs/MERCH_HEADLESS_COMMERCE.md
 */

import { GLITCH_HOODIE_TEMPLATE_ID } from "./shop-print-catalog-core.mjs";

/**
 * @param {string} profileId
 * @param {string} qrId
 */
export function printArtifactDownloadFilename(profileId, qrId) {
  const pid = profileId.trim();
  const qid = qrId.trim();
  if (!pid || !qid) throw new Error("Missing profile or QR id for download filename.");
  return `${pid}-${qid}.svg`;
}

/**
 * @param {unknown} payload
 * @returns {{ scanUrl: string, svg: string }}
 */
export function parsePrintArtifactDownloadResponse(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid print artwork response.");
  }
  const scanUrl = typeof payload.scan_url === "string" ? payload.scan_url.trim() : "";
  const svg =
    typeof payload.artwork_svg === "string"
      ? payload.artwork_svg
      : typeof payload.artwork?.svg === "string"
        ? payload.artwork.svg
        : "";
  if (!scanUrl) throw new Error("Print artwork response missing scan_url.");
  if (!svg.trim() || !svg.includes("<svg")) {
    throw new Error("Print artwork response missing SVG body.");
  }
  return { scanUrl, svg };
}

/**
 * @param {{
 *   apiOrigin: string;
 *   profileId: string;
 *   qrId: string;
 *   printArtifactId?: string | null;
 *   printFrameBackground?: string | null;
 *   printVariantId?: string | null;
 *   templateId?: string;
 *   fetchImpl?: typeof fetch;
 * }} input
 */
export async function fetchPrintArtifactSvg(input) {
  const origin = input.apiOrigin.replace(/\/$/, "");
  /** @type {Record<string, string>} */
  const body = {
    profile_id: input.profileId,
    qr_id: input.qrId,
    template_id: input.templateId ?? GLITCH_HOODIE_TEMPLATE_ID,
  };
  if (input.printArtifactId) body.print_artifact_id = input.printArtifactId;
  if (input.printFrameBackground) body.print_frame_background = input.printFrameBackground;
  if (input.printVariantId) body.print_variant_id = input.printVariantId;

  const fetchImpl = input.fetchImpl ?? fetch;
  const res = await fetchImpl(`${origin}/v1/print/artifacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "Could not generate print file.";
    throw new Error(msg);
  }
  return parsePrintArtifactDownloadResponse(data);
}

/**
 * @param {string} svg
 * @param {string} filename
 * @param {{ createObjectURL?: (blob: Blob) => string, revokeObjectURL?: (url: string) => void, appendChild?: (node: HTMLElement) => void, removeChild?: (node: HTMLElement) => void, createElement?: (tag: string) => HTMLElement, click?: () => void }} [doc]
 */
export function triggerSvgDownload(svg, filename, doc = document) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = doc.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  doc.body?.appendChild(anchor);
  anchor.click();
  doc.body?.removeChild(anchor);
  URL.revokeObjectURL(url);
}
