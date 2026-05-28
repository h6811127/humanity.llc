import * as ed from "@noble/ed25519";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  encodeBase58,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import type { CardStatus, VerificationSummaryRow, VouchRow } from "../src/db/types";
import { handleGetVouch, handlePostVouchRevoke } from "../src/resolver/vouch-revoke";
import { handlePostVouch } from "../src/resolver/vouch";

const VOUCHEE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

async function keypair() {
  const privateKey = randomBytes(32);
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyBase58: encodeBase58(publicKey) };
}

async function signedVouch(opts: {
  voucherProfileId: string;
  voucheeProfileId?: string;
  privateKey: Uint8Array;
  publicKeyBase58: string;
  vouchId?: string;
  nonce?: string;
  createdAt?: string;
}) {
  return signDocument(
    withProtocolFields(
      {
        vouch_id: opts.vouchId ?? `vouch_${opts.voucherProfileId.slice(0, 8)}`,
        voucher_profile_id: opts.voucherProfileId,
        vouchee_profile_id: opts.voucheeProfileId ?? VOUCHEE,
        nonce: opts.nonce ?? `nonce_${opts.voucherProfileId.slice(0, 8)}`,
        statement: "I attest this is a distinct human I know.",
        method: "in_person",
        created_at: opts.createdAt ?? "2026-05-16T17:00:00.000Z",
        revoked: false,
      },
      PAYLOAD_TYPES.VOUCH
    ),
    { privateKey: opts.privateKey, publicKeyBase58: opts.publicKeyBase58 }
  );
}

async function signedVouchRevocation(opts: {
  vouchId: string;
  voucherProfileId: string;
  voucheeProfileId?: string;
  privateKey: Uint8Array;
  publicKeyBase58: string;
  nonce?: string;
  revokedAt?: string;
}) {
  return signDocument(
    withProtocolFields(
      {
        vouch_id: opts.vouchId,
        voucher_profile_id: opts.voucherProfileId,
        vouchee_profile_id: opts.voucheeProfileId ?? VOUCHEE,
        nonce: opts.nonce ?? `nonce_revoke_${opts.vouchId.slice(-6)}`,
        revoked_at: opts.revokedAt ?? "2026-06-01T12:00:00.000Z",
        reason: "voucher_revoked",
      },
      PAYLOAD_TYPES.VOUCH_REVOCATION
    ),
    { privateKey: opts.privateKey, publicKeyBase58: opts.publicKeyBase58 }
  );
}

class FakeVouchDb {
  cards = new Map<string, { profile_id: string; public_key: string; status: CardStatus }>();
  summaries = new Map<string, VerificationSummaryRow>();
  vouches: VouchRow[] = [];

  addCard(profileId: string, publicKey: string, status: CardStatus = "active") {
    this.cards.set(profileId, { profile_id: profileId, public_key: publicKey, status });
    if (!this.summaries.has(profileId)) {
      this.summaries.set(profileId, {
        profile_id: profileId,
        state: "registered",
        level: 1,
        label: "Registered",
        method: "registered",
        vouch_count: 0,
        latest_accepted_vouch_at: null,
        credential_ids_json: "[]",
        summary_document_json: null,
        updated_at: "2026-01-01T00:00:00.000Z",
      });
    }
  }

