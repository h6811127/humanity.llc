import { PROFILE_ID_REGEX } from "../crypto";
import { errorResponse, jsonResponse, requestOrigin } from "../http/resolver";
import {
  getApprovedPrintCatalog,
  getPrintCatalogProduct,
  GLITCH_HOODIE_STORE_PRODUCT_ID,
  GLITCH_HOODIE_TEMPLATE_ID,
} from "./print-catalog";
import { renderPrintArtworkFromScanUrl } from "../resolver/scan-qr";
import { QR_ID_REGEX } from "../resolver/scan-state";
import { resolveArtifactIntentPrintFrameBackground } from "./print-frame-background";
import type { BuyerPrintFrameBackground } from "./print-frame-background";

interface PrintArtifactRequest {
  profile_id?: unknown;
  qr_id?: unknown;
  print_artifact_id?: unknown;
  template_id?: unknown;
  variant_id?: unknown;
  print_variant_id?: unknown;
  print_frame_background?: unknown;
}

function scanUrl(origin: string, profileId: string, qrId: string): string {
  return `${origin.replace(/\/$/, "")}/c/${encodeURIComponent(profileId)}?q=${encodeURIComponent(qrId)}`;
}

/** POST /v1/print/artifacts — print-ready QR artwork preview (no mint). */
export async function handlePostPrintArtifacts(request: Request): Promise<Response> {
  let body: PrintArtifactRequest;
  try {
    body = (await request.json()) as PrintArtifactRequest;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const profileId = typeof body.profile_id === "string" ? body.profile_id.trim() : "";
  const qrId = typeof body.qr_id === "string" ? body.qr_id.trim() : "";
  const printArtifactId =
    typeof body.print_artifact_id === "string" ? body.print_artifact_id.trim() : "";
  const templateId =
    typeof body.template_id === "string" && body.template_id.trim()
      ? body.template_id.trim()
      : "hc-sticker-square-v1";

  if (!PROFILE_ID_REGEX.test(profileId)) {
    return errorResponse("INVALID_PROFILE_ID", "Invalid profile_id.", 422);
  }
  if (!QR_ID_REGEX.test(qrId)) {
    return errorResponse("INVALID_QR_ID", "Invalid qr_id.", 422);
  }

  const template = getPrintCatalogProduct(templateId);
  if (!template) {
    return errorResponse("UNKNOWN_TEMPLATE", "Unknown print template_id.", 422);
  }

  const printVariantId =
    typeof body.print_variant_id === "string"
      ? body.print_variant_id.trim()
      : typeof body.variant_id === "string"
        ? body.variant_id.trim()
        : "";

  let printFrameBackground: BuyerPrintFrameBackground | null = null;
  if (templateId === GLITCH_HOODIE_TEMPLATE_ID) {
    printFrameBackground = resolveArtifactIntentPrintFrameBackground({
      product_id: GLITCH_HOODIE_STORE_PRODUCT_ID,
      print_variant_id: printVariantId || null,
      print_frame_background: body.print_frame_background,
    });
  }

  const url = scanUrl(requestOrigin(request), profileId, qrId);
  let svg: string;
  try {
    svg = await renderPrintArtworkFromScanUrl(url, templateId, printFrameBackground);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Artwork generation failed.";
    return errorResponse("PRINT_QR_SCAN_FAILED", msg, 422);
  }

  return jsonResponse(
    {
      profile_id: profileId,
      qr_id: qrId,
      print_artifact_id: printArtifactId || null,
      template_id: templateId,
      scan_url: url,
      status: "proofed",
      qr_scan_status: "passed",
      artwork: {
        format: "svg",
        bytes: svg.length,
      },
      artwork_svg: svg,
      ...(printFrameBackground ? { print_frame_background: printFrameBackground } : {}),
      ...(printVariantId ? { print_variant_id: printVariantId } : {}),
      preview_url: printArtifactId
        ? `${requestOrigin(request)}/print/previews/${printArtifactId}`
        : null,
    },
    200
  );
}

/** GET /v1/print/catalog */
export async function handleGetPrintCatalog(): Promise<Response> {
  return jsonResponse({ products: getApprovedPrintCatalog() });
}
