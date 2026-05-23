import { loadScanContext } from "../db/scan";
import { PROFILE_ID_REGEX } from "../crypto";
import { htmlResponse, requestOrigin } from "../http/resolver";
import { renderScanPage, SCAN_UI_VERSION } from "./scan-html";
import { scanQrDataUrl } from "./scan-qr";
import {
  buildScanViewModel,
  httpStatusForScanKind,
  malformedScanView,
  QR_ID_REGEX,
} from "./scan-state";

export async function handleGetScan(
  request: Request,
  env: D1Database,
  profileId: string
): Promise<Response> {
  const origin = requestOrigin(request);
  const url = new URL(request.url);
  const qrRaw = url.searchParams.get("q");
  const qrId = qrRaw?.trim() ?? null;

  if (!PROFILE_ID_REGEX.test(profileId)) {
    const vm = malformedScanView(profileId, qrId, origin);
    return htmlResponse(await renderScanPage(vm, origin), 400, {
      "Cache-Control": vm.cacheControl,
      "X-HC-Scan-UI": SCAN_UI_VERSION,
    });
  }

  if (!qrId) {
    const vm = malformedScanView(profileId, null, origin);
    return htmlResponse(await renderScanPage(vm, origin), 400, {
      "Cache-Control": vm.cacheControl,
      "X-HC-Scan-UI": SCAN_UI_VERSION,
    });
  }

  if (!QR_ID_REGEX.test(qrId)) {
    const vm = malformedScanView(profileId, qrId, origin);
    return htmlResponse(await renderScanPage(vm, origin), 400, {
      "Cache-Control": vm.cacheControl,
      "X-HC-Scan-UI": SCAN_UI_VERSION,
    });
  }

  const ctx = await loadScanContext(env, profileId, qrId);
  const vm = buildScanViewModel(profileId, qrId, ctx, origin);

  return htmlResponse(await renderScanPage(vm, origin), httpStatusForScanKind(vm.kind), {
    "Cache-Control": vm.cacheControl,
    "X-HC-Scan-UI": SCAN_UI_VERSION,
  });
}
