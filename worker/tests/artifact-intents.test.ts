import { describe, expect, it } from "vitest";

import worker from "../src";
import { handlePostArtifactIntent } from "../src/resolver/artifact-intents";
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
    scope: "print_artifact",
    print_artifact_id: "pa_test_001",
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

function dbFor(rows: {
  card?: CardRow | null;
  qr?: QrCredentialRow | null;
  verification?: VerificationSummaryRow | null;
}): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: () => ({
        first: async () => {
          if (sql.includes("FROM cards")) return rows.card ?? null;
          if (sql.includes("FROM qr_credentials")) return rows.qr ?? null;
          if (sql.includes("FROM verification_summaries")) {
            return rows.verification ?? null;
          }
          return null;
        },
      }),
    }),
  } as unknown as D1Database;
}

function request(body: unknown): Request {
  return new Request("https://humanity.llc/v1/store/artifact-intents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("artifact intent pre-commerce guard (M4.4)", () => {
  it("blocks revoked source QR with 403", async () => {
    const res = await handlePostArtifactIntent(
      request({ profile_id: PROFILE, source_qr_id: QR, product_id: "prod_sticker_square" }),
      dbFor({ card: card(), qr: qr({ status: "revoked" }), verification: summary() })
    );

    const json = (await res.json()) as {
      error: string;
      status: string;
      scan: { kind: string };
    };
    expect(res.status).toBe(403);
    expect(json.error).toBe("QR_REVOKED");
    expect(json.status).toBe("blocked");
    expect(json.scan.kind).toBe("qr_revoked");
  });

  it("blocks suspended cards before preview generation", async () => {
    const res = await handlePostArtifactIntent(
      request({ profile_id: PROFILE, source_qr_id: QR }),
      dbFor({ card: card({ status: "suspended" }), qr: qr(), verification: summary() })
    );

    const json = (await res.json()) as { error: string; scan: { kind: string } };
    expect(res.status).toBe(403);
    expect(json.error).toBe("CARD_SUSPENDED");
    expect(json.scan.kind).toBe("card_suspended");
  });

  it("keeps active source QR behind the pre-commerce stub", async () => {
    const res = await handlePostArtifactIntent(
      request({ profile_id: PROFILE, source_qr_id: QR }),
      dbFor({ card: card(), qr: qr(), verification: summary() })
    );

    const json = (await res.json()) as { error: string };
    expect(res.status).toBe(501);
    expect(json.error).toBe("ARTIFACT_INTENTS_NOT_IMPLEMENTED");
  });

  it("routes POST /v1/store/artifact-intents through the Worker dispatcher", async () => {
    const res = await worker.fetch(
      request({ profile_id: PROFILE, source_qr_id: QR }),
      { DB: dbFor({ card: card(), qr: qr({ status: "revoked" }) }) },
      {} as ExecutionContext
    );

    expect(res.status).toBe(403);
    expect((await res.json()) as { error: string }).toMatchObject({
      error: "QR_REVOKED",
    });
  });
});
