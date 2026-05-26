import { describe, expect, it } from "vitest";

import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

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

describe("scan trust groups (M3 zone G)", () => {
  it("omits trust stack when all blocks are hidden (malformed scan)", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      null,
      {
        card: null,
        qr: null,
        verification: null,
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("malformed");
    expect(vm.showCardBlock).toBe(false);
    expect(vm.showHumanTrustBlock).toBe(false);
    expect(vm.showArtifactBlock).toBe(false);

    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).not.toContain('aria-label="Trust details at scan time"');
  });

  it("renders collapsible groups when blocks are shown", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qrRow(),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain('aria-label="Trust details at scan time"');
    expect(html).toContain("scan-trust-details");
    expect(html).toContain("scan-group-summary");
    expect(html).toContain("scan-trust-tools");
    expect(html).toContain("Check at scan time");
    expect(html).toContain("Card status");
    expect(html).toContain("This QR");
  });
});
