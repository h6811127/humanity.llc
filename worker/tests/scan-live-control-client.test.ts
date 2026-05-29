import { describe, expect, it } from "vitest";

import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";

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

describe("scan live-control client script (H-14 guards)", () => {
  it("clears owner panel and link before a new live proof request", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: summary(),
      },
      "http://127.0.0.1:8787"
    );

    const html = await renderScanPage(vm, "http://127.0.0.1:8787");

    expect(html).toContain("if (ownerPanel) ownerPanel.hidden = true;");
    expect(html).toContain('if (ownerLink) ownerLink.href = "#";');
    expect(html).not.toContain("ownerHint");
  });

  it("bundles in-person owner panel and sessionStorage resume helpers", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: summary(),
      },
      "http://127.0.0.1:8787"
    );

    const html = await renderScanPage(vm, "http://127.0.0.1:8787");

    expect(html).toContain('id="live-control-owner-panel"');
    expect(html).toContain('id="live-control-in-person-layout"');
    expect(html).toContain("showOwnerPanel(body.owner_url");
    expect(html).toContain("hc_live_control_pending:");
    expect(html).toContain("readPendingFromStorage");
    expect(html).toContain("The 2-minute window ended. You can ask again.");
  });
});
