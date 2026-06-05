import { describe, expect, it } from "vitest";

import { safetyStatusDisplay } from "../src/resolver/scan-safety";
import { buildScanViewModel } from "../src/resolver/scan-state";
import type { CardRow, QrCredentialRow } from "../src/db/types";
import {
  arriveLabelForScanKind,
  arriveStripClassForScanKind,
  buildScanStatusUrl,
  scanTruthCacheBustUrl,
  scanTruthKindsMatch,
  scanTruthMismatchAction,
  scanTruthReloadSessionKey,
  shouldBypassSsrFastPath,
  shouldForceScanTruthRevalidation,
} from "../../site/js/scan-live-truth-core.mjs";
import {
  SCAN_ARRIVE_CHECKING_LABEL,
  shouldSkipScanArriveCheckingPhase,
} from "../../site/js/scan-live-check-arrive-core.mjs";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";

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

describe("buildScanStatusUrl", () => {
  it("builds well-known status endpoint with qr query", () => {
    expect(buildScanStatusUrl("https://humanity.llc", PROFILE, QR)).toBe(
      `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/status?q=${QR}`
    );
  });
});

describe("arriveLabelForScanKind", () => {
  it("matches safetyStatusDisplay labels for standard kinds", () => {
    const kinds = [
      "active",
      "qr_revoked",
      "card_revoked",
      "qr_expired",
      "card_expired",
      "card_suspended",
      "qr_replaced",
      "unknown_qr",
      "malformed",
    ] as const;
    for (const kind of kinds) {
      const vm = buildScanViewModel(
        PROFILE,
        QR,
        { card: card(), qr: qrRow(), verification: null, revocationDisplay: null },
        "https://humanity.llc"
      );
      vm.kind = kind;
      expect(arriveLabelForScanKind(kind)).toBe(safetyStatusDisplay(vm).label);
      expect(arriveStripClassForScanKind(kind)).toBe(safetyStatusDisplay(vm).stripClass);
    }
  });
});

describe("scan truth gate policy", () => {
  it("does not skip checking without truthVerified even when SSR labels agree", () => {
    expect(
      shouldSkipScanArriveCheckingPhase({
        arriveLabel: "Active",
        statusText: "Active",
        online: true,
        truthVerified: false,
      })
    ).toBe(false);
  });

  it("skips checking only after truthVerified confirms labels", () => {
    expect(
      shouldSkipScanArriveCheckingPhase({
        arriveLabel: "Active",
        statusText: "Active",
        online: true,
        truthVerified: true,
      })
    ).toBe(true);
  });

  it("detects kind mismatch between SSR and network", () => {
    expect(scanTruthKindsMatch("active", "qr_revoked")).toBe(false);
    expect(scanTruthKindsMatch("active", "active")).toBe(true);
  });

  it("reloads once then applies network strip", () => {
    expect(scanTruthMismatchAction(false)).toBe("reload");
    expect(scanTruthMismatchAction(true)).toBe("apply_network");
  });

  it("bypasses SSR fast path on bfcache and back_forward", () => {
    expect(shouldBypassSsrFastPath({ persisted: true })).toBe(true);
    expect(shouldForceScanTruthRevalidation("back_forward")).toBe(true);
    expect(shouldBypassSsrFastPath({ navigationType: "navigate" })).toBe(false);
  });

  it("adds cache-bust query param for mismatch reload", () => {
    const url = scanTruthCacheBustUrl(
      `https://humanity.llc/c/${PROFILE}?q=${QR}`,
      1_700_000_000_000
    );
    expect(url).toContain("_hc_live=1700000000000");
  });

  it("builds per-scan reload session keys", () => {
    expect(scanTruthReloadSessionKey(PROFILE, QR)).toBe(
      `hc_scan_truth_reload:${PROFILE}:${QR}`
    );
  });

  it("still shows checking when legacy HTML matches stale active", () => {
    expect(
      shouldSkipScanArriveCheckingPhase({
        arriveLabel: "Active",
        statusText: SCAN_ARRIVE_CHECKING_LABEL,
        online: true,
        truthVerified: false,
      })
    ).toBe(false);
  });
});
