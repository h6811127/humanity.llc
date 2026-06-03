import { GAME_NODE_OBJECT_TYPE, isCityGameEnabled } from "../city-game/constants";
import {
  isSeasonRootProfile,
  resolveSeasonForProfile,
} from "../city-game/season-loader";
import { reconcileSeasonUnlockDrift } from "../city-game/unlock-evaluator";
import { loadScanContext, type ScanContext } from "../db/scan";
import { getLiveControlChallenge, getRecentLiveControlProof } from "../db/live-control";
import { PROFILE_ID_REGEX } from "../crypto";
import { htmlResponse, requestOrigin, type ScanPageOriginEnv } from "../http/resolver";
import { renderScanPage, SCAN_UI_VERSION } from "./scan-html";
import { buildScanSafetyModel } from "./scan-safety";
import {
  buildScanViewModel,
  httpStatusForScanKind,
  malformedScanView,
  QR_ID_REGEX,
  resolveScanMalformedReason,
  type ScanViewModel,
} from "./scan-state";
import { guardScanResponse, scanRedirectQueryBlocked } from "./scan-redirect-guard";

const CHALLENGE_ID_REGEX =
  /^lc_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{12,40}$/;
const LIVE_CONTROL_PROOF_DISPLAY_TTL_MS = 5 * 60_000;
const CACHE_EPHEMERAL_PROOF = "no-store";

export async function handleGetScan(
  request: Request,
  env: {
    DB: D1Database;
    CITY_GAME_ENABLED?: string;
    CITY_GAME_LOCAL_PLAY_OPEN?: string;
    SCAN_PAGES_JS_ORIGIN?: string;
    SCAN_RESOLVER_ORIGIN?: string;
  },
  profileId: string
): Promise<Response> {
  const origin = requestOrigin(request);
  const url = new URL(request.url);
  const scanOriginEnv: ScanPageOriginEnv = {
    SCAN_PAGES_JS_ORIGIN: env.SCAN_PAGES_JS_ORIGIN,
    SCAN_RESOLVER_ORIGIN: env.SCAN_RESOLVER_ORIGIN,
  };

  if (scanRedirectQueryBlocked(url)) {
    const qrRaw = url.searchParams.get("q");
    const vm = malformedScanView(
      profileId,
      qrRaw?.trim() ?? null,
      origin,
      resolveScanMalformedReason(profileId, qrRaw?.trim() ?? null, {
        redirectBlocked: true,
      })
    );
    return guardScanResponse(
      request,
      htmlResponse(await renderScanPage(vm, origin, undefined, request, scanOriginEnv), 400, {
        "Cache-Control": vm.cacheControl,
        "X-HC-Scan-UI": SCAN_UI_VERSION,
        "X-HC-Scan-Redirect-Blocked": "query",
      })
    );
  }

  const qrRaw = url.searchParams.get("q");
  const qrId = qrRaw?.trim() ?? null;
  const liveChallengeId = url.searchParams.get("live_challenge")?.trim() ?? null;

  if (!PROFILE_ID_REGEX.test(profileId)) {
    const vm = malformedScanView(profileId, qrId, origin);
    return guardScanResponse(
      request,
      htmlResponse(await renderScanPage(vm, origin, undefined, request, scanOriginEnv), 400, {
        "Cache-Control": vm.cacheControl,
        "X-HC-Scan-UI": SCAN_UI_VERSION,
      })
    );
  }

  if (!qrId) {
    const vm = malformedScanView(profileId, null, origin);
    return guardScanResponse(
      request,
      htmlResponse(await renderScanPage(vm, origin, undefined, request, scanOriginEnv), 400, {
        "Cache-Control": vm.cacheControl,
        "X-HC-Scan-UI": SCAN_UI_VERSION,
      })
    );
  }

  if (!QR_ID_REGEX.test(qrId)) {
    const vm = malformedScanView(profileId, qrId, origin);
    return guardScanResponse(
      request,
      htmlResponse(await renderScanPage(vm, origin, undefined, request, scanOriginEnv), 400, {
        "Cache-Control": vm.cacheControl,
        "X-HC-Scan-UI": SCAN_UI_VERSION,
      })
    );
  }

  const now = new Date();
  const season = resolveSeasonForProfile(profileId);
  const ctx = await loadScanContextWithUnlockDriftRepair(
    env.DB,
    profileId,
    qrId,
    now,
    env,
    season
  );
  const vm = buildScanViewModel(profileId, qrId, ctx, origin, now, {
    env: {
      CITY_GAME_ENABLED: env.CITY_GAME_ENABLED,
      CITY_GAME_LOCAL_PLAY_OPEN: env.CITY_GAME_LOCAL_PLAY_OPEN,
    },
    season: season ?? undefined,
  });
  await applyLiveControlProofIfPresent(
    env.DB,
    vm,
    profileId,
    qrId,
    liveChallengeId,
    now
  );
  await applyRecentLiveControlProof(env.DB, vm, profileId, qrId, now);

  const safety = await buildScanSafetyModel(ctx, vm);

  return guardScanResponse(
    request,
    htmlResponse(
      await renderScanPage(vm, origin, safety, request, scanOriginEnv),
      httpStatusForScanKind(vm.kind),
      {
        "Cache-Control": vm.cacheControl,
        "X-HC-Scan-UI": SCAN_UI_VERSION,
      }
    )
  );
}

async function loadScanContextWithUnlockDriftRepair(
  db: D1Database,
  profileId: string,
  qrId: string,
  now: Date,
  env: { CITY_GAME_ENABLED?: string },
  season: ReturnType<typeof resolveSeasonForProfile>
): Promise<ScanContext> {
  let ctx = await loadScanContext(db, profileId, qrId);
  if (!shouldRepairGameUnlockDriftOnScan(env, profileId, ctx, season)) return ctx;

  const { repaired } = await reconcileSeasonUnlockDrift(db, now, season!);
  if (repaired.length > 0) {
    ctx = await loadScanContext(db, profileId, qrId);
  }
  return ctx;
}

function shouldRepairGameUnlockDriftOnScan(
  env: { CITY_GAME_ENABLED?: string },
  profileId: string,
  ctx: ScanContext,
  season: ReturnType<typeof resolveSeasonForProfile>
): boolean {
  if (!isCityGameEnabled(env)) return false;
  if (!season) return false;
  if (ctx.childObject?.object_type !== GAME_NODE_OBJECT_TYPE) return false;
  return isSeasonRootProfile(profileId, season);
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
    vm.liveControlProvenAt = challenge.proven_at;
  } catch (e) {
    if (String(e).includes("live_control_challenges")) return;
    throw e;
  }
}

async function applyRecentLiveControlProof(
  db: D1Database,
  vm: ScanViewModel,
  profileId: string,
  qrId: string,
  now: Date
): Promise<void> {
  if (vm.liveControlAvailable || vm.kind !== "active") return;

  const provenAfter = new Date(
    now.getTime() - LIVE_CONTROL_PROOF_DISPLAY_TTL_MS
  ).toISOString();

  try {
    const challenge = await getRecentLiveControlProof(
      db,
      profileId,
      qrId,
      provenAfter
    );
    if (!challenge?.proven_at) return;

    vm.cacheControl = CACHE_EPHEMERAL_PROOF;
    vm.liveControlAvailable = true;
    vm.liveControlProvenAt = challenge.proven_at;
  } catch (e) {
    if (String(e).includes("live_control_challenges")) return;
    throw e;
  }
}
