import { describe, expect, it } from "vitest";
import * as ed from "@noble/ed25519";

import {
  CRYPTO_ERROR,
  encodeBase58,
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { validatePreMintCredentialsForIntent } from "../src/commerce/pre-mint-credentials";
import type { ArtifactIntentRow } from "../src/db/artifact-intents";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const OTHER_PROFILE = "8YmAnQ3oR5sT7vW9yA2bC4dE6f";
const INTENT = "ai_PreMintValidate01";
const PLANNED_QR = "qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6fG";
const PLANNED_QR_B = "qr_9ZkAoR4pS6tV8xYAaB3cD4eF7gH";
const PLANNED_PA = "pa_testPreMintAuto919";
const PLANNED_PA_B = "pa_testPreMintAuto928";

async function randomKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyBase58: encodeBase58(publicKey) };
}

function intentRow(
  overrides: Partial<ArtifactIntentRow> = {},
  planned: { qrIds?: string[]; paIds?: string[] } = {}
): ArtifactIntentRow {
  const qrIds = planned.qrIds ?? [PLANNED_QR];
  const paIds = planned.paIds ?? [PLANNED_PA];
  return {
    artifact_intent_id: INTENT,
    profile_id: PROFILE,
    source_qr_id: "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    product_id: "hoodie_live_object_v1",
    quantity: qrIds.length,
    planned_item_qr_ids_json: JSON.stringify(qrIds),
    planned_print_artifact_ids_json: JSON.stringify(paIds),
    pending_mint_credentials_json: null,
    status: "attached_to_cart",
    expires_at: "2099-01-01T00:00:00Z",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

function dbFor(card: {
  public_key: string;
  recovery_public_key?: string | null;
  status?: string;
} | null): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (..._args: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM cards WHERE profile_id = ?")) {
            if (!card) return null;
            return {
              public_key: card.public_key,
              recovery_public_key: card.recovery_public_key ?? null,
              handle: "river_example",
              handle_normalized: "river_example",
              manifesto_line: "Open studio",
              status: card.status ?? "active",
              card_document_json: "{}",
              created_at: "2026-05-16T17:00:00Z",
              updated_at: "2026-05-16T17:00:00Z",
            };
          }
          return null;
        },
        run: async () => ({ success: true }),
      }),
    }),
  } as unknown as D1Database;
}

async function buildCredential(
  privateKey: CryptoKey | Uint8Array,
  publicKeyBase58: string,
  overrides: Record<string, unknown> = {},
  nonce = "nonce_preMintValidate1"
) {
  return signDocument(
    withProtocolFields(
      {
        qr_id: PLANNED_QR,
        profile_id: PROFILE,
        nonce,
        epoch: 1,
        scope: "print_artifact",
        print_artifact_id: PLANNED_PA,
        resolver_hint: "https://humanity.llc",
        issued_at: "2026-05-16T17:00:00.000Z",
        expires_at: null,
        status: "active",
        payload: `https://humanity.llc/c/${PROFILE}?q=${PLANNED_QR}`,
        ...overrides,
      },
      PAYLOAD_TYPES.QR_CREDENTIAL
    ),
    { privateKey, publicKeyBase58 }
  );
}

function request(url = "https://humanity.llc/v1/store/artifact-intents/x/pre-mint") {
  return new Request(url, { method: "POST" });
}

