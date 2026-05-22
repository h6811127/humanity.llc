import { describe, expect, it } from "vitest";

import type { ScanContext } from "../src/db/scan";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_test_card_001";

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

describe("buildScanViewModel", () => {
  it("returns active when card and QR are active", () => {
    const ctx: ScanContext = {
      card: card(),
      qr: qr(),
      verification: summary(),
    };
    const vm = buildScanViewModel(PROFILE, QR, ctx);
    expect(vm.kind).toBe("active");
    expect(vm.primaryBadge.label).toBe("Active");
    expect(vm.handle).toBe("river_example");
    expect(vm.cacheControl).toContain("max-age=300");
    expect(vm.showBearerWarning).toBe(true);
  });

  it("returns unknown_profile when card missing", () => {
    const vm = buildScanViewModel(PROFILE, QR, {
      card: null,
      qr: null,
      verification: null,
    });
    expect(vm.kind).toBe("unknown_profile");
    expect(vm.showCardBlock).toBe(false);
  });

  it("returns unknown_qr when QR missing", () => {
    const vm = buildScanViewModel(PROFILE, QR, {
      card: card(),
      qr: null,
      verification: summary(),
    });
    expect(vm.kind).toBe("unknown_qr");
    expect(vm.showCardBlock).toBe(true);
  });

  it("returns mismatch when QR belongs to another profile", () => {
    const vm = buildScanViewModel(PROFILE, QR, {
      card: card(),
      qr: qr({ profile_id: "8Yl0nQ3oR5sU7wX9zA2bC4dE6" }),
      verification: summary(),
    });
    expect(vm.kind).toBe("profile_qr_mismatch");
    expect(vm.showCardBlock).toBe(false);
  });

  it("returns qr_revoked before active", () => {
    const vm = buildScanViewModel(PROFILE, QR, {
      card: card(),
      qr: qr({ status: "revoked" }),
      verification: summary(),
    });
    expect(vm.kind).toBe("qr_revoked");
    expect(vm.cacheControl).toContain("max-age=60");
  });

  it("returns card_revoked when card is revoked", () => {
    const vm = buildScanViewModel(PROFILE, QR, {
      card: card({ status: "revoked" }),
      qr: qr(),
      verification: summary(),
    });
    expect(vm.kind).toBe("card_revoked");
  });

  it("treats past expires_at as qr_expired", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr({ expires_at: "2020-01-01T00:00:00Z" }),
        verification: summary(),
      },
      new Date("2026-05-20T00:00:00Z")
    );
    expect(vm.kind).toBe("qr_expired");
  });
});

describe("renderScanPage", () => {
  it("renders mobile HTML with trust blocks and bearer warning for active card", () => {
    const vm = buildScanViewModel(PROFILE, QR, {
      card: card(),
      qr: qr(),
      verification: summary(),
    });
    const html = renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('name="viewport"');
    expect(html).toContain("@river_example");
    expect(html).toContain("Human trust");
    expect(html).toContain("Bearer warning");
    expect(html).toContain("data-policy.html");
    expect(html).toContain("About humanity.llc");
    expect(html.length).toBeGreaterThan(500);
  });

  it("renders unknown profile without handle leak", () => {
    const vm = buildScanViewModel(PROFILE, QR, {
      card: null,
      qr: null,
      verification: null,
    });
    const html = renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("No Humanity Card is registered");
    expect(html).not.toContain("@river_example");
  });
});
