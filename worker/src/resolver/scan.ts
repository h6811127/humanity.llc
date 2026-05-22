import { loadScanContext } from "../db/scan";
import { PROFILE_ID_REGEX } from "../crypto";
import { htmlResponse, requestOrigin } from "../http/resolver";
import { renderScanPage } from "./scan-html";
import {
  buildScanViewModel,
  malformedScanView,
  QR_ID_REGEX,
} from "./scan-state";

export async function handleGetScan(
  request: Request,
  db: D1Database,
  profileId: string
): Promise<Response> {
  const origin = requestOrigin(request);
  const url = new URL(request.url);
  const qrRaw = url.searchParams.get("q");
  const qrId = qrRaw?.trim() ?? null;

  if (!PROFILE_ID_REGEX.test(profileId)) {
    const vm = malformedScanView(profileId, qrId);
    return htmlResponse(renderScanPage(vm, origin), 400, {
      "Cache-Control": vm.cacheControl,
    });
  }

  if (!qrId) {
    const vm = malformedScanView(profileId, null);
    return htmlResponse(renderScanPage(vm, origin), 400, {
      "Cache-Control": vm.cacheControl,
    });
  }

  if (!QR_ID_REGEX.test(qrId)) {
    const vm = malformedScanView(profileId, qrId);
    return htmlResponse(renderScanPage(vm, origin), 400, {
      "Cache-Control": vm.cacheControl,
    });
  }

  const ctx = await loadScanContext(db, profileId, qrId);
  const vm = buildScanViewModel(profileId, qrId, ctx);

  const status =
    vm.kind === "active"
      ? 200
      : vm.kind === "unknown_profile" || vm.kind === "unknown_qr"
        ? 404
        : vm.kind === "profile_qr_mismatch" || vm.kind === "malformed"
          ? 400
          : 200;

  return htmlResponse(renderScanPage(vm, origin), status, {
    "Cache-Control": vm.cacheControl,
  });
}
