import { describe, expect, it } from "vitest";

import type { VouchRow } from "../src/db/types";
import {
  activeVouchPairExists,
  getVouchById,
  getVouchCardOwner,
  insertVouch,
  vouchNonceUsed,
  vouchRevocationNonceUsed,
} from "../src/db/verification";

const VOUCHER = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const VOUCHEE = "nSVXWPqgRFEhGPjxyRzidF6s";

function vouchRow(overrides: Partial<VouchRow> = {}): VouchRow {
  return {
    vouch_id: "vouch_pair_01",
    voucher_profile_id: VOUCHER,
    vouchee_profile_id: VOUCHEE,
    nonce: "nonce_used_once",
    statement: "I attest this is a distinct human I know.",
    method: "in_person",
    status: "active",
    signed_document_json: "{}",
    issuer_public_key: "pk_voucher",
    created_at: "2026-08-01T12:00:00.000Z",
    revoked_at: null,
    revoke_nonce: null,
    revoke_signed_document_json: null,
    ...overrides,
  };
}

class FakeVouchLookupDb {
  cards = new Map<string, { profile_id: string; public_key: string; status: string }>();
  vouches: VouchRow[] = [];
  insertShouldFail = false;

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM cards WHERE profile_id")) {
              return (self.cards.get(String(args[0])) ?? null) as T | null;
            }
            if (sql.includes("FROM vouches WHERE nonce = ?") && !sql.includes("revoke_nonce")) {
              return (self.vouches.some((row) => row.nonce === args[0]) ? { 1: 1 } : null) as T | null;
            }
            if (sql.includes("revoke_nonce = ?")) {
              return (self.vouches.some((row) => row.revoke_nonce === args[0])
                ? { 1: 1 }
                : null) as T | null;
            }
            if (
              sql.includes("voucher_profile_id = ?") &&
              sql.includes("vouchee_profile_id = ?") &&
              sql.includes("status = 'active'")
            ) {
              return (self.vouches.some(
                (row) =>
                  row.voucher_profile_id === args[0] &&
                  row.vouchee_profile_id === args[1] &&
                  row.status === "active"
              )
                ? { 1: 1 }
                : null) as T | null;
            }
            if (sql.includes("FROM vouches WHERE vouch_id = ?")) {
              return (self.vouches.find((row) => row.vouch_id === args[0]) ?? null) as T | null;
            }
            return null;
          },
          async run() {
            if (sql.includes("INSERT INTO vouches")) {
              if (self.insertShouldFail) {
                return { success: false, error: "unique nonce", meta: { changes: 0 } };
              }
              self.vouches.push(
                vouchRow({
                  vouch_id: String(args[0]),
                  voucher_profile_id: String(args[1]),
                  vouchee_profile_id: String(args[2]),
                  nonce: String(args[3]),
                  statement: String(args[4]),
                  method: args[5] as VouchRow["method"],
                  signed_document_json: String(args[6]),
                  issuer_public_key: String(args[7]),
                  created_at: String(args[8]),
                })
              );
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function db(fake: FakeVouchLookupDb): D1Database {
  return fake as unknown as D1Database;
}

describe("verification vouch lookup helpers", () => {
  it("treats a used vouch nonce as spent even after revoke", async () => {
    const fake = new FakeVouchLookupDb();
    fake.vouches.push(
      vouchRow({
        status: "revoked",
        revoked_at: "2026-08-02T00:00:00.000Z",
        revoke_nonce: "revoke_nonce_1",
      })
    );

    expect(await vouchNonceUsed(db(fake), "nonce_used_once")).toBe(true);
    expect(await vouchNonceUsed(db(fake), "nonce_fresh")).toBe(false);
    expect(await vouchRevocationNonceUsed(db(fake), "revoke_nonce_1")).toBe(true);
    expect(await vouchRevocationNonceUsed(db(fake), "revoke_unused")).toBe(false);
  });

  it("counts only the active directed pair, not the reverse or a revoked pair", async () => {
    const fake = new FakeVouchLookupDb();
    fake.vouches.push(vouchRow({ status: "revoked", nonce: "old" }));

    expect(await activeVouchPairExists(db(fake), VOUCHER, VOUCHEE)).toBe(false);

    fake.vouches.push(vouchRow({ vouch_id: "vouch_active", nonce: "new" }));
    expect(await activeVouchPairExists(db(fake), VOUCHER, VOUCHEE)).toBe(true);
    expect(await activeVouchPairExists(db(fake), VOUCHEE, VOUCHER)).toBe(false);
  });

  it("inserts an active vouch and reads it back by id", async () => {
    const fake = new FakeVouchLookupDb();
    fake.cards.set(VOUCHER, {
      profile_id: VOUCHER,
      public_key: "pk_voucher",
      status: "active",
    });

    await insertVouch(db(fake), {
      vouchId: "vouch_inserted",
      voucherProfileId: VOUCHER,
      voucheeProfileId: VOUCHEE,
      nonce: "nonce_insert",
      statement: "known in person",
      method: "in_person",
      signedDocumentJson: '{"ok":true}',
      issuerPublicKey: "pk_voucher",
      createdAt: "2026-08-14T10:00:00.000Z",
    });

    const row = await getVouchById(db(fake), "vouch_inserted");
    expect(row).toMatchObject({
      vouch_id: "vouch_inserted",
      voucher_profile_id: VOUCHER,
      vouchee_profile_id: VOUCHEE,
      nonce: "nonce_insert",
      status: "active",
      revoked_at: null,
    });
    expect(await vouchNonceUsed(db(fake), "nonce_insert")).toBe(true);
    expect(await activeVouchPairExists(db(fake), VOUCHER, VOUCHEE)).toBe(true);
    expect(await getVouchCardOwner(db(fake), VOUCHER)).toEqual({
      profile_id: VOUCHER,
      public_key: "pk_voucher",
      status: "active",
    });
    expect(await getVouchCardOwner(db(fake), "missingProfileId123")).toBeNull();
  });

  it("throws when D1 rejects the vouch insert", async () => {
    const fake = new FakeVouchLookupDb();
    fake.insertShouldFail = true;

    await expect(
      insertVouch(db(fake), {
        vouchId: "vouch_fail",
        voucherProfileId: VOUCHER,
        voucheeProfileId: VOUCHEE,
        nonce: "nonce_fail",
        statement: "x",
        method: "in_person",
        signedDocumentJson: "{}",
        issuerPublicKey: "pk",
        createdAt: "2026-08-14T10:00:00.000Z",
      })
    ).rejects.toThrow("unique nonce");
  });
});
