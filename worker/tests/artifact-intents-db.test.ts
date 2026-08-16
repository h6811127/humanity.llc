import { describe, expect, it } from "vitest";

import {
  getArtifactIntent,
  insertArtifactIntent,
  updateArtifactIntentAttachFields,
  updateArtifactIntentPendingMint,
  updateArtifactIntentStatus,
  type ArtifactIntentRow,
  type InsertArtifactIntentInput,
} from "../src/db/artifact-intents";

const INTENT_A = "ai_preMintSticker919";
const INTENT_B = "ai_preMintSticker818";
const PROFILE_A = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const PROFILE_B = "8Ym2nQ4pR6sT8vW1yZ3aB5cD7";
const QR_A = "qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6";
const QR_B = "qr_9Zm2pR4qS6tV8xY1aB3cD5eF7";
const PA_A = "pa_testPreMintAuto919";
const PA_B = "pa_testPreMintAuto818";
const NOW = "2026-08-16T10:00:00.000Z";
const LATER = "2026-08-16T11:00:00.000Z";

class FakeArtifactIntentDb {
  rows = new Map<string, ArtifactIntentRow>();

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM artifact_intents WHERE artifact_intent_id = ?")) {
              return (self.rows.get(String(args[0])) ?? null) as T | null;
            }
            return null;
          },
          async run() {
            if (sql.includes("INSERT INTO artifact_intents")) {
              const row: ArtifactIntentRow = {
                artifact_intent_id: String(args[0]),
                profile_id: String(args[1]),
                source_qr_id: String(args[2]),
                product_id: (args[3] as string | null) ?? null,
                print_variant_id: (args[4] as string | null) ?? null,
                print_frame_background: args[5] as ArtifactIntentRow["print_frame_background"],
                quantity: Number(args[6]),
                planned_item_qr_ids_json: String(args[7]),
                planned_print_artifact_ids_json: String(args[8]),
                pending_mint_credentials_json: null,
                status: args[9] as ArtifactIntentRow["status"],
                expires_at: String(args[10]),
                created_at: String(args[11]),
                updated_at: String(args[12]),
              };
              self.rows.set(row.artifact_intent_id, row);
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("SET pending_mint_credentials_json")) {
              const existing = self.rows.get(String(args[2]));
              if (!existing) return { success: true, meta: { changes: 0 } };
              self.rows.set(existing.artifact_intent_id, {
                ...existing,
                pending_mint_credentials_json: String(args[0]),
                updated_at: String(args[1]),
              });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("SET status = ?")) {
              const existing = self.rows.get(String(args[2]));
              if (!existing) return { success: true, meta: { changes: 0 } };
              self.rows.set(existing.artifact_intent_id, {
                ...existing,
                status: args[0] as ArtifactIntentRow["status"],
                updated_at: String(args[1]),
              });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("SET print_variant_id = ?")) {
              const existing = self.rows.get(String(args[3]));
              if (!existing) return { success: true, meta: { changes: 0 } };
              self.rows.set(existing.artifact_intent_id, {
                ...existing,
                print_variant_id: (args[0] as string | null) ?? null,
                print_frame_background: args[1] as ArtifactIntentRow["print_frame_background"],
                updated_at: String(args[2]),
              });
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function db(fake: FakeArtifactIntentDb): D1Database {
  return fake as unknown as D1Database;
}

function insertInput(
  intentId: string,
  overrides: Partial<InsertArtifactIntentInput> = {}
): InsertArtifactIntentInput {
  const isA = intentId === INTENT_A;
  return {
    artifact_intent_id: intentId,
    profile_id: isA ? PROFILE_A : PROFILE_B,
    source_qr_id: isA ? QR_A : QR_B,
    product_id: "hc-sticker-square-v1",
    print_variant_id: "variant-sticker",
    print_frame_background: "full",
    quantity: 1,
    planned_item_qr_ids: [isA ? QR_A : QR_B],
    planned_print_artifact_ids: [isA ? PA_A : PA_B],
    status: "proofed",
    expires_at: "2026-08-17T10:00:00.000Z",
    created_at: NOW,
    ...overrides,
  };
}

describe("artifact intent db helpers", () => {
  it("inserts and loads by artifact_intent_id without leaking neighbors", async () => {
    const fake = new FakeArtifactIntentDb();
    expect(await getArtifactIntent(db(fake), INTENT_A)).toBeNull();

    await insertArtifactIntent(db(fake), insertInput(INTENT_A));
    await insertArtifactIntent(db(fake), insertInput(INTENT_B, { status: "attached_to_cart" }));

    const a = await getArtifactIntent(db(fake), INTENT_A);
    const b = await getArtifactIntent(db(fake), INTENT_B);

    expect(a?.profile_id).toBe(PROFILE_A);
    expect(a?.status).toBe("proofed");
    expect(a?.pending_mint_credentials_json).toBeNull();
    expect(JSON.parse(a!.planned_print_artifact_ids_json)).toEqual([PA_A]);
    expect(b?.profile_id).toBe(PROFILE_B);
    expect(b?.status).toBe("attached_to_cart");
    expect(await getArtifactIntent(db(fake), "ai_missingIntent")).toBeNull();
  });

  it("stores blank print_variant_id as null on insert", async () => {
    const fake = new FakeArtifactIntentDb();
    await insertArtifactIntent(
      db(fake),
      insertInput(INTENT_A, { print_variant_id: "   " })
    );

    const row = await getArtifactIntent(db(fake), INTENT_A);
    expect(row?.print_variant_id).toBeNull();
    expect(row?.print_frame_background).toBe("full");
  });

  it("updates pending mint credentials only for the target intent", async () => {
    const fake = new FakeArtifactIntentDb();
    await insertArtifactIntent(db(fake), insertInput(INTENT_A));
    await insertArtifactIntent(db(fake), insertInput(INTENT_B));

    const pending = JSON.stringify([{ qr_id: QR_A, print_artifact_id: PA_A }]);
    await updateArtifactIntentPendingMint(db(fake), INTENT_A, pending, LATER);

    const a = await getArtifactIntent(db(fake), INTENT_A);
    const b = await getArtifactIntent(db(fake), INTENT_B);
    expect(a?.pending_mint_credentials_json).toBe(pending);
    expect(a?.updated_at).toBe(LATER);
    expect(b?.pending_mint_credentials_json).toBeNull();
    expect(b?.updated_at).toBe(NOW);
  });

  it("updates status only for the target intent", async () => {
    const fake = new FakeArtifactIntentDb();
    await insertArtifactIntent(db(fake), insertInput(INTENT_A));
    await insertArtifactIntent(db(fake), insertInput(INTENT_B));

    await updateArtifactIntentStatus(db(fake), INTENT_A, "converted", LATER);

    expect((await getArtifactIntent(db(fake), INTENT_A))?.status).toBe("converted");
    expect((await getArtifactIntent(db(fake), INTENT_B))?.status).toBe("proofed");
  });

  it("updates attach fields only for the target intent", async () => {
    const fake = new FakeArtifactIntentDb();
    await insertArtifactIntent(db(fake), insertInput(INTENT_A));
    await insertArtifactIntent(db(fake), insertInput(INTENT_B));

    await updateArtifactIntentAttachFields(db(fake), INTENT_A, {
      print_variant_id: "hoodie-black",
      print_frame_background: "transparent",
      updatedAt: LATER,
    });

    const a = await getArtifactIntent(db(fake), INTENT_A);
    const b = await getArtifactIntent(db(fake), INTENT_B);
    expect(a?.print_variant_id).toBe("hoodie-black");
    expect(a?.print_frame_background).toBe("transparent");
    expect(a?.updated_at).toBe(LATER);
    expect(b?.print_variant_id).toBe("variant-sticker");
    expect(b?.print_frame_background).toBe("full");
  });
});
