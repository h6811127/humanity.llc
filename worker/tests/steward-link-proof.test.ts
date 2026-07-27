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
import { OPERATOR_ID } from "../src/http/resolver";
import { verifyStewardAccountLink } from "../src/steward/link-proof";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const ACCOUNT = "acc_TestHostedSteward1";
const DEVICE = "devTestdevice1111";

async function randomKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyBase58: encodeBase58(publicKey) };
}

function linkDb(options: {
  ownerPublicKey: string;
  status?: string;
  missingCard?: boolean;
}) {
  const nonces = new Set<string>();
  const status = options.status ?? "active";

  return {
    nonces,
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first() {
              if (sql.includes("FROM cards") && sql.includes("profile_id")) {
                if (options.missingCard) return null;
                return {
                  public_key: options.ownerPublicKey,
                  recovery_public_key: null,
                  issuer_public_key: null,
                  status,
                };
              }
              if (sql.includes("steward_link_nonces") && sql.includes("SELECT 1")) {
                return nonces.has(String(params[0])) ? { 1: 1 } : null;
              }
              return null;
            },
            async run() {
              if (sql.includes("INSERT INTO steward_link_nonces")) {
                nonces.add(String(params[0]));
              }
              return { success: true };
            },
          };
        },
      };
    },
  } as unknown as D1Database & { nonces: Set<string> };
}

async function buildLinkProof(opts: {
  privateKey: Uint8Array;
  publicKeyBase58: string;
  nonce: string;
  profileId?: string;
  accountId?: string;
  operatorId?: string;
  deviceId?: string;
  issuedAtMs?: number;
  expiresAtMs?: number;
}) {
  const now = Date.now();
  const issuedAtMs = opts.issuedAtMs ?? now;
  const expiresAtMs = opts.expiresAtMs ?? now + 5 * 60 * 1000;
  const unsigned = withProtocolFields(
    {
      profile_id: opts.profileId ?? PROFILE,
      account_id: opts.accountId ?? ACCOUNT,
      operator_id: opts.operatorId ?? OPERATOR_ID,
      device_id: opts.deviceId ?? DEVICE,
      issued_at: new Date(issuedAtMs).toISOString(),
      expires_at: new Date(expiresAtMs).toISOString(),
      nonce: opts.nonce,
    },
    PAYLOAD_TYPES.STEWARD_ACCOUNT_LINK
  );
  return signDocument(unsigned, {
    privateKey: opts.privateKey,
    publicKeyBase58: opts.publicKeyBase58,
  });
}