  setSummary(profileId: string, patch: Partial<VerificationSummaryRow>) {
    const existing = this.summaries.get(profileId);
    if (!existing) throw new Error(`Missing summary for ${profileId}`);
    this.summaries.set(profileId, { ...existing, ...patch });
  }

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM cards")) {
              return (self.cards.get(args[0] as string) ?? null) as T | null;
            }
            if (sql.includes("FROM verification_summaries")) {
              return (self.summaries.get(args[0] as string) ?? null) as T | null;
            }
            if (sql.includes("FROM vouches WHERE vouch_id")) {
              return (self.vouches.find((v) => v.vouch_id === args[0]) ?? null) as T | null;
            }
            if (sql.includes("FROM vouches WHERE nonce = ?") && !sql.includes("revoke_nonce")) {
              return (self.vouches.some((v) => v.nonce === args[0]) ? { 1: 1 } : null) as T | null;
            }
            if (sql.includes("revoke_nonce = ?")) {
              return (self.vouches.some((v) => v.revoke_nonce === args[0])
                ? { 1: 1 }
                : null) as T | null;
            }
            if (sql.includes("voucher_profile_id = ?") && sql.includes("vouchee_profile_id = ?")) {
              return (self.vouches.some(
                (v) =>
                  v.voucher_profile_id === args[0] &&
                  v.vouchee_profile_id === args[1] &&
                  v.status === "active"
              )
                ? { 1: 1 }
                : null) as T | null;
            }
            if (sql.includes("COUNT(*) AS n FROM vouches")) {
              const [voucherProfileId, since] = args as [string, string];
              const n = self.vouches.filter(
                (v) => v.voucher_profile_id === voucherProfileId && v.created_at >= since
              ).length;
              return { n } as T;
            }
            return null;
          },
          async all<T>() {
            if (sql.includes("FROM vouches") && sql.includes("vouchee_profile_id = ?")) {
              const rows = self.vouches
                .filter((v) => v.vouchee_profile_id === args[0] && v.status === "active")
                .sort((a, b) =>
                  b.created_at.localeCompare(a.created_at) || b.vouch_id.localeCompare(a.vouch_id)
                )
                .map((v) => ({ vouch_id: v.vouch_id, created_at: v.created_at }));
              return { results: rows as T[] };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (sql.includes("INSERT INTO vouches")) {
              const [
                vouch_id,
                voucher_profile_id,
                vouchee_profile_id,
                nonce,
                statement,
                method,
                signed_document_json,
                issuer_public_key,
                created_at,
              ] = args as string[];
              self.vouches.push({
                vouch_id,
                voucher_profile_id,
                vouchee_profile_id,
                nonce,
                statement,
                method: method as "in_person",
                status: "active",
                signed_document_json,
                issuer_public_key,
                created_at,
                revoked_at: null,
                revoke_nonce: null,
                revoke_signed_document_json: null,
              });
            }
            if (sql.includes("UPDATE vouches") && sql.includes("status = 'revoked'")) {
              const [revoked_at, revoke_nonce, revoke_signed_document_json, vouch_id] =
                args as string[];
              const row = self.vouches.find((v) => v.vouch_id === vouch_id && v.status === "active");
              if (row) {
                row.status = "revoked";
                row.revoked_at = revoked_at;
                row.revoke_nonce = revoke_nonce;
                row.revoke_signed_document_json = revoke_signed_document_json;
              }
            }
            if (sql.includes("UPDATE verification_summaries")) {
              const [
                state,
                level,
                label,
                method,
                vouch_count,
                latest_accepted_vouch_at,
                credential_ids_json,
                updated_at,
                profile_id,
              ] = args as [
                VerificationSummaryRow["state"],
                number,
                string,
                VerificationSummaryRow["method"],
                number,
                string | null,
                string,
                string,
                string,
              ];
              const existing = self.summaries.get(profile_id);
              if (!existing) throw new Error("summary missing");
              self.summaries.set(profile_id, {
                ...existing,
                state,
                level,
                label,
                method,
                vouch_count,
                latest_accepted_vouch_at,
                credential_ids_json,
                updated_at,
              });
            }
            return { success: true, meta: { changes: 1 } };
          },
        };
      },
    };
  }
}

async function postVouch(db: FakeVouchDb, vouch: Record<string, unknown>) {
  return handlePostVouch(
    new Request("https://humanity.llc/v1/verification/vouches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vouch }),
    }),
    db as unknown as D1Database
  );
}

