import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as ed from "@noble/ed25519";

import { encodeBase58 } from "../src/crypto/base58";
import {
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";

async function randomKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyBase58: encodeBase58(publicKey) };
}
import { buildScanViewModel, CACHE_ACTIVE } from "../src/resolver/scan-state";
import { httpStatusForScanKind } from "../src/resolver/scan-status";
import type { CardRow, QrCredentialRow } from "../src/db/types";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function loadFixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(join(fixturesDir, `${name}.json`), "utf8")
  ) as T;
}

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_test_card_001";

function card(): CardRow {
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
  };
}

function qr(): QrCredentialRow {
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
  };
}

describe("M3.6 cache + HTTP status", () => {
  it("active scan uses short must-revalidate Cache-Control", () => {
    const vm = buildScanViewModel(PROFILE, QR, { card: card(), qr: qr(), verification: null, revocationDisplay: null }, "https://humanity.llc");
    expect(vm.cacheControl).toBe(CACHE_ACTIVE);
    expect(CACHE_ACTIVE).not.toContain("stale-while-revalidate");
    expect(httpStatusForScanKind("card_revoked")).toBe(410);
    expect(httpStatusForScanKind("malformed")).toBe(400);
  });

  it("revoked scan responses use no-store", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: { ...qr(), status: "revoked" },
        verification: null,
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("qr_revoked");
    expect(vm.cacheControl).toBe("no-store");
  });
});

