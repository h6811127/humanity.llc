import { describe, expect, it } from "vitest";

import {
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5eF";
const ISSUED = "2026-05-16T17:00:00.000Z";
const OLD_EXPIRES = "2026-06-16T17:00:00.000Z";
const NEW_EXPIRES = "2027-06-16T17:00:00.000Z";
const PAYLOAD = `https://humanity.llc/c/${PROFILE}?q=${QR}`;

function extendMockDb(existing: {
  public_key: string;
  recovery_public_key?: string | null;
  status?: string;
  qr?: {
    qr_id: string;
    epoch: number;
    payload: string;
    issued_at: string;
    expires_at: string | null;
  };
}) {
  const qr = existing.qr ?? {
    qr_id: QR,
    epoch: 1,
    payload: PAYLOAD,
    issued_at: ISSUED,
    expires_at: OLD_EXPIRES,
  };
  let storedQr = { ...qr, status: "active" };
  const card = {
    public_key: existing.public_key,
    recovery_public_key: existing.recovery_public_key ?? null,
    handle: "river_example",
    handle_normalized: "river_example",
    manifesto_line: "Open studio",
    status: existing.status ?? "active",
    card_document_json: "{}",
    created_at: ISSUED,
    updated_at: ISSUED,
  };

  return {
    prepare: (sql: string) => ({
      bind: () => ({
        first: async () => {
          if (sql.includes("issuer_public_key")) {
            return {
              public_key: card.public_key,
              recovery_public_key: card.recovery_public_key,
              issuer_public_key: null,
              status: card.status,
            };
          }
          if (sql.includes("handle_normalized")) {
            return { ...card };
          }
          if (sql.includes("scope = 'card' AND status = 'active'") && sql.includes("LIMIT 1")) {
            if (sql.includes("epoch, scope, payload")) {
              return { ...storedQr, profile_id: PROFILE, scope: "card" };
            }
            return { qr_id: storedQr.qr_id, epoch: storedQr.epoch, status: "active" };
          }
          return null;
        },
        run: async () => {
          if (sql.includes("UPDATE qr_credentials SET expires_at")) {
            storedQr = { ...storedQr, expires_at: NEW_EXPIRES };
            return { success: true, meta: { changes: 1 } };
          }
          return { success: true, meta: { changes: 0 } };
        },
      }),
    }),
    get storedQr() {
      return storedQr;
    },
  } as unknown as D1Database;
}

async function signedExtend(publicKeyBase58: string, privateKey: Uint8Array) {
  return signDocument(
    withProtocolFields(
      {
        qr_id: QR,
        profile_id: PROFILE,
        nonce: "nonce_extendTest01",
        epoch: 1,
        scope: "card",
        resolver_hint: "https://humanity.llc",
        issued_at: ISSUED,
        expires_at: NEW_EXPIRES,
        status: "active",
        payload: PAYLOAD,
      },
      PAYLOAD_TYPES.QR_CREDENTIAL
    ),
    { privateKey, publicKeyBase58 }
  );
}

describe("handlePostExtendQr", () => {
  it("rejects unsigned body", async () => {
    const { handlePostExtendQr } = await import("../src/resolver/extend-qr");
    const res = await handlePostExtendQr(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/qr/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      {} as D1Database,
      PROFILE
    );
    expect(res.status).toBe(400);
  });

  it("accepts owner-signed extension", async () => {
    const { handlePostExtendQr } = await import("../src/resolver/extend-qr");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const qr_credential = await signedExtend(publicKeyBase58, privateKey);
    const db = extendMockDb({ public_key: publicKeyBase58 });

    const res = await handlePostExtendQr(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/qr/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_credential }),
      }),
      db,
      PROFILE
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { qr_expires_at: string };
    expect(json.qr_expires_at).toBe(NEW_EXPIRES);
  });

  it("rejects expiry that is not later than current", async () => {
    const { handlePostExtendQr } = await import("../src/resolver/extend-qr");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const qr_credential = await signDocument(
      withProtocolFields(
        {
          qr_id: QR,
          profile_id: PROFILE,
          nonce: "nonce_extendStale1",
          epoch: 1,
          scope: "card",
          resolver_hint: "https://humanity.llc",
          issued_at: ISSUED,
          expires_at: OLD_EXPIRES,
          status: "active",
          payload: PAYLOAD,
        },
        PAYLOAD_TYPES.QR_CREDENTIAL
      ),
      { privateKey, publicKeyBase58 }
    );

    const db = extendMockDb({ public_key: publicKeyBase58 });
    const res = await handlePostExtendQr(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/qr/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_credential }),
      }),
      db,
      PROFILE
    );
    expect(res.status).toBe(422);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("INVALID_QR_EXPIRY");
  });
});