async function postRevoke(
  db: FakeVouchDb,
  vouchId: string,
  revocation: Record<string, unknown>
) {
  return handlePostVouchRevoke(
    new Request(`https://humanity.llc/v1/verification/vouches/${vouchId}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vouch_revocation: revocation }),
    }),
    db as unknown as D1Database,
    vouchId
  );
}

async function verifiedVoucher(
  db: FakeVouchDb,
  id: string,
  keys: Awaited<ReturnType<typeof keypair>>
) {
  db.addCard(id, keys.publicKeyBase58);
  db.setSummary(id, {
    state: "verified_human",
    level: 2,
    label: "Vouched Human",
    method: "vouch",
    updated_at: "2026-01-01T00:00:00.000Z",
  });
}

describe("handlePostVouchRevoke", () => {
  it("revokes a vouch and downgrades vouchee summary", async () => {
    const db = new FakeVouchDb();
    const voucheeKeys = await keypair();
    db.addCard(VOUCHEE, voucheeKeys.publicKeyBase58);

    const voucherIds: string[] = [];
    const voucherKeysList: Awaited<ReturnType<typeof keypair>>[] = [];
    for (let i = 0; i < 3; i++) {
      const keys = await keypair();
      const id = `8Ym8nQ3pR5sU7wX9zA2bC4d${i + 2}`;
      voucherIds.push(id);
      voucherKeysList.push(keys);
      await verifiedVoucher(db, id, keys);
      await postVouch(
        db,
        await signedVouch({
          voucherProfileId: id,
          vouchId: `vouch_upgrade_${i}`,
          nonce: `nonce_upgrade_${i}`,
          createdAt: `2026-05-1${i}T17:00:00.000Z`,
          ...keys,
        })
      );
    }

    expect(db.summaries.get(VOUCHEE)?.state).toBe("verified_human");

    const revokeDoc = await signedVouchRevocation({
      vouchId: "vouch_upgrade_2",
      voucherProfileId: voucherIds[2]!,
      ...voucherKeysList[2]!,
    });
    const res = await postRevoke(db, "vouch_upgrade_2", revokeDoc);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      verification: { state: string; vouch_count: number };
    };
    expect(body.status).toBe("revoked");
    expect(body.verification.vouch_count).toBe(2);
    expect(body.verification.state).toBe("registered");
    expect(db.summaries.get(VOUCHEE)?.vouch_count).toBe(2);
  });

  it("rejects revoke from a non-voucher signer", async () => {
    const db = new FakeVouchDb();
    const voucherKeys = await keypair();
    const imposterKeys = await keypair();
    const voucheeKeys = await keypair();
    const voucherId = "8Ym8nQ3pR5sU7wX9zA2bC4dE6";
    db.addCard(voucherId, voucherKeys.publicKeyBase58);
    db.addCard(VOUCHEE, voucheeKeys.publicKeyBase58);
    await verifiedVoucher(db, voucherId, voucherKeys);

    const vouch = await signedVouch({
      voucherProfileId: voucherId,
      vouchId: "vouch_to_revoke",
      nonce: "nonce_to_revoke",
      ...voucherKeys,
    });
    await postVouch(db, vouch);

    const badRevoke = await signedVouchRevocation({
      vouchId: "vouch_to_revoke",
      voucherProfileId: voucherId,
      ...imposterKeys,
    });
    const res = await postRevoke(db, "vouch_to_revoke", badRevoke);
    expect(res.status).toBe(401);
  });

  it("counts revoked issuances toward yearly quota (M6 policy)", async () => {
    const db = new FakeVouchDb();
    const keys = await keypair();
    const voucherId = "8Ym8nQ3pR5sU7wX9zA2bC4dE6";
    await verifiedVoucher(db, voucherId, keys);

    const voucheeIds = [
      "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      "7Xk9mP2nQ4rT6vW8yZ1aB3cD6",
      "7Xk9mP2nQ4rT6vW8yZ1aB3cD7",
      "7Xk9mP2nQ4rT6vW8yZ1aB3cD8",
      "7Xk9mP2nQ4rT6vW8yZ1aB3cD9",
    ];
    for (let i = 0; i < 5; i++) {
      const voucheeId = voucheeIds[i]!;
      const voucheeKeys = await keypair();
      db.addCard(voucheeId, voucheeKeys.publicKeyBase58);
      const res = await postVouch(
        db,
        await signedVouch({
          voucherProfileId: voucherId,
          vouchId: `vouch_q_${i}`,
          nonce: `nonce_q_${i}`,
          voucheeProfileId: voucheeId,
          createdAt: `2026-05-0${i + 1}T17:00:00.000Z`,
          ...keys,
        })
      );
      expect(res.status).toBe(201);
    }

    const revokeDoc = await signedVouchRevocation({
      vouchId: "vouch_q_4",
      voucherProfileId: voucherId,
      voucheeProfileId: voucheeIds[4]!,
      nonce: "nonce_revoke_q4",
      ...keys,
    });
    const revokeRes = await postRevoke(db, "vouch_q_4", revokeDoc);
    expect(revokeRes.status).toBe(200);

    const sixthVoucheeId = "7Xk9mP2nQ4rT6vW8yZ1aB3cE1";
    const sixthKeys = await keypair();
    db.addCard(sixthVoucheeId, sixthKeys.publicKeyBase58);
    const sixth = await postVouch(
      db,
      await signedVouch({
        voucherProfileId: voucherId,
        vouchId: "vouch_q_6",
        nonce: "nonce_q_6",
        voucheeProfileId: sixthVoucheeId,
        ...keys,
      })
    );
    expect(sixth.status).toBe(403);
    expect((await sixth.json()) as { error: string }).toMatchObject({
      error: "VOUCH_QUOTA_EXCEEDED",
    });
  });

  it("allows re-vouch after revoke with a new credential", async () => {
    const db = new FakeVouchDb();
    const voucheeKeys = await keypair();
    db.addCard(VOUCHEE, voucheeKeys.publicKeyBase58);
    const keys = await keypair();
    const voucherId = "8Ym8nQ3pR5sU7wX9zA2bC4dE6";
    await verifiedVoucher(db, voucherId, keys);

    await postVouch(
      db,
      await signedVouch({
        voucherProfileId: voucherId,
        vouchId: "vouch_pair_a",
        nonce: "nonce_pair_a",
        ...keys,
      })
    );

    const revokeDoc = await signedVouchRevocation({
      vouchId: "vouch_pair_a",
      voucherProfileId: voucherId,
      ...keys,
    });
    expect((await postRevoke(db, "vouch_pair_a", revokeDoc)).status).toBe(200);

    const reVouch = await postVouch(
      db,
      await signedVouch({
        voucherProfileId: voucherId,
        vouchId: "vouch_pair_b",
        nonce: "nonce_pair_b",
        ...keys,
      })
    );
    expect(reVouch.status).toBe(201);
  });
});

describe("handleGetVouch", () => {
  it("returns public vouch metadata", async () => {
    const db = new FakeVouchDb();
    const keys = await keypair();
    const voucheeKeys = await keypair();
    db.addCard("8Ym8nQ3pR5sU7wX9zA2bC4dE6", keys.publicKeyBase58);
    db.addCard(VOUCHEE, voucheeKeys.publicKeyBase58);
    await verifiedVoucher(db, "8Ym8nQ3pR5sU7wX9zA2bC4dE6", keys);
    await postVouch(
      db,
      await signedVouch({
        voucherProfileId: "8Ym8nQ3pR5sU7wX9zA2bC4dE6",
        vouchId: "vouch_public_get",
        ...keys,
      })
    );

    const res = await handleGetVouch(db as unknown as D1Database, "vouch_public_get");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; statement: string };
    expect(body.status).toBe("active");
    expect(body.statement).toContain("distinct human");
  });
});