describe("handlePostRevoke", () => {
  it("rejects unsigned body", async () => {
    const { handlePostRevoke } = await import("../src/resolver/revoke");
    const res = await handlePostRevoke(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/7Xk9mP2nQ4rT6vW8yZ1aB3cD5/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      {} as D1Database,
      PROFILE
    );
    expect(res.status).toBe(400);
  });

  it("rejects wrong owner key", async () => {
    const { handlePostRevoke } = await import("../src/resolver/revoke");
    const doc = loadFixture<Record<string, unknown>>("revocation");
    const profileId = doc.profile_id as string;

    const db = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes("FROM cards")) {
              return {
                public_key: "WrongKeyWrongKeyWrongKeyWrongKeyWrongKey12",
                recovery_public_key: null,
                issuer_public_key: null,
                status: "active",
              };
            }
            if (sql.includes("FROM revocations")) return null;
            return null;
          },
        }),
      }),
    } as unknown as D1Database;

    const res = await handlePostRevoke(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${profileId}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revocation: doc }),
      }),
      db,
      profileId
    );
    expect(res.status).toBe(401);
  });

  it("accepts valid QR revocation against mock DB", async () => {
    const { handlePostRevoke } = await import("../src/resolver/revoke");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const qrId = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
    const nonce = `nonce_revoke_test_${Date.now()}`;

    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          target_kind: "qr_credential",
          target_qr_id: qrId,
          reason: "owner_revoked",
          revoked_at: "2026-05-16T17:00:00.000Z",
          nonce,
        },
        PAYLOAD_TYPES.REVOCATION
      ),
      { privateKey, publicKeyBase58 }
    );

    const batchCalls: unknown[] = [];
    const db = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes("FROM cards")) {
              return {
                public_key: publicKeyBase58,
                recovery_public_key: null,
                issuer_public_key: null,
                status: "active",
              };
            }
            if (sql.includes("FROM revocations")) return null;
            if (sql.includes("FROM qr_credentials")) {
              return { qr_id: qrId, profile_id: PROFILE, status: "active" };
            }
            return null;
          },
        }),
      }),
      batch: async (stmts: unknown) => {
        batchCalls.push(stmts);
        return Array.isArray(stmts)
          ? stmts.map(() => ({ success: true }))
          : [{ success: true }];
      },
    } as unknown as D1Database;

    const res = await handlePostRevoke(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revocation: signed }),
      }),
      db,
      PROFILE
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { target_kind: string; target_qr_id: string };
    expect(json.target_kind).toBe("qr_credential");
    expect(json.target_qr_id).toBe(qrId);
    expect(batchCalls.length).toBe(1);
  });

  it("rejects invalid display_mode on revocation", async () => {
    const { handlePostRevoke } = await import("../src/resolver/revoke");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const qrId = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          target_kind: "qr_credential",
          target_qr_id: qrId,
          reason: "owner_revoked",
          revoked_at: "2026-05-16T17:00:00.000Z",
          nonce: `nonce_display_bad_${Date.now()}`,
          display_mode: "glossy",
        },
        PAYLOAD_TYPES.REVOCATION
      ),
      { privateKey, publicKeyBase58 }
    );

    const db = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes("FROM cards")) {
              return {
                public_key: publicKeyBase58,
                recovery_public_key: null,
                issuer_public_key: null,
                status: "active",
              };
            }
            if (sql.includes("FROM revocations")) return null;
            if (sql.includes("FROM qr_credentials")) {
              return { qr_id: qrId, profile_id: PROFILE, status: "active" };
            }
            return null;
          },
        }),
      }),
      batch: async () => [{ success: true }],
    } as unknown as D1Database;

    const res = await handlePostRevoke(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revocation: signed }),
      }),
      db,
      PROFILE
    );
    expect(res.status).toBe(422);
  });

  it("accepts tombstone display_mode on QR revocation", async () => {
    const { handlePostRevoke } = await import("../src/resolver/revoke");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const qrId = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3c";
    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          target_kind: "qr_credential",
          target_qr_id: qrId,
          reason: "owner_revoked",
          revoked_at: "2026-05-16T17:00:00.000Z",
          nonce: `nonce_tombstone_${Date.now()}`,
          display_mode: "tombstone",
          public_reason: "event_ended",
        },
        PAYLOAD_TYPES.REVOCATION
      ),
      { privateKey, publicKeyBase58 }
    );

    const db = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes("FROM cards")) {
              return {
                public_key: publicKeyBase58,
                recovery_public_key: null,
                issuer_public_key: null,
                status: "active",
              };
            }
            if (sql.includes("FROM revocations")) return null;
            if (sql.includes("FROM qr_credentials")) {
              return { qr_id: qrId, profile_id: PROFILE, status: "active" };
            }
            return null;
          },
        }),
      }),
      batch: async (stmts: unknown) =>
        Array.isArray(stmts)
          ? stmts.map(() => ({ success: true }))
          : [{ success: true }],
    } as unknown as D1Database;

    const res = await handlePostRevoke(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revocation: signed }),
      }),
      db,
      PROFILE
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      display_mode: string;
      public_reason: string;
    };
    expect(json.display_mode).toBe("tombstone");
    expect(json.public_reason).toBe("event_ended");
  });

  it("accepts valid QR revocation signed by recovery key", async () => {
    const { handlePostRevoke } = await import("../src/resolver/revoke");
    const owner = await getTestKeypair();
    const recovery = await getTestKeypair();
    const qrId = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3c";
    const nonce = `nonce_recovery_${Date.now()}`;

    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          target_kind: "qr_credential",
          target_qr_id: qrId,
          reason: "owner_revoked",
          revoked_at: "2026-05-16T17:00:00.000Z",
          nonce,
        },
        PAYLOAD_TYPES.REVOCATION
      ),
      { privateKey: recovery.privateKey, publicKeyBase58: recovery.publicKeyBase58 }
    );

    const db = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes("FROM cards")) {
              return {
                public_key: owner.publicKeyBase58,
                recovery_public_key: recovery.publicKeyBase58,
                issuer_public_key: null,
                status: "active",
              };
            }
            if (sql.includes("FROM revocations")) return null;
            if (sql.includes("FROM qr_credentials")) {
              return { qr_id: qrId, profile_id: PROFILE, status: "active" };
            }
            return null;
          },
        }),
      }),
      batch: async () => [{ success: true }],
    } as unknown as D1Database;

    const res = await handlePostRevoke(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revocation: signed }),
      }),
      db,
      PROFILE
    );

    expect(res.status).toBe(200);
  });

  it("accepts organizer-signed QR revocation when issuer key registered", async () => {
    const { handlePostRevoke } = await import("../src/resolver/revoke");
    const owner = await getTestKeypair();
    const organizer = await randomKeypair();
    const qrId = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
    const nonce = `nonce_org_${Date.now()}`;

    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          target_kind: "qr_credential",
          target_qr_id: qrId,
          reason: "organizer_revoked",
          revoked_at: "2026-05-16T17:00:00.000Z",
          nonce,
        },
        PAYLOAD_TYPES.REVOCATION
      ),
      { privateKey: organizer.privateKey, publicKeyBase58: organizer.publicKeyBase58 }
    );

    const db = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes("FROM cards")) {
              return {
                public_key: owner.publicKeyBase58,
                recovery_public_key: null,
                issuer_public_key: organizer.publicKeyBase58,
                status: "active",
              };
            }
            if (sql.includes("FROM revocations")) return null;
            if (sql.includes("FROM qr_credentials")) {
              return { qr_id: qrId, profile_id: PROFILE, status: "active" };
            }
            return null;
          },
        }),
      }),
      batch: async () => [{ success: true }],
    } as unknown as D1Database;

    const res = await handlePostRevoke(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revocation: signed }),
      }),
      db,
      PROFILE
    );

    expect(res.status).toBe(200);
  });

  it("rejects organizer reason when signed by owner key", async () => {
    const { handlePostRevoke } = await import("../src/resolver/revoke");
    const owner = await getTestKeypair();
    const qrId = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3c";
    const nonce = `nonce_wrong_reason_${Date.now()}`;

    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          target_kind: "qr_credential",
          target_qr_id: qrId,
          reason: "organizer_revoked",
          revoked_at: "2026-05-16T17:00:00.000Z",
          nonce,
        },
        PAYLOAD_TYPES.REVOCATION
      ),
      { privateKey: owner.privateKey, publicKeyBase58: owner.publicKeyBase58 }
    );

    const db = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes("FROM cards")) {
              return {
                public_key: owner.publicKeyBase58,
                recovery_public_key: null,
                issuer_public_key: "OtherOrganizerKeyOtherOrganizerKeyOther12",
                status: "active",
              };
            }
            if (sql.includes("FROM revocations")) return null;
            if (sql.includes("FROM qr_credentials")) {
              return { qr_id: qrId, profile_id: PROFILE, status: "active" };
            }
            return null;
          },
        }),
      }),
    } as unknown as D1Database;

    const res = await handlePostRevoke(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revocation: signed }),
      }),
      db,
      PROFILE
    );

    expect(res.status).toBe(422);
  });
});