describe("verifyStewardAccountLink", () => {
  it("accepts a valid owner-signed link proof and consumes the nonce", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const db = linkDb({ ownerPublicKey: publicKeyBase58 });
    const linkProof = await buildLinkProof({
      privateKey,
      publicKeyBase58,
      nonce: "nonce_link_ok_001",
    });

    const result = await verifyStewardAccountLink(db, {
      profile_id: PROFILE,
      device_id: DEVICE,
      link_proof: linkProof,
    });

    expect(result).toEqual({
      ok: true,
      account_id: ACCOUNT,
      profile_id: PROFILE,
      device_id: DEVICE,
    });
    expect(db.nonces.has("nonce_link_ok_001")).toBe(true);
  });

  it("rejects invalid profile and device ids before signature checks", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const db = linkDb({ ownerPublicKey: publicKeyBase58 });
    const linkProof = await buildLinkProof({
      privateKey,
      publicKeyBase58,
      nonce: "nonce_invalid_ids",
    });

    const badProfile = await verifyStewardAccountLink(db, {
      profile_id: "not-a-profile",
      device_id: DEVICE,
      link_proof: linkProof,
    });
    expect(badProfile).toMatchObject({
      ok: false,
      code: CRYPTO_ERROR.INVALID_PROFILE_ID,
      status: 400,
    });

    const badDevice = await verifyStewardAccountLink(db, {
      profile_id: PROFILE,
      device_id: "short",
      link_proof: linkProof,
    });
    expect(badDevice).toMatchObject({
      ok: false,
      code: "INVALID_DEVICE_ID",
      status: 400,
    });
  });

  it("rejects path profile mismatch and inactive cards", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const activeDb = linkDb({ ownerPublicKey: publicKeyBase58 });
    const linkProof = await buildLinkProof({
      privateKey,
      publicKeyBase58,
      nonce: "nonce_path_mismatch",
    });

    const mismatch = await verifyStewardAccountLink(
      activeDb,
      {
        profile_id: PROFILE,
        device_id: DEVICE,
        link_proof: linkProof,
      },
      "7Xk9mP2nQ4rT6vW8yZ1aB3cD6"
    );
    expect(mismatch).toMatchObject({
      ok: false,
      code: "PROFILE_MISMATCH",
      status: 400,
    });

    const inactiveDb = linkDb({
      ownerPublicKey: publicKeyBase58,
      status: "revoked",
    });
    const inactiveProof = await buildLinkProof({
      privateKey,
      publicKeyBase58,
      nonce: "nonce_inactive_card",
    });
    const inactive = await verifyStewardAccountLink(inactiveDb, {
      profile_id: PROFILE,
      device_id: DEVICE,
      link_proof: inactiveProof,
    });
    expect(inactive).toMatchObject({
      ok: false,
      code: "CARD_NOT_ACTIVE",
      status: 403,
    });
  });

  it("rejects foreign signatures and operator/device mismatches", async () => {
    const owner = await getTestKeypair();
    const attacker = await randomKeypair();
    const db = linkDb({ ownerPublicKey: owner.publicKeyBase58 });

    const forged = await buildLinkProof({
      privateKey: attacker.privateKey,
      publicKeyBase58: attacker.publicKeyBase58,
      nonce: "nonce_forged_sig",
    });
    const badSig = await verifyStewardAccountLink(db, {
      profile_id: PROFILE,
      device_id: DEVICE,
      link_proof: forged,
    });
    expect(badSig).toMatchObject({
      ok: false,
      code: CRYPTO_ERROR.INVALID_SIGNATURE,
      status: 401,
    });

    const wrongOperator = await buildLinkProof({
      privateKey: owner.privateKey,
      publicKeyBase58: owner.publicKeyBase58,
      nonce: "nonce_wrong_operator",
      operatorId: "other.operator",
    });
    const operatorMismatch = await verifyStewardAccountLink(db, {
      profile_id: PROFILE,
      device_id: DEVICE,
      link_proof: wrongOperator,
    });
    expect(operatorMismatch).toMatchObject({
      ok: false,
      code: "OPERATOR_MISMATCH",
      status: 422,
    });

    const wrongDevice = await buildLinkProof({
      privateKey: owner.privateKey,
      publicKeyBase58: owner.publicKeyBase58,
      nonce: "nonce_wrong_device",
      deviceId: "devOtherdevice2222",
    });
    const deviceMismatch = await verifyStewardAccountLink(db, {
      profile_id: PROFILE,
      device_id: DEVICE,
      link_proof: wrongDevice,
    });
    expect(deviceMismatch).toMatchObject({
      ok: false,
      code: "DEVICE_MISMATCH",
      status: 422,
    });
  });

  it("rejects expired proofs, future issued_at, and overlong TTL", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const db = linkDb({ ownerPublicKey: publicKeyBase58 });
    const now = Date.now();

    const expired = await buildLinkProof({
      privateKey,
      publicKeyBase58,
      nonce: "nonce_expired",
      issuedAtMs: now - 10 * 60 * 1000,
      expiresAtMs: now - 60 * 1000,
    });
    const expiredResult = await verifyStewardAccountLink(db, {
      profile_id: PROFILE,
      device_id: DEVICE,
      link_proof: expired,
    });
    expect(expiredResult).toMatchObject({
      ok: false,
      code: "LINK_EXPIRED",
      status: 401,
    });

    const future = await buildLinkProof({
      privateKey,
      publicKeyBase58,
      nonce: "nonce_future",
      issuedAtMs: now + 5 * 60 * 1000,
      expiresAtMs: now + 10 * 60 * 1000,
    });
    const futureResult = await verifyStewardAccountLink(db, {
      profile_id: PROFILE,
      device_id: DEVICE,
      link_proof: future,
    });
    expect(futureResult).toMatchObject({
      ok: false,
      code: "LINK_NOT_YET_VALID",
      status: 422,
    });

    const longTtl = await buildLinkProof({
      privateKey,
      publicKeyBase58,
      nonce: "nonce_long_ttl",
      issuedAtMs: now,
      expiresAtMs: now + 20 * 60 * 1000,
    });
    const ttlResult = await verifyStewardAccountLink(db, {
      profile_id: PROFILE,
      device_id: DEVICE,
      link_proof: longTtl,
    });
    expect(ttlResult).toMatchObject({
      ok: false,
      code: "LINK_TTL_TOO_LONG",
      status: 422,
    });
  });

  it("rejects missing nonce and already-used nonce", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const db = linkDb({ ownerPublicKey: publicKeyBase58 });

    const missingNonce = await verifyStewardAccountLink(db, {
      profile_id: PROFILE,
      device_id: DEVICE,
      link_proof: {
        type: PAYLOAD_TYPES.STEWARD_ACCOUNT_LINK,
      },
    });
    expect(missingNonce).toMatchObject({
      ok: false,
      code: "MALFORMED_REQUEST",
      status: 422,
    });

    const proof = await buildLinkProof({
      privateKey,
      publicKeyBase58,
      nonce: "nonce_replay_once",
    });
    const first = await verifyStewardAccountLink(db, {
      profile_id: PROFILE,
      device_id: DEVICE,
      link_proof: proof,
    });
    expect(first.ok).toBe(true);

    const second = await verifyStewardAccountLink(db, {
      profile_id: PROFILE,
      device_id: DEVICE,
      link_proof: proof,
    });
    expect(second).toMatchObject({
      ok: false,
      code: CRYPTO_ERROR.REPLAYED_NONCE,
      status: 409,
    });
  });
});
