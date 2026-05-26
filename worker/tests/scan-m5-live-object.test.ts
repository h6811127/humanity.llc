import { describe, expect, it } from "vitest";

import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { renderScanPage, SCAN_UI_VERSION } from "../src/resolver/scan-html";
import { BEARER_WARNING } from "../src/resolver/trust-copy";
import { buildScanViewModel } from "../src/resolver/scan-state";
import {
  LIVE_OBJECT_MANIFESTO,
  SHOWCASE_HANDLE,
  SHOWCASE_PROFILE,
  SHOWCASE_QR,
} from "./fixtures/scan-showcase-fixtures";

function card(overrides: Partial<CardRow> = {}): CardRow {
  return {
    profile_id: SHOWCASE_PROFILE,
    public_key: "pk",
    handle: SHOWCASE_HANDLE,
    handle_normalized: SHOWCASE_HANDLE,
    manifesto_line: LIVE_OBJECT_MANIFESTO,
    status: "active",
    card_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

function qr(overrides: Partial<QrCredentialRow> = {}): QrCredentialRow {
  return {
    qr_id: SHOWCASE_QR,
    profile_id: SHOWCASE_PROFILE,
    epoch: 1,
    scope: "print_artifact",
    print_artifact_id: "artifact_demo",
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${SHOWCASE_PROFILE}?q=${SHOWCASE_QR}`,
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
    profile_id: SHOWCASE_PROFILE,
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

/** M5 / SCANNER_EXPERIENCE § Success criteria (first scan) — live object path. */
describe("M5 live object scan fixture", () => {
  it("uses manifesto as H1 and steward strip for handle (not inverted hierarchy)", async () => {
    const vm = buildScanViewModel(
      SHOWCASE_PROFILE,
      SHOWCASE_QR,
      {
        card: card(),
        qr: qr(),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc", {
      objectSignatureVerified: true,
      stewardRegistered: false,
    });

    expect(SCAN_UI_VERSION).toMatch(/^pass-v2\d+$/);
    expect(html).toContain(`<h1 class="scan-hero-title">${LIVE_OBJECT_MANIFESTO}</h1>`);
    expect(html).toContain("Controlled by @river_example");
    expect(html).not.toMatch(/<h1 class="scan-hero-title">@river_example<\/h1>/);
    expect(html).not.toContain("This QR is active");
    expect(html).not.toContain('class="section-kicker">Network status');
    expect(html).toContain("scan-proves");
    expect(html).toContain("scan-does-not-prove");
    expect(html.split(BEARER_WARNING).length - 1).toBe(1);
    expect(html).toContain("Scan shows live object state");
  });
});
