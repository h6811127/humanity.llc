import { describe, expect, it } from "vitest";

import type { ScanContext } from "../src/db/scan";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import {
  buildScanSafetyModel,
  renderScannerSafetyHeader,
  renderScanSafetyHeaderScript,
  SCAN_SAFETY_FIRST_SEEN_NEW,
  SCAN_SAFETY_RESOLVER_VERIFIED_COPY,
  safetyStatusDisplay,
} from "../src/resolver/scan-safety";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { renderScanPage } from "../src/resolver/scan-html";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";

function card(overrides: Partial<CardRow> = {}): CardRow {
  return {
    profile_id: PROFILE,
    public_key: "pk",
    handle: "river_example",
    handle_normalized: "river_example",
    manifesto_line: "Studio door\nOpen until 9 PM",
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

describe("scan-safety", () => {
  it("maps active scan to large Active status strip", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      { card: card(), qr: qrRow(), verification: summary(), revocationDisplay: null },
      "https://humanity.llc"
    );
    expect(safetyStatusDisplay(vm)).toMatchObject({
      label: "Active",
      tone: "live",
      stripClass: "scan-safety-strip--live",
    });
  });

  it("renders scanner safety header with object chip for status plate", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card({ manifesto_line: "Studio door\nOpen until 9 PM" }),
        qr: qrRow(),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const html = renderScannerSafetyHeader(vm, {
      objectSignatureVerified: true,
      stewardRegistered: false,
    });
    expect(html).toContain('id="scan-safety-header"');
    expect(html).toContain("Humanity object");
    expect(html).toContain("@river_example");
    expect(html).toContain("Object · Studio door");
    expect(html).toContain("Revocable");
    expect(html).toContain(SCAN_SAFETY_RESOLVER_VERIFIED_COPY);
  });

  it("includes first-seen session script", () => {
    expect(renderScanSafetyHeaderScript()).toContain("hc_first_scan_");
    expect(renderScanSafetyHeaderScript()).toContain(SCAN_SAFETY_FIRST_SEEN_NEW);
  });

  it("embeds Live check hero with first-seen script hooks", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      { card: card(), qr: qrRow(), verification: summary(), revocationDisplay: null },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc", {
      objectSignatureVerified: false,
      stewardRegistered: false,
    });
    expect(html).toContain('class="scan-hero');
    expect(html).toContain('id="scan-safety-header"');
    expect(html).not.toContain('class="section-kicker">Network status');
    expect(html).toContain("scan-safety-first-seen");
    expect(html).toContain("scan-hero-limit");
  });

  it("buildScanSafetyModel reports steward when verification state is steward", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qrRow(),
        verification: { ...summary(), state: "steward", label: "Steward" },
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const ctx: ScanContext = {
      card: card(),
      qr: qrRow(),
      verification: { ...summary(), state: "steward", label: "Steward" },
      revocationDisplay: null,
    };
    const safety = await buildScanSafetyModel(ctx, vm);
    expect(safety.stewardRegistered).toBe(true);
  });
});
