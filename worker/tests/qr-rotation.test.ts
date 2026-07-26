import * as ed from "@noble/ed25519";
import { describe, expect, it } from "vitest";

import {
  encodeBase58,
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { renderScanPage } from "../src/resolver/scan-html";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const OTHER_PROFILE = "cuAPt5nFYr8VCCWgPbAAupBS";
const CREATED = "2026-05-16T17:00:00.000Z";
const OLD_QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5eF";
const NEW_QR = "qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6fG";

async function randomKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyBase58: encodeBase58(publicKey) };
}

function rotationMockDb(existing: {
  public_key: string;
  recovery_public_key?: string | null;
  handle?: string;
  manifesto_line?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  activeQr?: { qr_id: string; epoch: number } | null;
  maxEpoch?: number;
}) {
  let stored = {
    public_key: existing.public_key,
    recovery_public_key: existing.recovery_public_key ?? null,
    handle: existing.handle ?? "river_example",
    handle_normalized: existing.handle ?? "river_example",
    manifesto_line: existing.manifesto_line ?? "Open studio",
    status: existing.status ?? "active",
    card_document_json: "{}",
    created_at: existing.created_at ?? CREATED,
    updated_at: existing.updated_at ?? CREATED,
  };
  let activeQr = existing.activeQr ?? { qr_id: OLD_QR, epoch: 1 };
  let maxEpoch = existing.maxEpoch ?? activeQr?.epoch ?? 1;
  const qrRows: { qr_id: string; epoch: number; status: string }[] = activeQr
    ? [{ ...activeQr, status: "active" }]
    : [];

  return {
    prepare: (sql: string) => ({
      bind: (..._args: unknown[]) => ({
        first: async () => {
          if (sql.includes("issuer_public_key")) {
            return {
              public_key: stored.public_key,
              recovery_public_key: stored.recovery_public_key,
              issuer_public_key: null,
              status: stored.status,
            };
          }
          if (sql.includes("handle_normalized")) {
            return { ...stored };
          }
          if (sql.includes("scope = 'card' AND status = 'active'")) {
            return activeQr ? { ...activeQr, status: "active" } : null;
          }
          if (sql.includes("MAX(epoch)")) {
            return { max_epoch: maxEpoch };
          }
          return null;
        },
        run: async () => ({ success: true, meta: { changes: 1 } }),
      }),
    }),
    batch: async (stmts: unknown[]) => {
      for (const _s of stmts) {
        if (activeQr) {
          const idx = qrRows.findIndex((r) => r.qr_id === activeQr!.qr_id);
          if (idx >= 0) qrRows[idx] = { ...qrRows[idx]!, status: "replaced" };
        }
      }
      activeQr = { qr_id: NEW_QR, epoch: 2 };
      maxEpoch = 2;
      qrRows.push({ qr_id: NEW_QR, epoch: 2, status: "active" });
      stored = { ...stored, updated_at: "2026-05-18T10:00:00.000Z" };
      return stmts.map(() => ({ success: true }));
    },
    get activeQr() {
      return activeQr;
    },
    get qrRows() {
      return qrRows;
    },
  } as unknown as D1Database;
}

async function signedRotationPair(
  publicKeyBase58: string,
  privateKey: Uint8Array,
  opts: {
    qrId?: string;
    epoch?: number;
    qrProfileId?: string;
    cardPublicKey?: string;
    scope?: string;
    qrStatus?: string;
    nonce?: string;
  } = {}
) {
  const qrId = opts.qrId ?? NEW_QR;
  const epoch = opts.epoch ?? 2;
  const qrProfileId = opts.qrProfileId ?? PROFILE;
  const cardPublicKey = opts.cardPublicKey ?? publicKeyBase58;
  const scope = opts.scope ?? "card";
  const qrStatus = opts.qrStatus ?? "active";
  const updatedAt = "2026-05-18T10:00:00.000Z";
  const issuedAt = updatedAt;
  const payload = `https://humanity.llc/c/${qrProfileId}?q=${qrId}`;
  const expiresAt = "2027-05-18T10:00:00.000Z";

  const card = await signDocument(
    withProtocolFields(
      {
        profile_id: PROFILE,
        public_key: cardPublicKey,
        handle: "river_example",
        manifesto_line: "Open studio",
        created_at: CREATED,
        updated_at: updatedAt,
        status: "active",
        verification: {
          level: 1,
          label: "Registered",
          method: "registered",
          verified_at: CREATED,
          vouch_count: 0,
          latest_accepted_vouch_at: null,
        },
        badges: [],
        qr: { active_qr_id: qrId, epoch },
        links: { standards: "https://humanity.llc/standards/v1" },
      },
      PAYLOAD_TYPES.HUMANITY_CARD
    ),
    { privateKey, publicKeyBase58 }
  );

  const qr_credential = await signDocument(
    withProtocolFields(
      {
        qr_id: qrId,
        profile_id: qrProfileId,
        nonce: opts.nonce ?? "nonce_testRotation1A",
        epoch,
        scope,
        resolver_hint: "https://humanity.llc",
        issued_at: issuedAt,
        expires_at: expiresAt,
        status: qrStatus,
        payload,
      },
      PAYLOAD_TYPES.QR_CREDENTIAL
    ),
    { privateKey, publicKeyBase58 }
  );

  return { card, qr_credential };
}

