/**
 * M7 Step 2 printed QR camera QA — automated desk regression (H-12).
 * Physical camera + print QA remains manual: docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md
 *
 * @see docs/LIVE_CONTROL_USABILITY_HARDENING.md § H-12
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  LIVE_CONTROL_ASK_LABEL,
  LIVE_CONTROL_PROOF_EXPIRED_STATUS,
  LIVE_CONTROL_REQUEST_EXPIRED_STATUS,
  LIVE_CONTROL_SUCCESS_COPY,
  LIVE_CONTROL_SUCCESS_TITLE,
} from "../../site/js/device-ownership-copy-core.mjs";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const CANONICAL_SCAN_URL = `https://humanity.llc/c/${PROFILE}?q=${QR}`;

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
    object_id: null,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: CANONICAL_SCAN_URL,
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

async function activeScanHtml(overrides: { provenAt?: string } = {}) {
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
  vm.liveControlAvailable = true;
  if (overrides.provenAt) vm.liveControlProvenAt = overrides.provenAt;
  return renderScanPage(vm, "https://humanity.llc");
}

describe("M7 printed QR camera QA desk gate (H-12)", () => {
  it("print URL is canonical HTTPS (not hc://)", async () => {
    const html = await activeScanHtml();
    expect(qrRow().payload).toMatch(/^https:\/\/humanity\.llc\/c\//);
    expect(qrRow().payload).not.toMatch(/^hc:\/\//);
    expect(html).toContain(CANONICAL_SCAN_URL);
  });

  it("§ A: scan page exposes pass UI and live control without login gate", async () => {
    const html = await activeScanHtml();

    expect(html).toContain("scan-pass-layer");
    expect(html).toContain('id="live-control-row"');
    expect(html).toContain(LIVE_CONTROL_ASK_LABEL);
    expect(html.toLowerCase()).not.toContain("sign in");
    expect(html.toLowerCase()).not.toContain("log in");
    expect(html.toLowerCase()).not.toMatch(/install.*app/);
  });

  it("§ B1–B2: ask CTA, owner pane, and challenge countdown wiring", async () => {
    const html = await activeScanHtml();

    expect(html).toContain('id="live-control-request"');
    expect(html).toContain('id="live-control-owner-panel"');
    expect(html).toContain('id="live-control-in-person-layout"');
    expect(html).toContain("Expires in ");
    expect(html).toContain("formatRemaining");
  });

  it("§ B3–B4: proven success copy states control proof and identity limits", async () => {
    const html = await activeScanHtml({ provenAt: new Date().toISOString() });

    expect(html).toContain(LIVE_CONTROL_SUCCESS_TITLE);
    expect(html).toContain(LIVE_CONTROL_SUCCESS_COPY);
    expect(html).toContain("does not prove legal identity");
    expect(html).toContain("Prove control now");
  });

  it("§ B5–B6: proof display expiry and unsigned challenge retry copy", async () => {
    const html = await activeScanHtml();

    expect(html).toContain('id="live-control-request-again"');
    expect(html).toContain(LIVE_CONTROL_PROOF_EXPIRED_STATUS);
    expect(html).toContain(LIVE_CONTROL_REQUEST_EXPIRED_STATUS);
    expect(html).toContain("is-request-expired");
    expect(html).toContain("showRequestExpiredVisual");
  });

  it("§ C: in-person layout stacks on phone and splits at ≥640px when waiting", async () => {
    const html = await activeScanHtml();
    const css = readFileSync(join(root, "site/scan-pass.css"), "utf8");

    expect(html).toContain("live-control-scanner-pane");
    expect(html).toContain('live-control-eyebrow">Scanner</span>');
    expect(html).toContain('live-control-eyebrow">Owner</span>');
    expect(css).toContain(".live-control-in-person-layout.is-owner-waiting");
    expect(css).toMatch(/@media \(min-width: 640px\)[\s\S]*live-control-in-person-layout\.is-owner-waiting/);
    expect(html).toContain("hc_live_control_pending:");
    expect(html).toContain("if (ownerPanel) ownerPanel.hidden = true;");
  });
});
