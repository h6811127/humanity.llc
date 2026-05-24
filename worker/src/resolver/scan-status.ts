import { loadScanContext, type ScanContext } from "../db/scan";
import { PROFILE_ID_REGEX } from "../crypto";
import {
  jsonResponse,
  OPERATOR_ID,
  PROTOCOL_VERSION,
  requestOrigin,
} from "../http/resolver";
import {
  buildCardOnlyScanViewModel,
  buildScanViewModel,
  httpStatusForScanKind,
  malformedScanView,
  QR_ID_REGEX,
  type ScanPageKind,
  type ScanViewModel,
} from "./scan-state";
import { BEARER_WARNING } from "./trust-copy";
import { humanTrustDisplay } from "./verification-display";

export { BEARER_WARNING };

export interface ScanStatusBody {
  version: string;
  resolver: { operator: string; version: string };
  scan: {
    kind: ScanPageKind;
    profile_id: string | null;
    qr_id: string | null;
    scan_url: string | null;
    card: {
      status: string | null;
      handle: string | null;
      manifesto_line: string | null;
    } | null;
    qr: {
      status: string | null;
      scope: string | null;
      epoch: number | null;
      expires_at: string | null;
    } | null;
    verification: {
      state: string | null;
      label: string;
      method: string | null;
      vouch_count: number;
      latest_accepted_vouch_at: string | null;
    };
    /** V-001 scan copy — matches Human trust row on scan HTML */
    human_trust: {
      label: string;
      subtitle: string;
      pill_active: boolean;
    };
    live_control: { available: boolean; proven_at: string | null };
    limits: {
      bearer_warning: string;
      scan_analytics: false;
    };
  };
}

export function scanStatusBodyFromViewModel(vm: ScanViewModel): ScanStatusBody {
  const humanTrust = humanTrustDisplay(vm);
  return {
    version: PROTOCOL_VERSION,
    resolver: {
      operator: OPERATOR_ID,
      version: PROTOCOL_VERSION,
    },
    scan: {
      kind: vm.kind,
      profile_id: vm.profileId,
      qr_id: vm.qrId,
      scan_url: vm.scanUrl,
      card: vm.profileId
        ? {
            status: vm.cardStatus,
            handle: vm.handle,
            manifesto_line: vm.manifestoLine,
          }
        : null,
      qr: vm.qrId
        ? {
            status: vm.qrStatus,
            scope: vm.qrScope,
            epoch: vm.qrEpoch,
            expires_at: vm.qrExpiresAt,
          }
        : null,
      verification: {
        state: vm.verificationState,
        label: vm.verificationLabel,
        method: vm.verificationMethod,
        vouch_count: vm.vouchCount,
        latest_accepted_vouch_at: vm.latestVouchAt,
      },
      human_trust: {
        label: humanTrust.label,
        subtitle: humanTrust.subtitle,
        pill_active: humanTrust.pillActive,
      },
      live_control: {
        available: vm.liveControlAvailable,
        proven_at: vm.liveControlProvenAt,
      },
      limits: {
        bearer_warning: BEARER_WARNING,
        scan_analytics: false,
      },
    },
  };
}

export { httpStatusForScanKind };

/**
 * GET /.well-known/hc/v1/cards/{profile_id}/status[?q=qr_id]
 * Machine-readable state aligned with scan HTML (M3.4).
 */
export async function handleGetScanStatus(
  request: Request,
  db: D1Database,
  profileId: string
): Promise<Response> {
  const origin = requestOrigin(request);
  const url = new URL(request.url);
  const qrRaw = url.searchParams.get("q");
  const qrId = qrRaw?.trim() ?? null;

  if (!PROFILE_ID_REGEX.test(profileId)) {
    return statusResponse(malformedScanView(profileId, qrId, origin));
  }

  if (qrRaw !== null) {
    if (!qrId) {
      return statusResponse(malformedScanView(profileId, null, origin));
    }
    if (!QR_ID_REGEX.test(qrId)) {
      return statusResponse(malformedScanView(profileId, qrId, origin));
    }
    const ctx = await loadScanContext(db, profileId, qrId);
    const vm = buildScanViewModel(profileId, qrId, ctx, origin);
    return statusResponse(vm);
  }

  const card = await db
    .prepare(
      `SELECT profile_id, public_key, handle, handle_normalized, manifesto_line,
              status, card_document_json, created_at, updated_at
       FROM cards WHERE profile_id = ?`
    )
    .bind(profileId)
    .first<NonNullable<ScanContext["card"]>>();

  let verification: ScanContext["verification"] = null;
  if (card) {
    verification = await db
      .prepare(
        `SELECT profile_id, state, level, label, method, vouch_count,
                latest_accepted_vouch_at, credential_ids_json, summary_document_json,
                updated_at
         FROM verification_summaries WHERE profile_id = ?`
      )
      .bind(profileId)
      .first();
  }

  const vm = buildCardOnlyScanViewModel(profileId, card ?? null, verification, origin);
  return statusResponse(vm);
}

const MALFORMED_HINT =
  "Use your real profile_id (20–32 base58 characters) and qr_id (qr_ plus base58). Copy both from /created/ or the scan URL.";

function statusResponse(vm: ScanViewModel): Response {
  const status = httpStatusForScanKind(vm.kind);
  const body = scanStatusBodyFromViewModel(vm);
  const payload =
    vm.kind === "malformed"
      ? { ...body, hint: MALFORMED_HINT }
      : body;
  return jsonResponse(payload, status, {
    "Cache-Control": vm.cacheControl,
  });
}
