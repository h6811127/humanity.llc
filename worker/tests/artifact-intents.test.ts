import { describe, expect, it } from "vitest";

import worker from "../src";
import {
  ARTIFACT_INTENT_TTL_MS,
  handlePostArtifactIntent,
  handlePostArtifactIntentAttach,
  shopifyCartMetadata,
} from "../src/resolver/artifact-intents";
import type { ArtifactIntentRow } from "../src/db/artifact-intents";
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

type IntentStore = Map<string, ArtifactIntentRow>;

function dbFor(
  rows: {
    card?: CardRow | null;
    qr?: QrCredentialRow | null;
    verification?: VerificationSummaryRow | null;
  },
  intents: IntentStore = new Map()
): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM cards")) return rows.card ?? null;
          if (sql.includes("FROM qr_credentials")) return rows.qr ?? null;
          if (sql.includes("FROM verification_summaries")) {
            return rows.verification ?? null;
          }
          if (sql.includes("FROM artifact_intents")) {
            const id = args[0] as string;
            return intents.get(id) ?? null;
          }
          return null;
        },
        run: async () => {
          if (sql.includes("INSERT INTO artifact_intents")) {
            const input = args as unknown as [
              string,
              string,
              string,
              string | null,
              number,
              string,
              string,
              string,
              string,
              string,
              string,
            ];
            const row: ArtifactIntentRow = {
              artifact_intent_id: input[0],
              profile_id: input[1],
              source_qr_id: input[2],
              product_id: input[3],
              quantity: input[4],
              planned_item_qr_ids_json: input[5],
              planned_print_artifact_ids_json: input[6],
              status: input[7] as ArtifactIntentRow["status"],
              expires_at: input[8],
              created_at: input[9],
              updated_at: input[10],
            };
            intents.set(row.artifact_intent_id, row);
          }
          if (sql.includes("UPDATE artifact_intents")) {
            const status = args[0] as ArtifactIntentRow["status"];
            const updatedAt = args[1] as string;
            const id = args[2] as string;
            const existing = intents.get(id);
            if (existing) {
              intents.set(id, { ...existing, status, updated_at: updatedAt });
            }
          }
          return { success: true };
        },
      }),
    }),
  } as unknown as D1Database;
}

