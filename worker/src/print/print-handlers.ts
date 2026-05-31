import { PROFILE_ID_REGEX } from "../crypto";
import { errorResponse, jsonResponse, requestOrigin } from "../http/resolver";
import { getApprovedPrintCatalog, getPrintCatalogProduct } from "./print-catalog";
import { renderPrintArtworkFromScanUrl } from "../resolver/scan-qr";
import { QR_ID_REGEX } from "../resolver/scan-state";

interface PrintArtifactRequest {
  profile_id?: unknown;
  qr_id?: unknown;
  print_artifact_id?: unknown;
  template_id?: unknown;
  variant_id?: unknown;
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

  const url = scanUrl(requestOrigin(request), profileId, qrId);
  let svg: string;
  try {
    svg = await renderPrintArtworkFromScanUrl(url, templateId);
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
