import { PROFILE_ID_REGEX } from "../crypto";
import { htmlResponse, requestOrigin } from "../http/resolver";
import { loadScanContext } from "../db/scan";
import {
  buildScanViewModel,
  malformedScanView,
  QR_ID_REGEX,
} from "./scan-state";
import { SCAN_UI_VERSION } from "./scan-html";
import {
  buildScanOutInterstitialUrl,
  resolveScanOutHmacSecret,
  verifyScanOutToken,
} from "./scan-out-token";
import {
  renderScanOutErrorPage,
  renderScanOutInterstitialPage,
} from "./scan-out-html";
import type { Env } from "../index";

export { buildScanOutInterstitialUrl, validateExternalDestinationUrl } from "./scan-out-token";

/**
 * GET /c/{profile_id}/out?t={token}[&go=1]
 * Signed interstitial before leaving humanity.llc (Phase E).
 */
export async function handleGetScanOut(
  request: Request,
  env: D1Database,
  profileId: string,
  workerEnv: Env
): Promise<Response> {
  const origin = requestOrigin(request);
  const url = new URL(request.url);
  const token = url.searchParams.get("t")?.trim() ?? "";
  const go = url.searchParams.get("go") === "1";

  const stayBase = `${origin}/c/${encodeURIComponent(profileId)}`;

  if (!PROFILE_ID_REGEX.test(profileId)) {
    return htmlResponse(
      renderScanOutErrorPage("Invalid card id.", origin, origin),
      400,
      { "Cache-Control": "no-store", "X-HC-Scan-UI": SCAN_UI_VERSION }
    );
  }

  if (!token) {
    return htmlResponse(
      renderScanOutErrorPage(
        "Missing link token. External opens must use a signed /out URL.",
        stayBase,
        origin
      ),
      400,
      { "Cache-Control": "no-store", "X-HC-Scan-UI": SCAN_UI_VERSION }
    );
  }

  const secret = resolveScanOutHmacSecret(workerEnv);
  const verified = await verifyScanOutToken(secret, token, { profileId });
  if (!verified.ok) {
    return htmlResponse(
      renderScanOutErrorPage(verified.message, stayBase, origin),
      403,
      { "Cache-Control": "no-store", "X-HC-Scan-UI": SCAN_UI_VERSION }
    );
  }

  const { payload, domain, known } = verified;
  const stayUrl = `${stayBase}?q=${encodeURIComponent(payload.qr_id)}`;
  const ctx = await loadScanContext(env, profileId, payload.qr_id);
  const vm = buildScanViewModel(profileId, payload.qr_id, ctx, origin);

  if (go) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: payload.url,
        "Cache-Control": "no-store",
        "X-HC-Scan-Out": "continue",
        "X-HC-Scan-UI": SCAN_UI_VERSION,
      },
    });
  }

  const continueUrl = `${stayBase}/out?t=${encodeURIComponent(token)}&go=1`;
  const html = renderScanOutInterstitialPage(
    {
      domain,
      targetUrl: payload.url,
      known,
      stayUrl,
      continueUrl,
      vm,
    },
    origin
  );

  return htmlResponse(html, 200, {
    "Cache-Control": "no-store",
    "X-HC-Scan-Out": "interstitial",
    "X-HC-Scan-UI": SCAN_UI_VERSION,
  });
}
