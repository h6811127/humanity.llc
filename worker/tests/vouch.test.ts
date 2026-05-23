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
import { handlePostVouch, handlePostVouchRevoke } from "../src/resolver/vouch";

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
  revoked?: boolean;
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
        revoked: opts.revoked ?? false,
      },
      PAYLOAD_TYPES.VOUCH
    ),
    { privateKey: opts.privateKey, publicKeyBase58: opts.publicKeyBase58 }
  );
}

class FakeVerificationDb {
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
            if (sql.includes("FROM vouches WHERE nonce")) {
              return (self.vouches.some(
                (v) => v.nonce === args[0] || v.revocation_nonce === args[0]
              )
                ? { 1: 1 }
                : null) as T | null;
            }
            if (sql.includes("FROM vouches WHERE vouch_id = ?")) {
              return (self.vouches.find((v) => v.vouch_id === args[0]) ?? null) as T | null;
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
                (v) =>
                  v.voucher_profile_id === voucherProfileId &&
                  v.status === "active" &&
                  v.created_at >= since
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
                revocation_document_json: null,
                revocation_nonce: null,
                issuer_public_key,
                created_at,
                revoked_at: null,
              });
            }
            if (sql.includes("UPDATE vouches")) {
              const [revoked_at, revocation_document_json, revocation_nonce, vouch_id] =
                args as string[];
              const existing = self.vouches.find(
                (v) => v.vouch_id === vouch_id && v.status === "active"
              );
              if (existing) {
                existing.status = "revoked";
                existing.revoked_at = revoked_at;
                existing.revocation_document_json = revocation_document_json;
                existing.revocation_nonce = revocation_nonce;
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
            return { success: true };
          },
        };
      },
    };
  }
}

async function post(db: FakeVerificationDb, vouch: Record<string, unknown>) {
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
  db: FakeVerificationDb,
  vouchId: string,
  revocation: Record<string, unknown>
) {
  return handlePostVouchRevoke(
    new Request(`https://humanity.llc/v1/verification/vouches/${vouchId}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revocation }),
    }),
    db as unknown as D1Database,
    vouchId
  );
}

describe("handlePostVouch", () => {
  it("requires the voucher to already be verified", async () => {
    const db = new FakeVerificationDb();
    const voucherKeys = await keypair();
    const voucheeKeys = await keypair();
    const voucherProfileId = "8Ym8nQ3pR5sU7wX9zA2bC4dE6";
    db.addCard(voucherProfileId, voucherKeys.publicKeyBase58);
    db.addCard(VOUCHEE, voucheeKeys.publicKeyBase58);

    const res = await post(
      db,
      await signedVouch({ voucherProfileId, ...voucherKeys })
    );
    expect(res.status).toBe(403);
    expect((await res.json()) as { error: string }).toMatchObject({
      error: "VOUCHER_NOT_VERIFIED",
    });
  });

  it("upgrades the recipient to Vouched Human after three active vouches", async () => {
    const db = new FakeVerificationDb();
    const voucheeKeys = await keypair();
    db.addCard(VOUCHEE, voucheeKeys.publicKeyBase58);

    for (let i = 0; i < 3; i++) {
      const keys = await keypair();
      const voucherProfileId = `8Ym8nQ3pR5sU7wX9zA2bC4d${i + 2}`;
      db.addCard(voucherProfileId, keys.publicKeyBase58);
      db.setSummary(voucherProfileId, {
        state: "verified_human",
        level: 2,
        label: "Vouched Human",
        method: "vouch",
        updated_at: "2026-01-01T00:00:00.000Z",
      });
      const res = await post(
        db,
        await signedVouch({
          voucherProfileId,
          vouchId: `vouch_upgrade_${i}`,
          nonce: `nonce_upgrade_${i}`,
          createdAt: `2026-05-1${i}T17:00:00.000Z`,
          ...keys,
        })
      );
      expect(res.status).toBe(201);
    }

    const summary = db.summaries.get(VOUCHEE);
    expect(summary).toMatchObject({
      state: "verified_human",
      label: "Vouched Human",
      method: "vouch",
      vouch_count: 3,
      latest_accepted_vouch_at: "2026-05-12T17:00:00.000Z",
    });
  });

  it("enforces the 90 day wait period", async () => {
    const db = new FakeVerificationDb();
    const voucherKeys = await keypair();
    const voucheeKeys = await keypair();
    const voucherProfileId = "8Ym8nQ3pR5sU7wX9zA2bC4dE6";
    db.addCard(voucherProfileId, voucherKeys.publicKeyBase58);
    db.addCard(VOUCHEE, voucheeKeys.publicKeyBase58);
    db.setSummary(voucherProfileId, {
      state: "verified_human",
      level: 2,
      label: "Vouched Human",
      method: "vouch",
      updated_at: "2026-05-01T00:00:00.000Z",
    });

    const res = await post(
      db,
      await signedVouch({
        voucherProfileId,
        createdAt: "2026-05-16T17:00:00.000Z",
        ...voucherKeys,
      })
    );
    expect(res.status).toBe(403);
    expect((await res.json()) as { error: string }).toMatchObject({
      error: "VOUCHER_TOO_NEW",
    });
  });

  it("revokes a voucher-signed vouch and removes it from the active count", async () => {
    const db = new FakeVerificationDb();
    const voucheeKeys = await keypair();
    db.addCard(VOUCHEE, voucheeKeys.publicKeyBase58);
    const voucherKeys: Awaited<ReturnType<typeof keypair>>[] = [];
    const voucherIds: string[] = [];

    for (let i = 0; i < 3; i++) {
      const keys = await keypair();
      const voucherProfileId = `8Ym8nQ3pR5sU7wX9zA2bC4d${i + 2}`;
      voucherKeys.push(keys);
      voucherIds.push(voucherProfileId);
      db.addCard(voucherProfileId, keys.publicKeyBase58);
      db.setSummary(voucherProfileId, {
        state: "verified_human",
        level: 2,
        label: "Vouched Human",
        method: "vouch",
        updated_at: "2026-01-01T00:00:00.000Z",
      });
      const res = await post(
        db,
        await signedVouch({
          voucherProfileId,
          vouchId: `vouch_revoke_${i}`,
          nonce: `nonce_revoke_create_${i}`,
          createdAt: `2026-05-1${i}T17:00:00.000Z`,
          ...keys,
        })
      );
      expect(res.status).toBe(201);
    }
    expect(db.summaries.get(VOUCHEE)?.state).toBe("verified_human");

    const res = await postRevoke(
      db,
      "vouch_revoke_2",
      await signedVouch({
        voucherProfileId: voucherIds[2]!,
        vouchId: "vouch_revoke_2",
        nonce: "nonce_revoke_signed_2",
        createdAt: "2026-05-20T17:00:00.000Z",
        revoked: true,
        ...voucherKeys[2]!,
      })
    );

    expect(res.status).toBe(200);
    expect(db.vouches.find((v) => v.vouch_id === "vouch_revoke_2")).toMatchObject({
      status: "revoked",
      revoked_at: "2026-05-20T17:00:00.000Z",
      revocation_nonce: "nonce_revoke_signed_2",
    });
    expect(db.summaries.get(VOUCHEE)).toMatchObject({
      state: "registered",
      label: "Registered",
      method: "registered",
      vouch_count: 2,
      latest_accepted_vouch_at: "2026-05-11T17:00:00.000Z",
    });
  });
});
