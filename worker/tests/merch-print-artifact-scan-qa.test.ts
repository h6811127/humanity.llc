/**
 * Merch funnel exit checklist step 7 — automated scan regression.
 * Physical ink QA remains manual: docs/MERCH_PHYSICAL_QA_RUNBOOK.md
 */
import { describe, expect, it } from "vitest";

import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { PRINT_ARTIFACT_NO_CALENDAR_EXPIRY_NOTE } from "../src/resolver/merch-qr-policy";
import {
  MERCH_SCAN_CREATE_PATH,
  MERCH_SCAN_CUSTOMIZE_PATH,
  MERCH_SCAN_FUNNEL_HINT,
} from "../src/resolver/scan-safety";
import { renderScanPage } from "../src/resolver/scan-html";
import { BEARER_WARNING } from "../src/resolver/trust-copy";
import { buildScanViewModel } from "../src/resolver/scan-state";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

function card(): CardRow {
  return {
    profile_id: PROFILE,
    public_key: "pk",
    handle: "river_example",
    handle_normalized: "river_example",
    manifesto_line: "Open studio — live object on wear",
    status: "active",
    card_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function printArtifactQr(overrides: Partial<QrCredentialRow> = {}): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "print_artifact",
    print_artifact_id: "pa_merchQaSample001",
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
    issued_at: "2026-05-16T17:00:00Z",
    expires_at: null,
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

async function renderPrintArtifactScan(
  qrOverrides: Partial<QrCredentialRow> = {},
  cardOverrides: Partial<CardRow> = {}
) {
  const vm = buildScanViewModel(
    PROFILE,
    QR,
    {
      card: { ...card(), ...cardOverrides },
      qr: printArtifactQr(qrOverrides),
      verification: summary(),
      revocationDisplay: null,
    },
    "https://humanity.llc"
  );
  return renderScanPage(vm, "https://humanity.llc", {
    objectSignatureVerified: true,
    stewardRegistered: false,
  });
}

function expectBearerWarningContract(html: string) {
  expect(html.split(BEARER_WARNING).length - 1).toBe(1);
  expect(html).toContain('id="scan-limits-settings"');
  expect(html).toContain("What this scan does not prove");
  const bearerIdx = html.indexOf(BEARER_WARNING);
  const limitsIdx = html.indexOf('id="scan-limits-settings"');
  expect(bearerIdx).toBeGreaterThan(-1);
  expect(limitsIdx).toBeGreaterThan(bearerIdx);
}

describe("merch print_artifact scan QA (exit checklist step 7)", () => {
  it("active printed item shows bearer warning, scope copy, and merch funnel CTAs", async () => {
    const html = await renderPrintArtifactScan();

    expectBearerWarningContract(html);
    expect(html).toContain("Printed item");
    expect(html).toContain("revoke this item without disabling the root card");
    expect(html).toContain("No calendar expiry");
    expect(html).toContain(PRINT_ARTIFACT_NO_CALENDAR_EXPIRY_NOTE);
    expect(html).not.toContain("Valid until");
    expect(html).toContain('data-merch-funnel="1"');
    expect(html).toContain("scan-merch-hint");
    expect(html).toContain(MERCH_SCAN_CREATE_PATH);
    expect(html).toContain(MERCH_SCAN_CUSTOMIZE_PATH);
    expect(html).toContain(MERCH_SCAN_FUNNEL_HINT);
    expect(html).toContain("Get yours on wear");
  });

  it("revoked printed item stays unmistakable with bearer warning", async () => {
    const html = await renderPrintArtifactScan({ status: "revoked" });

    expectBearerWarningContract(html);
    expect(html).toContain("Revoked");
    expect(html).toContain("Printed item");
    expect(html).not.toContain("No calendar expiry");
  });

  it("suspended card on print_artifact scan shows suspended state with limits", async () => {
    const html = await renderPrintArtifactScan({}, { status: "suspended" });

    expectBearerWarningContract(html);
    expect(html).toContain("Suspended");
  });
});
