import { describe, expect, it } from "vitest";

import {
  CREDENTIAL_CODE_PATTERN,
  credentialCodeFromScanUrl,
  credentialCodeMatches,
  deriveCredentialCodeSync,
} from "../../site/js/qr-credential-code.mjs";
import { renderPrintStickerFromScanUrl } from "../src/resolver/scan-qr";
import { scanStatusBodyFromViewModel } from "../src/resolver/scan-status";
import { buildScanViewModel } from "../src/resolver/scan-state";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const SCAN_URL = `https://humanity.llc/c/${PROFILE}?q=${QR}`;

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

function qr(): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "card",
    print_artifact_id: null,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: SCAN_URL,
    issued_at: "2026-05-16T17:00:00Z",
    expires_at: "2027-05-16T17:00:00Z",
    credential_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
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

describe("qr credential code (Phase F)", () => {
  it("derives stable HC-XXXX-XXXX from profile_id + qr_id", () => {
    const code = deriveCredentialCodeSync(PROFILE, QR);
    expect(code).toMatch(CREDENTIAL_CODE_PATTERN);
    expect(deriveCredentialCodeSync(PROFILE, QR)).toBe(code);
    expect(credentialCodeMatches(code, PROFILE, QR)).toBe(true);
    expect(credentialCodeMatches(code, PROFILE, "qr_otherid12345678")).toBe(false);
  });

  it("parses code from official scan URL", () => {
    const code = credentialCodeFromScanUrl(SCAN_URL);
    expect(code).toMatch(/^HC-/);
    expect(credentialCodeFromScanUrl("https://evil.com/c/x?q=qr_abc")).toBeNull();
  });

  it("status JSON includes scan.qr.credential_code", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      { card: card(), qr: qr(), verification: summary(), revocationDisplay: null },
      "https://humanity.llc"
    );
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.qr?.credential_code).toMatch(CREDENTIAL_CODE_PATTERN);
    expect(body.scan.qr?.credential_code).toBe(deriveCredentialCodeSync(PROFILE, QR));
  });

  it("print sticker embeds credential code", async () => {
    const code = deriveCredentialCodeSync(PROFILE, QR);
    const sheet = await renderPrintStickerFromScanUrl(SCAN_URL);
    expect(sheet).toContain('class="hc-print-credential-code"');
    expect(sheet).toContain(code);
  });
});