function request(body: unknown, path = "/v1/store/artifact-intents"): Request {
  return new Request(`https://humanity.llc${path}`, {
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

  it("creates proofed artifact intent with planned item QR ids", async () => {
    const intents = new Map<string, ArtifactIntentRow>();
    const res = await handlePostArtifactIntent(
      request({
        profile_id: PROFILE,
        source_qr_id: QR,
        product_id: "prod_sticker_square",
        quantity: 2,
      }),
      dbFor({ card: card(), qr: qr(), verification: summary() }, intents)
    );

    const json = (await res.json()) as {
      artifact_intent_id: string;
      profile_id: string;
      source_qr_id: string;
      planned_item_qr_ids: string[];
      planned_print_artifact_ids: string[];
      product_id: string;
      quantity: number;
      preview_url: string;
      status: string;
      expires_at: string;
    };

    expect(res.status).toBe(201);
    expect(json.profile_id).toBe(PROFILE);
    expect(json.source_qr_id).toBe(QR);
    expect(json.product_id).toBe("prod_sticker_square");
    expect(json.quantity).toBe(2);
    expect(json.status).toBe("proofed");
    expect(json.planned_item_qr_ids).toHaveLength(2);
    expect(json.planned_print_artifact_ids).toHaveLength(2);
    expect(json.planned_item_qr_ids.every((id) => /^qr_/.test(id))).toBe(true);
    expect(json.planned_print_artifact_ids.every((id) => /^pa_/.test(id))).toBe(true);
    expect(json.preview_url).toContain(json.artifact_intent_id);

    const expiresMs = Date.parse(json.expires_at);
    expect(expiresMs - Date.now()).toBeLessThanOrEqual(ARTIFACT_INTENT_TTL_MS);
    expect(expiresMs - Date.now()).toBeGreaterThan(ARTIFACT_INTENT_TTL_MS - 5000);

    expect(intents.size).toBe(1);
  });

  it("rejects invalid quantity", async () => {
    const res = await handlePostArtifactIntent(
      request({ profile_id: PROFILE, source_qr_id: QR, quantity: 11 }),
      dbFor({ card: card(), qr: qr(), verification: summary() })
    );
    expect(res.status).toBe(422);
    expect((await res.json()) as { error: string }).toMatchObject({
      error: "INVALID_QUANTITY",
    });
  });

  it("attach returns Shopify cart metadata and marks attached_to_cart", async () => {
    const future = new Date(Date.now() + ARTIFACT_INTENT_TTL_MS).toISOString();
    const intentId = "ai_AttachTest123456";
    const row: ArtifactIntentRow = {
      artifact_intent_id: intentId,
      profile_id: PROFILE,
      source_qr_id: QR,
      product_id: "prod_sticker_square",
      quantity: 1,
      planned_item_qr_ids_json: JSON.stringify(["qr_planned1"]),
      planned_print_artifact_ids_json: JSON.stringify(["pa_planned1"]),
      status: "proofed",
      expires_at: future,
      created_at: "2026-05-16T17:00:00Z",
      updated_at: "2026-05-16T17:00:00Z",
    };
    const intents = new Map([[intentId, { ...row }]]);

    const res = await handlePostArtifactIntentAttach(
      request({ shopify_variant_id: "gid://shopify/ProductVariant/123" }, `/v1/store/artifact-intents/${intentId}/attach`),
      dbFor({ card: card(), qr: qr(), verification: summary() }, intents),
      intentId
    );

    const json = (await res.json()) as {
      status: string;
      shopify: { cart_line_attributes: { key: string; value: string }[] };
    };
    expect(res.status).toBe(200);
    expect(json.status).toBe("attached_to_cart");
    expect(json.shopify.cart_line_attributes).toEqual(
      expect.arrayContaining([
        { key: "artifact_intent_id", value: intentId },
        { key: "planned_item_qr_ids", value: "qr_planned1" },
      ])
    );
    expect(intents.get(intentId)?.status).toBe("attached_to_cart");
  });

  it("attach rejects expired intents", async () => {
    const intentId = "ai_ExpiredIntent12345";
    const row: ArtifactIntentRow = {
      artifact_intent_id: intentId,
      profile_id: PROFILE,
      source_qr_id: QR,
      product_id: null,
      quantity: 1,
      planned_item_qr_ids_json: "[]",
      planned_print_artifact_ids_json: "[]",
      status: "proofed",
      expires_at: "2020-01-01T00:00:00Z",
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    };
    const intents = new Map([[intentId, { ...row }]]);

    const res = await handlePostArtifactIntentAttach(
      request({}, `/v1/store/artifact-intents/${intentId}/attach`),
      dbFor({}, intents),
      intentId
    );
    expect(res.status).toBe(410);
    expect((await res.json()) as { error: string }).toMatchObject({
      error: "ARTIFACT_INTENT_EXPIRED",
    });
  });

  it("shopifyCartMetadata omits private keys", () => {
    const meta = shopifyCartMetadata({
      artifact_intent_id: "ai_test",
      profile_id: PROFILE,
      source_qr_id: QR,
      product_id: "prod_sticker_square",
      quantity: 1,
      planned_item_qr_ids_json: JSON.stringify(["qr_item1"]),
      planned_print_artifact_ids_json: JSON.stringify(["pa_item1"]),
      status: "proofed",
      expires_at: "2026-05-16T18:00:00Z",
      created_at: "2026-05-16T17:00:00Z",
      updated_at: "2026-05-16T17:00:00Z",
    });
    const serialized = JSON.stringify(meta);
    expect(serialized).not.toMatch(/private_key|secret|signature/i);
    expect(meta.cart_line_attributes.map((a) => a.key)).toContain("artifact_intent_id");
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
