/**
 * GET /v/{code} — steward scan handoff interstitial (S6).
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md § S6
 */

import { htmlResponse, requestOrigin } from "../http/resolver";
import { appendStewardScanQueryParam } from "../../../site/js/scan-pwa-camera-handoff-core.mjs";
import {
  buildStewardHandoffScanUrl,
  decodeStewardHandoffCode,
} from "../../../site/js/steward-handoff-code-core.mjs";
import {
  renderStewardHandoffErrorPage,
  renderStewardHandoffInterstitialPage,
} from "./steward-handoff-html";

export const STEWARD_HANDOFF_UI_VERSION = "s6-v1";

/**
 * @param {Request} request
 * @param {string} code
 */
export async function handleGetStewardHandoff(
  request: Request,
  code: string
): Promise<Response> {
  const origin = requestOrigin(request);
  const url = new URL(request.url);
  const go = url.searchParams.get("go") === "1";

  const parts = decodeStewardHandoffCode(code);
  if (!parts) {
    return htmlResponse(
      renderStewardHandoffErrorPage(
        "The short link is malformed or expired. Scan the public QR again or paste the full scan URL in your Home Screen app.",
        origin
      ),
      400,
      {
        "Cache-Control": "no-store",
        "X-HC-Steward-Handoff": "invalid",
      }
    );
  }

  const scanUrl = appendStewardScanQueryParam(
    buildStewardHandoffScanUrl(parts, origin)
  );
  const base = origin.replace(/\/$/, "");
  const continueUrl = `${base}/v/${encodeURIComponent(code)}?go=1`;

  if (go) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: scanUrl,
        "Cache-Control": "no-store",
        "X-HC-Steward-Handoff": "redirect",
      },
    });
  }

  const html = renderStewardHandoffInterstitialPage({
    origin,
    scanUrl,
    continueUrl,
  });

  return htmlResponse(html, 200, {
    "Cache-Control": "no-store",
    "X-HC-Steward-Handoff": "interstitial",
    "X-HC-Steward-Handoff-UI": STEWARD_HANDOFF_UI_VERSION,
  });
}
