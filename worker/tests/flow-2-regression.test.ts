import { describe, expect, it } from "vitest";

import { handleGetCard } from "../src/resolver/create-card";
import { renderScanPage } from "../src/resolver/scan-html";
import { BEARER_WARNING } from "../src/resolver/trust-copy";
import {
  httpStatusForScanKind,
  buildScanViewModel,
} from "../src/resolver/scan-state";
import { scanStatusBodyFromViewModel } from "../src/resolver/scan-status";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";

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

describe("Flow 2 closure regression", () => {
  it("F2-7: card GET returns JSON 410; scan route uses HTML 410 for card_revoked", async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            card_document_json: '{"version":"1.0"}',
            status: "revoked",
          }),
        }),
      }),
    } as unknown as D1Database;

    const cardRes = await handleGetCard(
      db,
      PROFILE,
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}`)
    );
    expect(cardRes.status).toBe(410);
    expect(cardRes.headers.get("Content-Type")).toContain("application/json");
    const cardJson = (await cardRes.json()) as { error: string };
    expect(cardJson.error).toBe("CARD_REVOKED");

    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card({ status: "revoked" }),
        qr: qr(),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("card_revoked");
    expect(httpStatusForScanKind(vm.kind)).toBe(410);
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("scan-hero-limit");
    expect(html).toContain("Card status");
  });

  it("bearer warning on minimal failure scan HTML (Flow 2 overall)", async () => {
    const kinds = [
      {
        kind: "qr_expired" as const,
        ctx: {
          card: card(),
          qr: qr({
            qr_id: "qr_expiredtest888",
            status: "expired",
            expires_at: "2020-01-01T00:00:00Z",
            payload: `https://humanity.llc/c/${PROFILE}?q=qr_expiredtest888`,
          }),
        },
        qrId: "qr_expiredtest888",
      },
      {
        kind: "card_revoked" as const,
        ctx: {
          card: card({ status: "revoked" }),
          qr: qr(),
        },
        qrId: QR,
      },
    ];

    for (const { ctx, qrId } of kinds) {
      const vm = buildScanViewModel(
        PROFILE,
        qrId,
        {
          ...ctx,
          verification: summary(),
          revocationDisplay: null,
        },
        "https://humanity.llc"
      );
      const html = await renderScanPage(vm, "https://humanity.llc");
      expect(html).toContain("scan-hero-limit");
      expect(html.split(BEARER_WARNING).length - 1).toBe(1);
    }
  });

  it("status JSON keeps scan_analytics false on failure kinds", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card({ status: "suspended" }),
        qr: qr(),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.limits.scan_analytics).toBe(false);
    expect(body.scan.error).toBe("CARD_SUSPENDED");
  });
});
