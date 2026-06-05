/**
 * Phase 3 — revoke must change status JSON truth and cache surfaces (M3.6).
 * @see docs/FLOW_2_QR_SCAN_REPAIR_SPEC.md · docs/SYSTEM_INVARIANTS.md
 */
import { describe, expect, it } from "vitest";

import { weakEtagFromSerializedJson } from "../src/http/conditional-json";
import {
  buildScanCachePurgeUrls,
  CACHE_ACTIVE,
  CACHE_NO_STORE,
} from "../src/resolver/scan-cache-purge";
import {
  scanStatusBodyForWeakEtag,
  scanStatusBodyFromViewModel,
} from "../src/resolver/scan-status";
import { buildScanViewModel } from "../src/resolver/scan-state";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import {
  arriveLabelForScanKind,
  scanTruthKindsMatch,
  scanTruthMismatchAction,
} from "../../site/js/scan-live-truth-core.mjs";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const ORIGIN = "https://humanity.llc";

function card(overrides: Partial<CardRow> = {}): CardRow {
  return {
    profile_id: PROFILE,
    public_key: "pk",
    handle: "river_example",
    handle_normalized: "river_example",
    manifesto_line: "Open studio",
    status: "active",
    card_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

function qrRow(overrides: Partial<QrCredentialRow> = {}): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "card",
    print_artifact_id: null,
    resolver_hint: ORIGIN,
    status: "active",
    payload: `${ORIGIN}/c/${PROFILE}?q=${QR}`,
    issued_at: "2026-05-16T17:00:00Z",
    expires_at: "2027-05-16T17:00:00Z",
    credential_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

function summary(): VerificationSummaryRow {
  return {
    profile_id: PROFILE,
    state: "registered",
    level: 1,
    label: "Registered",
    method: "registered",
    vouch_count: 0,
    latest_accepted_vouch_at: null,
    credential_ids_json: "[]",
    summary_document_json: null,
    updated_at: "2026-05-16T17:00:00Z",
  };
}

describe("scan revoke truth contract (Phase 3 / M3.6)", () => {
  it("status JSON kind changes from active to qr_revoked after QR revoke", () => {
    const activeVm = buildScanViewModel(
      PROFILE,
      QR,
      { card: card(), qr: qrRow(), verification: summary(), revocationDisplay: null },
      ORIGIN
    );
    const revokedVm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qrRow({ status: "revoked" }),
        verification: summary(),
        revocationDisplay: null,
      },
      ORIGIN
    );

    const activeBody = scanStatusBodyFromViewModel(activeVm);
    const revokedBody = scanStatusBodyFromViewModel(revokedVm);

    expect(activeBody.scan.kind).toBe("active");
    expect(revokedBody.scan.kind).toBe("qr_revoked");
    expect(scanTruthKindsMatch(activeBody.scan.kind, revokedBody.scan.kind)).toBe(false);
    expect(arriveLabelForScanKind(activeBody.scan.kind)).toBe("Active");
    expect(arriveLabelForScanKind(revokedBody.scan.kind)).toBe("Revoked");
  });

  it("weak ETag changes when scan kind changes after revoke", async () => {
    const activeVm = buildScanViewModel(
      PROFILE,
      QR,
      { card: card(), qr: qrRow(), verification: summary(), revocationDisplay: null },
      ORIGIN
    );
    const revokedVm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qrRow({ status: "revoked" }),
        verification: summary(),
        revocationDisplay: null,
      },
      ORIGIN
    );

    const activeEtag = await weakEtagFromSerializedJson(
      JSON.stringify(scanStatusBodyForWeakEtag(scanStatusBodyFromViewModel(activeVm)))
    );
    const revokedEtag = await weakEtagFromSerializedJson(
      JSON.stringify(scanStatusBodyForWeakEtag(scanStatusBodyFromViewModel(revokedVm)))
    );

    expect(activeEtag).toBeTruthy();
    expect(revokedEtag).toBeTruthy();
    expect(activeEtag).not.toBe(revokedEtag);
  });

  it("revoked scan HTML uses no-store; active keeps short must-revalidate cache", () => {
    const activeVm = buildScanViewModel(
      PROFILE,
      QR,
      { card: card(), qr: qrRow(), verification: summary(), revocationDisplay: null },
      ORIGIN
    );
    const revokedVm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qrRow({ status: "revoked" }),
        verification: summary(),
        revocationDisplay: null,
      },
      ORIGIN
    );

    expect(activeVm.cacheControl).toBe(CACHE_ACTIVE);
    expect(revokedVm.cacheControl).toBe(CACHE_NO_STORE);
    expect(CACHE_ACTIVE).toContain("must-revalidate");
    expect(CACHE_ACTIVE).not.toContain("stale-while-revalidate");
  });

  it("purge URLs cover stranger scan HTML and status JSON after revoke", () => {
    const urls = buildScanCachePurgeUrls(ORIGIN, PROFILE, [QR]);
    expect(urls).toContain(`${ORIGIN}/c/${PROFILE}?q=${QR}`);
    expect(urls).toContain(
      `${ORIGIN}/.well-known/hc/v1/cards/${PROFILE}/status?q=${QR}`
    );
    expect(urls).toContain(`${ORIGIN}/.well-known/hc/v1/cards/${PROFILE}/status`);
  });

  it("client mismatch policy reloads once then applies network strip", () => {
    expect(scanTruthMismatchAction(false)).toBe("reload");
    expect(scanTruthMismatchAction(true)).toBe("apply_network");
    expect(scanTruthKindsMatch("active", "qr_revoked")).toBe(false);
    expect(scanTruthKindsMatch("qr_revoked", "qr_revoked")).toBe(true);
  });
});
