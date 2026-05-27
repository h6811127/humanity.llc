import { describe, expect, it } from "vitest";

import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import {
  isQrCalendarExpired,
  normalizeExpiresAtForScope,
  validatePrintArtifactMintExpiry,
} from "../src/resolver/merch-qr-policy";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { renderScanPage } from "../src/resolver/scan-html";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

function card(): CardRow {
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
  };
}

function qr(overrides: Partial<QrCredentialRow> = {}): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "print_artifact",
    print_artifact_id: "pa_test_001",
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
    issued_at: "2026-05-16T17:00:00Z",
    expires_at: "2020-01-01T00:00:00Z",
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

describe("merch-qr-policy", () => {
  it("print_artifact ignores past expires_at for calendar expiry", () => {
    expect(isQrCalendarExpired("print_artifact", "2020-01-01T00:00:00Z")).toBe(false);
    expect(isQrCalendarExpired("card", "2020-01-01T00:00:00Z")).toBe(true);
  });

  it("normalizeExpiresAtForScope clears print_artifact expiry", () => {
    expect(normalizeExpiresAtForScope("print_artifact", "2027-01-01T00:00:00Z")).toBeNull();
    expect(normalizeExpiresAtForScope("card", "2027-01-01T00:00:00Z")).toBe(
      "2027-01-01T00:00:00Z"
    );
  });

  it("validatePrintArtifactMintExpiry rejects calendar expiry on artifact", () => {
    expect(validatePrintArtifactMintExpiry("print_artifact", null).ok).toBe(true);
    expect(validatePrintArtifactMintExpiry("print_artifact", "2027-01-01").ok).toBe(false);
    expect(validatePrintArtifactMintExpiry("card", "2027-01-01").ok).toBe(true);
  });
});

describe("scan UI for print_artifact", () => {
  it("active print_artifact with past expires_at stays active and hides Valid until", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr({ expires_at: "2020-01-01T00:00:00Z" }),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("active");
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).not.toContain("Valid until");
    expect(html).toContain("No calendar expiry");
    expect(html).toContain("does not expire on a calendar schedule");
  });

  it("card-scoped QR with past expires_at shows qr_expired", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr({ scope: "card", print_artifact_id: null, expires_at: "2020-01-01T00:00:00Z" }),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("qr_expired");
  });
});
