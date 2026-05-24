import { loadScanContext } from "../db/scan";
import { getLiveControlChallenge } from "../db/live-control";
import { PROFILE_ID_REGEX } from "../crypto";
import { htmlResponse, requestOrigin } from "../http/resolver";
import { renderScanPage, SCAN_UI_VERSION } from "./scan-html";
import {
  isLiveControlProofFresh,
  LIVE_CONTROL_CHALLENGE_ID_REGEX,
} from "./live-control";
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
  const liveChallengeId = url.searchParams.get("live_challenge")?.trim() ?? null;

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
  const vm = await applyLiveControlChallengeState(
    env,
    buildScanViewModel(profileId, qrId, ctx, origin),
    profileId,
    qrId,
    liveChallengeId
  );
  const cacheControl = liveChallengeId ? "no-store" : vm.cacheControl;

  return htmlResponse(await renderScanPage(vm, origin), httpStatusForScanKind(vm.kind), {
    "Cache-Control": cacheControl,
    "X-HC-Scan-UI": SCAN_UI_VERSION,
  });
}

async function applyLiveControlChallengeState(
  db: D1Database,
  vm: Awaited<ReturnType<typeof buildScanViewModel>>,
  profileId: string,
  qrId: string,
  liveChallengeId: string | null
) {
  if (
    vm.kind !== "active" ||
    !liveChallengeId ||
    !LIVE_CONTROL_CHALLENGE_ID_REGEX.test(liveChallengeId)
  ) {
    return vm;
  }

  const challenge = await getLiveControlChallenge(db, liveChallengeId);
  if (
    !challenge ||
    challenge.profile_id !== profileId ||
    challenge.qr_id !== qrId ||
    challenge.status !== "proven" ||
    !isLiveControlProofFresh(challenge.proven_at)
  ) {
    return vm;
  }

  return {
    ...vm,
    liveControlAvailable: true,
  };
}