describe("handlePostRotateQr", () => {
  it("rejects unsigned body", async () => {
    const { handlePostRotateQr } = await import("../src/resolver/rotate-qr");
    const res = await handlePostRotateQr(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      {} as D1Database,
      PROFILE
    );
    expect(res.status).toBe(400);
  });

  it("accepts owner-signed rotation and marks previous QR replaced", async () => {
    const { handlePostRotateQr } = await import("../src/resolver/rotate-qr");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const { card, qr_credential } = await signedRotationPair(publicKeyBase58, privateKey);

    const db = rotationMockDb({
      public_key: publicKeyBase58,
      activeQr: { qr_id: OLD_QR, epoch: 1 },
    });

    const res = await handlePostRotateQr(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, qr_credential }),
      }),
      db,
      PROFILE
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      qr_id: string;
      replaced_qr_id: string;
      epoch: number;
    };
    expect(json.qr_id).toBe(NEW_QR);
    expect(json.replaced_qr_id).toBe(OLD_QR);
    expect(json.epoch).toBe(2);
  });

  it("rejects wrong epoch", async () => {
    const { handlePostRotateQr } = await import("../src/resolver/rotate-qr");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const updatedAt = "2026-05-18T10:00:00.000Z";
    const payload = `https://humanity.llc/c/${PROFILE}?q=${NEW_QR}`;
    const card = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          public_key: publicKeyBase58,
          handle: "river_example",
          manifesto_line: "Open studio",
          created_at: CREATED,
          updated_at: updatedAt,
          status: "active",
          qr: { active_qr_id: NEW_QR, epoch: 5 },
          links: {},
        },
        PAYLOAD_TYPES.HUMANITY_CARD
      ),
      { privateKey, publicKeyBase58 }
    );
    const qr_credential = await signDocument(
      withProtocolFields(
        {
          qr_id: NEW_QR,
          profile_id: PROFILE,
          nonce: "nonce_wrongEpoch1A",
          epoch: 5,
          scope: "card",
          resolver_hint: "https://humanity.llc",
          issued_at: updatedAt,
          expires_at: "2027-05-18T10:00:00.000Z",
          status: "active",
          payload,
        },
        PAYLOAD_TYPES.QR_CREDENTIAL
      ),
      { privateKey, publicKeyBase58 }
    );

    const db = rotationMockDb({
      public_key: publicKeyBase58,
      activeQr: { qr_id: OLD_QR, epoch: 1 },
    });

    const res = await handlePostRotateQr(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, qr_credential }),
      }),
      db,
      PROFILE
    );
    expect(res.status).toBe(422);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("INVALID_QR_EPOCH");
  });

  it("rejects rotation when card is suspended", async () => {
    const { handlePostRotateQr } = await import("../src/resolver/rotate-qr");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const { card, qr_credential } = await signedRotationPair(publicKeyBase58, privateKey);

    const db = rotationMockDb({
      public_key: publicKeyBase58,
      status: "suspended",
      activeQr: { qr_id: OLD_QR, epoch: 1 },
    });

    const res = await handlePostRotateQr(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, qr_credential }),
      }),
      db,
      PROFILE
    );
    expect(res.status).toBe(410);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("CARD_SUSPENDED");
  });

  it("rejects rotation when card is revoked", async () => {
    const { handlePostRotateQr } = await import("../src/resolver/rotate-qr");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const { card, qr_credential } = await signedRotationPair(publicKeyBase58, privateKey);

    const db = rotationMockDb({
      public_key: publicKeyBase58,
      status: "revoked",
      activeQr: { qr_id: OLD_QR, epoch: 1 },
    });

    const res = await handlePostRotateQr(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, qr_credential }),
      }),
      db,
      PROFILE
    );
    expect(res.status).toBe(410);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("CARD_REVOKED");
  });

  it("rejects rotation signed by an unrelated key", async () => {
    const { handlePostRotateQr } = await import("../src/resolver/rotate-qr");
    const owner = await getTestKeypair();
    const stranger = await randomKeypair();
    const { card, qr_credential } = await signedRotationPair(
      stranger.publicKeyBase58,
      stranger.privateKey
    );

    const db = rotationMockDb({
      public_key: owner.publicKeyBase58,
      activeQr: { qr_id: OLD_QR, epoch: 1 },
    });

    const res = await handlePostRotateQr(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, qr_credential }),
      }),
      db,
      PROFILE
    );
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("CARD_INVALID_SIGNATURE");
  });

  it("rejects recovery-signed rotation that replaces the stored public_key", async () => {
    const { handlePostRotateQr } = await import("../src/resolver/rotate-qr");
    const owner = await getTestKeypair();
    const recovery = await randomKeypair();
    // Recovery may sign, but card.public_key must remain the owner key.
    const { card, qr_credential } = await signedRotationPair(
      recovery.publicKeyBase58,
      recovery.privateKey
    );

    const db = rotationMockDb({
      public_key: owner.publicKeyBase58,
      recovery_public_key: recovery.publicKeyBase58,
      activeQr: { qr_id: OLD_QR, epoch: 1 },
    });

    const res = await handlePostRotateQr(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, qr_credential }),
      }),
      db,
      PROFILE
    );
    expect(res.status).toBe(422);
    const json = (await res.json()) as { error: string; message?: string };
    expect(json.error).toBe("MALFORMED_REQUEST");
    expect(json.message ?? "").toMatch(/public_key cannot change/i);
  });

  it("rejects QR credential profile mismatch", async () => {
    const { handlePostRotateQr } = await import("../src/resolver/rotate-qr");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const { card, qr_credential } = await signedRotationPair(publicKeyBase58, privateKey, {
      qrProfileId: OTHER_PROFILE,
      nonce: "nonce_testRotationProf",
    });

    const db = rotationMockDb({
      public_key: publicKeyBase58,
      activeQr: { qr_id: OLD_QR, epoch: 1 },
    });

    const res = await handlePostRotateQr(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, qr_credential }),
      }),
      db,
      PROFILE
    );
    expect(res.status).toBe(422);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("PROFILE_MISMATCH");
  });

  it("rejects rotation when the QR is already the active card QR", async () => {
    const { handlePostRotateQr } = await import("../src/resolver/rotate-qr");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const { card, qr_credential } = await signedRotationPair(publicKeyBase58, privateKey, {
      qrId: OLD_QR,
      epoch: 2,
      nonce: "nonce_testRotationSame",
    });

    const db = rotationMockDb({
      public_key: publicKeyBase58,
      activeQr: { qr_id: OLD_QR, epoch: 1 },
    });

    const res = await handlePostRotateQr(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, qr_credential }),
      }),
      db,
      PROFILE
    );
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("ALREADY_ACTIVE");
  });

  it("rejects rotated QR credentials that are not card-scoped", async () => {
    const { handlePostRotateQr } = await import("../src/resolver/rotate-qr");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const { card, qr_credential } = await signedRotationPair(publicKeyBase58, privateKey, {
      scope: "child_object",
      nonce: "nonce_testRotationScope",
    });

    const db = rotationMockDb({
      public_key: publicKeyBase58,
      activeQr: { qr_id: OLD_QR, epoch: 1 },
    });

    const res = await handlePostRotateQr(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, qr_credential }),
      }),
      db,
      PROFILE
    );
    expect(res.status).toBe(422);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("INVALID_QR_SCOPE");
  });
});

describe("scan after rotation (M4.3 / A.6)", () => {
  it("old QR scan shows qr_replaced while card stays active", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      OLD_QR,
      {
        card: {
          profile_id: PROFILE,
          public_key: "pk",
          handle: "river_example",
          handle_normalized: "river_example",
          manifesto_line: "Open studio",
          status: "active",
          card_document_json: "{}",
          created_at: CREATED,
          updated_at: "2026-05-18T10:00:00.000Z",
        },
        qr: {
          qr_id: OLD_QR,
          profile_id: PROFILE,
          epoch: 1,
          scope: "card",
          print_artifact_id: null,
          resolver_hint: "https://humanity.llc",
          status: "replaced",
          payload: `https://humanity.llc/c/${PROFILE}?q=${OLD_QR}`,
          issued_at: CREATED,
          expires_at: "2027-05-16T12:00:00.000Z",
          credential_document_json: "{}",
          created_at: CREATED,
          updated_at: "2026-05-18T10:00:00.000Z",
        },
        verification: null,
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("qr_replaced");
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("replaced by a newer");
    expect(html).toContain("@river_example");
  });
});
