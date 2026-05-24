import { loadScanContext } from "../db/scan";
import { getLiveControlChallenge } from "../db/live-control";
import { PROFILE_ID_REGEX } from "../crypto";
import { htmlResponse, requestOrigin } from "../http/resolver";
import { renderScanPage, SCAN_UI_VERSION } from "./scan-html";
import {
  buildScanViewModel,
  httpStatusForScanKind,
  malformedScanView,
  QR_ID_REGEX,
  type ScanViewModel,
} from "./scan-state";

const CHALLENGE_ID_REGEX =
  /^lc_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{12,40}$/;
const LIVE_CONTROL_PROOF_DISPLAY_TTL_MS = 5 * 60_000;
const CACHE_EPHEMERAL_PROOF = "no-store";

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
  const vm = buildScanViewModel(profileId, qrId, ctx, origin);
  await applyLiveControlProofIfPresent(
    env,
    vm,
    profileId,
    qrId,
    liveChallengeId,
    new Date()
  );

  return htmlResponse(await renderScanPage(vm, origin), httpStatusForScanKind(vm.kind), {
    "Cache-Control": vm.cacheControl,
    "X-HC-Scan-UI": SCAN_UI_VERSION,
  });
}

async function applyLiveControlProofIfPresent(
  db: D1Database,
  vm: ScanViewModel,
  profileId: string,
  qrId: string,
  challengeId: string | null,
  now: Date
): Promise<void> {
  if (!challengeId) return;

  vm.cacheControl = CACHE_EPHEMERAL_PROOF;
  if (vm.kind !== "active" || !CHALLENGE_ID_REGEX.test(challengeId)) return;

  try {
    const challenge = await getLiveControlChallenge(db, challengeId);
    if (
      !challenge ||
      challenge.profile_id !== profileId ||
      challenge.qr_id !== qrId ||
      challenge.status !== "proven" ||
      !challenge.proven_at
    ) {
      return;
    }

    const provenAt = Date.parse(challenge.proven_at);
    if (!Number.isFinite(provenAt)) return;
    if (provenAt + LIVE_CONTROL_PROOF_DISPLAY_TTL_MS < now.getTime()) return;

    vm.liveControlAvailable = true;
  } catch (e) {
    if (String(e).includes("live_control_challenges")) return;
    throw e;
  }
}
