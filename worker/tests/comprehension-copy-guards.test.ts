/**
 * D9 automated comprehension copy guards (engineering gate before human runbooks).
 *
 * @see docs/M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md
 * @see docs/PRODUCT_LANGUAGE_STRATEGY.md § Comprehension gates
 * @see docs/V1_PRODUCT_TRUST_MODEL.md § Copy Comprehension Launch Gates
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  LIVE_CONTROL_ASK_LABEL,
  LIVE_CONTROL_PROOF_EXPIRED_STATUS,
  LIVE_CONTROL_REQUEST_EXPIRED_STATUS,
  LIVE_CONTROL_SCANNER_LEAD,
  LIVE_CONTROL_SUCCESS_COPY,
  LIVE_CONTROL_SUCCESS_TITLE,
  FOUNDING_BUY_DOES_NOT_VERIFY,
  FOUNDING_QR_NOT_OWNER_PROOF,
  FOUNDING_STICKER_NO_CALENDAR_EXPIRY,
  SCAN_LIMITS_DISCLOSURE_TITLE,
  SHELL_STATUS_MODE_DEVICE_HUB,
  SHELL_STATUS_MODE_LANDING,
  SHELL_STATUS_MODE_WALLET,
} from "../../site/js/device-ownership-copy-core.mjs";
import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { BEARER_WARNING } from "../src/resolver/trust-copy";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
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
    epoch: 1,
    scope: "card",
    print_artifact_id: null,
    object_id: null,
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

const LAYER1_JARGON = [
  "signing key",
  "private key",
  "ed25519",
  "sessionstorage",
  "localstorage",
];

function expectNoLayer1Jargon(text: string) {
  const lower = text.toLowerCase();
  for (const term of LAYER1_JARGON) {
    expect(lower).not.toContain(term);
  }
}

describe("D9 comprehension copy core (device-ownership-copy-core)", () => {
  it("exports shell status mode labels without Layer 1 jargon (Hub P3)", () => {
    for (const line of [
      SHELL_STATUS_MODE_LANDING,
      SHELL_STATUS_MODE_WALLET,
      SHELL_STATUS_MODE_DEVICE_HUB,
    ]) {
      expectNoLayer1Jargon(line);
    }
    expect(SHELL_STATUS_MODE_WALLET).toContain("My objects");
  });

  it("exports live-control strings in Layer 2 terms", () => {
    for (const line of [
      LIVE_CONTROL_SCANNER_LEAD,
      LIVE_CONTROL_SUCCESS_COPY,
      LIVE_CONTROL_SUCCESS_TITLE,
      LIVE_CONTROL_ASK_LABEL,
      LIVE_CONTROL_REQUEST_EXPIRED_STATUS,
      LIVE_CONTROL_PROOF_EXPIRED_STATUS,
      SCAN_LIMITS_DISCLOSURE_TITLE,
    ]) {
      expectNoLayer1Jargon(line);
    }
    expect(LIVE_CONTROL_SUCCESS_COPY).toContain("does not prove legal identity");
    expect(LIVE_CONTROL_SUCCESS_COPY).toContain("ownership of the physical object");
  });
});

describe("D9 M7 live control copy guards (L1–L6)", () => {
  it("L1–L2: success panel states control proof and honest limits (H-002)", async () => {
    const html = await activeScanHtml({ provenAt: new Date().toISOString() });

    expect(html).toContain(LIVE_CONTROL_SUCCESS_TITLE);
    expect(html).toContain(LIVE_CONTROL_SUCCESS_COPY);
    expect(html).toContain("does not prove legal identity");
    expect(html).toContain("vouching");
    expect(html).toContain("ownership of the physical object");
    expect(html).not.toContain("Verified Human");
  });

  it("L3–L4: default scan path warns holding object does not prove ownership", async () => {
    const html = await activeScanHtml();

    expect(html).toContain(SCAN_LIMITS_DISCLOSURE_TITLE);
    expect(html).toContain(BEARER_WARNING);
    expect(html).toMatch(/does not prove.*(owner|ownership)/i);
  });

  it("L5: QR expired copy keeps card-may-still-be-active nuance", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qrRow({ status: "expired" }),
        verification: summary(),
      },
      "https://humanity.llc"
    );
    vm.kind = "qr_expired";
    vm.qrStatus = "expired";
    const html = await renderScanPage(vm, "https://humanity.llc");

    expect(html).toContain("card may still be active");
  });

  it("L6: limitation copy is in success panel markup (not script-only)", async () => {
    const html = await activeScanHtml({ provenAt: new Date().toISOString() });
    const successIdx = html.indexOf('id="live-control-success"');
    const limitsIdx = html.indexOf(LIVE_CONTROL_SUCCESS_COPY);
    expect(successIdx).toBeGreaterThan(-1);
    expect(limitsIdx).toBeGreaterThan(successIdx);
    expect(limitsIdx).toBeLessThan(html.indexOf("</div>", limitsIdx + 1));
  });

  it("M7 pre-flight: client script wires expiry and ask-again copy from core", async () => {
    const html = await activeScanHtml();

    expect(html).toContain(LIVE_CONTROL_ASK_LABEL);
    expect(html).toContain(LIVE_CONTROL_REQUEST_EXPIRED_STATUS);
    expect(html).toContain(LIVE_CONTROL_PROOF_EXPIRED_STATUS);
    expect(html).toContain(LIVE_CONTROL_SCANNER_LEAD);
  });
});

describe("D9 V1 launch gate copy (static surfaces)", () => {
  it("landing page does not claim sticker buys verification", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("Not legal ID");
    expect(html.toLowerCase()).not.toContain("buying verifies");
    expect(html.toLowerCase()).not.toContain("purchase verifies");
  });

  it("scan limits disclosure covers identity and employment overclaims", async () => {
    const html = await activeScanHtml();
    expect(html).toContain("Legal identity, government ID, KYC");
    expect(html).toContain("Employment eligibility");
  });
});

describe("D9 founding copy guards (FOUNDING_DROP_BRIEF)", () => {
  it("Tier 0 founding sticker states buy ≠ verify and no calendar expiry", () => {
    const html = readFileSync(join(root, "site/shop/founding/index.html"), "utf8");
    expect(html).toContain(FOUNDING_BUY_DOES_NOT_VERIFY);
    expect(html).toContain(FOUNDING_STICKER_NO_CALENDAR_EXPIRY);
    expect(html).toMatch(/holding the sticker does not prove/i);
    expect(html).toContain("Does buying this verify me?");
    expect(html).toContain("Will my sticker stop working after a year?");
    expect(html).toContain("Does the QR prove I own the card?");
    expect(html).toContain(FOUNDING_QR_NOT_OWNER_PROOF);
  });

  it("shop customize and thanks pages repeat commerce-not-verification", () => {
    const customize = readFileSync(join(root, "site/shop/customize/index.html"), "utf8");
    const thanks = readFileSync(join(root, "site/shop/thanks/index.html"), "utf8");
    expect(customize).toMatch(/does not verify/i);
    expect(thanks).toMatch(/did not verify/i);
  });

  it("shop hub does not promise verification from merch", () => {
    const html = readFileSync(join(root, "site/shop/index.html"), "utf8");
    expect(html.toLowerCase()).not.toContain("buying verifies");
    expect(html.toLowerCase()).not.toMatch(/verified human.*checkout/);
  });

  it("wallet help uses attestation default wording (D7)", () => {
    const html = readFileSync(join(root, "site/wallet/index.html"), "utf8");
    expect(html).toContain("Default for attestation");
    expect(html).not.toContain("Default for vouching");
  });

  it("device-hub feature page leads with ownership not keys (D9e)", () => {
    const html = readFileSync(join(root, "site/features/device-hub.html"), "utf8");
    expect(html).toContain("manage ownership");
    expect(html).toContain("Saved objects");
    expect(html).toContain("Advanced: signing keys");
    expect(html).not.toMatch(/feature-lead">[^<]*\bkeys\b[^<]*manage keys/i);
  });
});