describe("validatePreMintCredentialsForIntent", () => {
  it("accepts a matching owner-signed print_artifact credential batch", async () => {
    const owner = await getTestKeypair();
    const credential = await buildCredential(owner.privateKey, owner.publicKeyBase58);
    const result = await validatePreMintCredentialsForIntent(
      request(),
      dbFor({ public_key: owner.publicKeyBase58 }),
      intentRow(),
      [credential]
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.credentials).toHaveLength(1);
    }
  });

  it("rejects when credential count does not match planned quantity", async () => {
    const owner = await getTestKeypair();
    const credential = await buildCredential(owner.privateKey, owner.publicKeyBase58);
    const result = await validatePreMintCredentialsForIntent(
      request(),
      dbFor({ public_key: owner.publicKeyBase58 }),
      intentRow(),
      [credential, credential]
    );
    expect(result).toMatchObject({
      ok: false,
      code: "PRE_MINT_COUNT_MISMATCH",
      httpStatus: 422,
    });
  });

  it("rejects credentials whose profile_id does not match the intent", async () => {
    const owner = await getTestKeypair();
    const credential = await buildCredential(owner.privateKey, owner.publicKeyBase58, {
      profile_id: OTHER_PROFILE,
      payload: `https://humanity.llc/c/${OTHER_PROFILE}?q=${PLANNED_QR}`,
    });
    const result = await validatePreMintCredentialsForIntent(
      request(),
      dbFor({ public_key: owner.publicKeyBase58 }),
      intentRow(),
      [credential]
    );
    expect(result).toMatchObject({
      ok: false,
      code: "PROFILE_MISMATCH",
    });
  });

  it("rejects non-print_artifact QR scopes", async () => {
    const owner = await getTestKeypair();
    const credential = await buildCredential(owner.privateKey, owner.publicKeyBase58, {
      scope: "card",
      print_artifact_id: undefined,
    });
    const result = await validatePreMintCredentialsForIntent(
      request(),
      dbFor({ public_key: owner.publicKeyBase58 }),
      intentRow(),
      [credential]
    );
    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_QR_SCOPE",
    });
  });

  it("rejects payload URLs that are not the expected /c/{profile}?q={qr_id} form", async () => {
    const owner = await getTestKeypair();
    const credential = await buildCredential(owner.privateKey, owner.publicKeyBase58, {
      payload: `https://evil.example/c/${PROFILE}?q=${PLANNED_QR}`,
    });
    const result = await validatePreMintCredentialsForIntent(
      request(),
      dbFor({ public_key: owner.publicKeyBase58 }),
      intentRow(),
      [credential]
    );
    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_QR_PAYLOAD",
    });
  });

  it("rejects pre-mint on inactive cards", async () => {
    const owner = await getTestKeypair();
    const credential = await buildCredential(owner.privateKey, owner.publicKeyBase58);
    const result = await validatePreMintCredentialsForIntent(
      request(),
      dbFor({ public_key: owner.publicKeyBase58, status: "revoked" }),
      intentRow(),
      [credential]
    );
    expect(result).toMatchObject({
      ok: false,
      code: "CARD_UNAVAILABLE",
      httpStatus: 410,
    });
  });

  it("rejects credentials signed by a non-owner key", async () => {
    const owner = await getTestKeypair();
    const stranger = await randomKeypair();
    const credential = await buildCredential(stranger.privateKey, stranger.publicKeyBase58);
    const result = await validatePreMintCredentialsForIntent(
      request(),
      dbFor({ public_key: owner.publicKeyBase58 }),
      intentRow(),
      [credential]
    );
    expect(result).toMatchObject({
      ok: false,
      code: CRYPTO_ERROR.INVALID_SIGNATURE,
    });
  });

  it("rejects qr_id/print_artifact_id pairs that are not in the intent plan", async () => {
    const owner = await getTestKeypair();
    const credential = await buildCredential(owner.privateKey, owner.publicKeyBase58, {
      qr_id: PLANNED_QR_B,
      print_artifact_id: PLANNED_PA_B,
      payload: `https://humanity.llc/c/${PROFILE}?q=${PLANNED_QR_B}`,
    });
    const result = await validatePreMintCredentialsForIntent(
      request(),
      dbFor({ public_key: owner.publicKeyBase58 }),
      intentRow(),
      [credential]
    );
    expect(result).toMatchObject({
      ok: false,
      code: "PLANNED_QR_MISMATCH",
    });
  });

  it("rejects duplicate planned qr_id values in one batch", async () => {
    const owner = await getTestKeypair();
    const first = await buildCredential(
      owner.privateKey,
      owner.publicKeyBase58,
      {},
      "nonce_preMintDupA"
    );
    const second = await buildCredential(
      owner.privateKey,
      owner.publicKeyBase58,
      {},
      "nonce_preMintDupB"
    );
    const result = await validatePreMintCredentialsForIntent(
      request(),
      dbFor({ public_key: owner.publicKeyBase58 }),
      intentRow(
        {},
        {
          qrIds: [PLANNED_QR, PLANNED_QR_B],
          paIds: [PLANNED_PA, PLANNED_PA_B],
        }
      ),
      [first, second]
    );
    expect(result).toMatchObject({
      ok: false,
      code: "DUPLICATE_PLANNED_QR",
    });
  });
});
