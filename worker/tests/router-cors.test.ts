import { describe, expect, it } from "vitest";

import worker from "../src";
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

function summary(overrides: Partial<VerificationSummaryRow> = {}): VerificationSummaryRow {
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
    ...overrides,
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

describe("worker router CORS", () => {
  it("adds CORS headers to GET /status for local Pages dev", async () => {
    const res = await worker.fetch(
      new Request(
        `http://127.0.0.1:8787/.well-known/hc/v1/cards/${PROFILE}/status?q=${QR}`,
        {
          headers: {
            Origin: "http://localhost:8788",
          },
        }
      ),
      { DB: dbFor({ card: card(), qr: qr(), verification: summary() }) },
      {} as ExecutionContext
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:8788"
    );
  });
});
