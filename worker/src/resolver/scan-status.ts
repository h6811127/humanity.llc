import { loadScanContext, type ScanContext } from "../db/scan";
import { PROFILE_ID_REGEX } from "../crypto";
import { jsonResponseWithWeakEtag } from "../http/conditional-json";
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
import {
  governanceProcessUrls,
  originFromScanUrl,
  type GovernanceProcessUrls,
} from "./scan-governance";
import { deriveCredentialCodeSync } from "../../../site/js/qr-credential-code.mjs";
import { scanContractErrorForKind } from "./scan-contract-error";
import { scanMalformedStatusHint } from "./scan-malformed-hint";
import { guardScanResponse, scanRedirectQueryBlocked } from "./scan-redirect-guard";
import { BEARER_WARNING } from "./trust-copy";
import { humanTrustDisplay } from "./verification-display";

export { BEARER_WARNING };

export interface ScanStatusBody {
  version: string;
  resolver: { operator: string; version: string };
  scan: {
    kind: ScanPageKind;
    /** Contract error code when kind is a failure state; omitted for `active`. */
    error?: string;
    profile_id: string | null;
    qr_id: string | null;
    scan_url: string | null;
    /** Print / verifier fingerprint (Phase F); omitted when profile or QR id missing. */
    credential_code?: string;
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
      /** Human-readable fingerprint for print QA (SCANNER_EXPERIENCE Phase F). */
      credential_code?: string;
    } | null;
    verification: {
      state: string | null;
      label: string;
      method: string | null;
      vouch_count: number;
      latest_accepted_vouch_at: string | null;
    };
    /** V-001 scan copy  -  matches Human trust row on scan HTML */
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
    governance?: GovernanceProcessUrls;
  };
}

export type { GovernanceProcessUrls };

export function scanStatusBodyFromViewModel(vm: ScanViewModel): ScanStatusBody {
  const humanTrust = humanTrustDisplay(vm);
  const origin = originFromScanUrl(vm.scanUrl);
  const governance =
    vm.kind === "card_suspended" ? governanceProcessUrls(origin) : undefined;
  const error = scanContractErrorForKind(vm.kind, vm.qrScope);
  return {
    version: PROTOCOL_VERSION,
    resolver: {
      operator: OPERATOR_ID,
      version: PROTOCOL_VERSION,
    },
    scan: {
      kind: vm.kind,
      ...(error ? { error } : {}),
      profile_id: vm.profileId,
      qr_id: vm.qrId,
      scan_url: vm.scanUrl,
      ...(vm.credentialCode ? { credential_code: vm.credentialCode } : {}),
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
            issued_at: vm.qrIssuedAt,
            payload: vm.qrPayload,
            ...(vm.profileId
              ? {
                  credential_code: deriveCredentialCodeSync(vm.profileId, vm.qrId),
                }
              : {}),
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
      ...(governance ? { governance } : {}),
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

  if (scanRedirectQueryBlocked(url)) {
    return guardScanResponse(
      request,
      await statusResponse(request, malformedScanView(profileId, qrId, origin))
    );
  }

  if (!PROFILE_ID_REGEX.test(profileId)) {
    return guardScanResponse(
      request,
      await statusResponse(request, malformedScanView(profileId, qrId, origin))
    );
  }

  if (qrRaw !== null) {
    if (!qrId) {
      return guardScanResponse(
        request,
        await statusResponse(request, malformedScanView(profileId, null, origin))
      );
    }
    if (!QR_ID_REGEX.test(qrId)) {
      return guardScanResponse(
        request,
        await statusResponse(request, malformedScanView(profileId, qrId, origin))
      );
    }
    const ctx = await loadScanContext(db, profileId, qrId);
    const vm = buildScanViewModel(profileId, qrId, ctx, origin);
    return guardScanResponse(request, await statusResponse(request, vm));
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
  return guardScanResponse(request, await statusResponse(request, vm));
}

async function statusResponse(
  request: Request,
  vm: ScanViewModel
): Promise<Response> {
  const status = httpStatusForScanKind(vm.kind);
  const body = scanStatusBodyFromViewModel(vm);
  const payload =
    vm.kind === "malformed"
      ? {
          ...body,
          hint: scanMalformedStatusHint(
            vm.malformedReason ?? "invalid_profile_id"
          ),
        }
      : body;
  if (status >= 200 && status < 300) {
    return jsonResponseWithWeakEtag(request, payload, status, {
      "Cache-Control": vm.cacheControl,
    });
  }
  return jsonResponse(payload, status, {
    "Cache-Control": vm.cacheControl,
  });
}
