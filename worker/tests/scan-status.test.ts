import { describe, expect, it } from "vitest";

import type { ScanContext } from "../src/db/scan";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import {
  BEARER_WARNING,
  httpStatusForScanKind,
  scanStatusBodyFromViewModel,
} from "../src/resolver/scan-status";
import {
  buildCardOnlyScanViewModel,
  buildScanViewModel,
  malformedScanView,
} from "../src/resolver/scan-state";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_test_card_001";

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

function qr(overrides: Partial<QrCredentialRow> = {}): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "card",
    print_artifact_id: null,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
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

describe("scan status JSON (M3.4)", () => {
  it("active scan with ?q matches scan view model kind and bearer limits", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      { card: card(), qr: qr(), verification: summary(), revocationDisplay: null },
      "https://humanity.llc"
    );
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.kind).toBe("active");
    expect(body.scan.scan_url).toBe(`https://humanity.llc/c/${PROFILE}?q=${QR}`);
    expect(body.scan.qr?.status).toBe("active");
    expect(body.scan.limits.bearer_warning).toBe(BEARER_WARNING);
    expect(body.scan.human_trust.label).toBe("Registered");
    expect(body.scan.human_trust.subtitle).toContain("No accepted vouches");
    expect(body.scan.limits.scan_analytics).toBe(false);
    expect(body.scan.verification.vouch_count).toBe(0);
    expect(httpStatusForScanKind(vm.kind)).toBe(200);
  });

  it("status JSON exposes vouch count and latest recency (V-001)", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: {
          ...summary(),
          state: "verified_human",
          label: "Vouched Human",
          method: "vouch",
          vouch_count: 3,
          latest_accepted_vouch_at: "2026-05-21T12:00:00.000Z",
        },
      },
      "https://humanity.llc"
    );
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.verification.state).toBe("verified_human");
    expect(body.scan.verification.label).toBe("Vouched Human");
    expect(body.scan.verification.vouch_count).toBe(3);
    expect(body.scan.verification.latest_accepted_vouch_at).toBe(
      "2026-05-21T12:00:00.000Z"
    );
    expect(body.scan.human_trust.label).toBe("Vouched Human");
    expect(body.scan.human_trust.subtitle).toContain("3 accepted vouches");
    expect(body.scan.human_trust.pill_active).toBe(true);
  });

  it("unknown profile returns 404", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      { card: null, qr: null, verification: null, revocationDisplay: null },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("unknown_profile");
    expect(httpStatusForScanKind(vm.kind)).toBe(404);
  });

  it("card suspended includes governance process URLs (F2-3)", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card({ status: "suspended" }),
        qr: qr(),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("card_suspended");
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.governance?.data_policy_url).toBe(
      "https://humanity.llc/data-policy.html"
    );
    expect(body.scan.governance?.architecture_url).toBe(
      "https://humanity.llc/architecture.html"
    );
  });

  it("card revoked returns 410", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      { card: card({ status: "revoked" }), qr: qr(), verification: summary(), revocationDisplay: null },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("card_revoked");
    expect(httpStatusForScanKind(vm.kind)).toBe(410);
  });

  it("qr revoked returns 200 with qr_revoked kind (M4.2)", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      { card: card(), qr: qr({ status: "revoked" }), verification: summary(), revocationDisplay: null },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("qr_revoked");
    expect(httpStatusForScanKind(vm.kind)).toBe(200);
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.qr?.status).toBe("revoked");
  });

  it("malformed ids return 400", () => {
    const vm = malformedScanView("bad", QR, "https://humanity.llc");
    expect(vm.kind).toBe("malformed");
    expect(httpStatusForScanKind(vm.kind)).toBe(400);
  });

  it("malformed status response includes hint", async () => {
    const { handleGetScanStatus } = await import("../src/resolver/scan-status");
    const db = {
      prepare: () => ({
        bind: () => ({ first: async () => null }),
      }),
    } as unknown as D1Database;
    const res = await handleGetScanStatus(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/not-valid/status?q=bad"),
      db,
      "not-valid"
    );
    const json = (await res.json()) as { scan: { kind: string }; hint?: string };
    expect(json.scan.kind).toBe("malformed");
    expect(json.hint).toMatch(/profile_id/);
    expect(res.status).toBe(400);
  });

  it("card-only status omits qr block fields", () => {
    const vm = buildCardOnlyScanViewModel(
      PROFILE,
      card(),
      summary(),
      "https://humanity.llc"
    );
    const body = scanStatusBodyFromViewModel(vm);
    expect(vm.kind).toBe("active");
    expect(body.scan.qr).toBeNull();
    expect(vm.showArtifactBlock).toBe(false);
    expect(body.scan.scan_url).toBeNull();
  });

  it("card-only unknown profile", () => {
    const vm = buildCardOnlyScanViewModel(
      PROFILE,
      null,
      null,
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("unknown_profile");
    expect(httpStatusForScanKind(vm.kind)).toBe(404);
  });
});
