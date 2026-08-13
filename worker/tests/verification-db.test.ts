import { describe, expect, it } from "vitest";

import type { VerificationSummaryRow, VouchRow } from "../src/db/types";
import {
  STEWARD_VOUCHER_ISSUANCE_CAP_PER_YEAR,
  VOUCH_THRESHOLD,
  VOUCHER_ACTIVE_QUOTA_PER_YEAR,
  VOUCHER_WAIT_DAYS,
  recalculateVouchSummary,
  revokeVouch,
  voucherIssuanceCountSince,
} from "../src/db/verification";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const UPDATED = "2026-06-01T12:00:00.000Z";

function summary(
  patch: Partial<VerificationSummaryRow> = {}
): VerificationSummaryRow {
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
    updated_at: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

function vouch(patch: Partial<VouchRow> & Pick<VouchRow, "vouch_id">): VouchRow {
  return {
    voucher_profile_id: "8Ym8nQ3pR5sU7wX9zA2bC4dE6",
    vouchee_profile_id: PROFILE,
    nonce: `nonce_${patch.vouch_id}`,
    statement: "I attest this is a distinct human I know.",
    method: "in_person",
    status: "active",
    signed_document_json: "{}",
    issuer_public_key: "issuer",
    created_at: "2026-05-16T17:00:00.000Z",
    revoked_at: null,
    revoke_nonce: null,
    revoke_signed_document_json: null,
    ...patch,
  };
}

class FakeVerificationDb {
  summaries = new Map<string, VerificationSummaryRow>();
  vouches: VouchRow[] = [];

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM verification_summaries")) {
              return (self.summaries.get(args[0] as string) ?? null) as T | null;
            }
            if (sql.includes("COUNT(*) AS n FROM vouches")) {
              const [voucherProfileId, since] = args as [string, string];
              const n = self.vouches.filter((row) => {
                if (row.voucher_profile_id !== voucherProfileId) return false;
                if (row.created_at < since) return false;
                if (sql.includes("status = 'active'") && row.status !== "active") {
                  return false;
                }
                return true;
              }).length;
              return { n } as T;
            }
            if (sql.includes("FROM vouches WHERE vouch_id")) {
              return (self.vouches.find((row) => row.vouch_id === args[0]) ??
                null) as T | null;
            }
            return null;
          },
          async all<T>() {
            if (sql.includes("FROM vouches") && sql.includes("vouchee_profile_id")) {
              const rows = self.vouches
                .filter(
                  (row) =>
                    row.vouchee_profile_id === args[0] && row.status === "active"
                )
                .sort(
                  (a, b) =>
                    b.created_at.localeCompare(a.created_at) ||
                    b.vouch_id.localeCompare(a.vouch_id)
                )
                .map((row) => ({
                  vouch_id: row.vouch_id,
                  created_at: row.created_at,
                }));
              return { results: rows as T[] };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (sql.includes("UPDATE vouches") && sql.includes("status = 'revoked'")) {
              const [revokedAt, revokeNonce, revokeSigned, vouchId] = args as string[];
              const row = self.vouches.find(
                (v) => v.vouch_id === vouchId && v.status === "active"
              );
              if (!row) {
                return { success: true, meta: { changes: 0 } };
              }
              row.status = "revoked";
              row.revoked_at = revokedAt;
              row.revoke_nonce = revokeNonce;
              row.revoke_signed_document_json = revokeSigned;
              return { success: true, meta: { changes: 1 } };
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

describe("verification policy constants", () => {
  it("keeps the vouched-human threshold and yearly issuance quotas", () => {
    expect(VOUCH_THRESHOLD).toBe(3);
    expect(VOUCHER_ACTIVE_QUOTA_PER_YEAR).toBe(5);
    expect(STEWARD_VOUCHER_ISSUANCE_CAP_PER_YEAR).toBe(3);
    expect(VOUCHER_WAIT_DAYS).toBe(90);
  });
});

describe("recalculateVouchSummary", () => {
  it("stays registered below the active vouch threshold", async () => {
    const db = new FakeVerificationDb();
    db.summaries.set(PROFILE, summary());
    db.vouches.push(
      vouch({ vouch_id: "vouch_one", created_at: "2026-05-10T00:00:00.000Z" }),
      vouch({ vouch_id: "vouch_two", created_at: "2026-05-11T00:00:00.000Z" })
    );

    const next = await recalculateVouchSummary(db as unknown as D1Database, PROFILE, UPDATED);
    expect(next).toMatchObject({
      state: "registered",
      level: 1,
      label: "Registered",
      method: "registered",
      vouch_count: 2,
      latest_accepted_vouch_at: "2026-05-11T00:00:00.000Z",
    });
    expect(JSON.parse(next.credential_ids_json)).toEqual(["vouch_two", "vouch_one"]);
  });

  it("upgrades to Vouched Human at three active vouches", async () => {
    const db = new FakeVerificationDb();
    db.summaries.set(PROFILE, summary());
    db.vouches.push(
      vouch({ vouch_id: "vouch_a", created_at: "2026-05-10T00:00:00.000Z" }),
      vouch({ vouch_id: "vouch_b", created_at: "2026-05-11T00:00:00.000Z" }),
      vouch({ vouch_id: "vouch_c", created_at: "2026-05-12T00:00:00.000Z" })
    );

    const next = await recalculateVouchSummary(db as unknown as D1Database, PROFILE, UPDATED);
    expect(next).toMatchObject({
      state: "verified_human",
      level: 2,
      label: "Vouched Human",
      method: "vouch",
      vouch_count: 3,
      latest_accepted_vouch_at: "2026-05-12T00:00:00.000Z",
    });
  });

  it("ignores revoked vouches when counting toward the threshold", async () => {
    const db = new FakeVerificationDb();
    db.summaries.set(PROFILE, summary());
    db.vouches.push(
      vouch({ vouch_id: "vouch_a", created_at: "2026-05-10T00:00:00.000Z" }),
      vouch({ vouch_id: "vouch_b", created_at: "2026-05-11T00:00:00.000Z" }),
      vouch({
        vouch_id: "vouch_revoked",
        created_at: "2026-05-12T00:00:00.000Z",
        status: "revoked",
        revoked_at: "2026-05-20T00:00:00.000Z",
      })
    );

    const next = await recalculateVouchSummary(db as unknown as D1Database, PROFILE, UPDATED);
    expect(next.state).toBe("registered");
    expect(next.vouch_count).toBe(2);
    expect(JSON.parse(next.credential_ids_json)).not.toContain("vouch_revoked");
  });

  it("does not demote a steward when active vouches drop", async () => {
    const db = new FakeVerificationDb();
    db.summaries.set(
      PROFILE,
      summary({
        state: "steward",
        level: 2,
        label: "",
        method: "steward",
      })
    );

    const next = await recalculateVouchSummary(db as unknown as D1Database, PROFILE, UPDATED);
    expect(next).toMatchObject({
      state: "steward",
      level: 3,
      label: "Steward",
      method: "steward",
      vouch_count: 0,
    });
  });

  it("preserves steward level above the floor", async () => {
    const db = new FakeVerificationDb();
    db.summaries.set(
      PROFILE,
      summary({
        state: "steward",
        level: 5,
        label: "Founding steward",
        method: "steward",
      })
    );
    db.vouches.push(vouch({ vouch_id: "vouch_keep" }));

    const next = await recalculateVouchSummary(db as unknown as D1Database, PROFILE, UPDATED);
    expect(next.level).toBe(5);
    expect(next.label).toBe("Founding steward");
    expect(next.state).toBe("steward");
  });
});

describe("revokeVouch", () => {
  it("revokes only an active row", async () => {
    const db = new FakeVerificationDb();
    db.vouches.push(vouch({ vouch_id: "vouch_live" }));

    const row = await revokeVouch(db as unknown as D1Database, {
      vouchId: "vouch_live",
      revokedAt: UPDATED,
      revokeNonce: "nonce_revoke_live",
      revokeSignedDocumentJson: '{"revoked":true}',
    });

    expect(row?.status).toBe("revoked");
    expect(row?.revoke_nonce).toBe("nonce_revoke_live");
  });

  it("returns null when the vouch is already revoked", async () => {
    const db = new FakeVerificationDb();
    db.vouches.push(
      vouch({
        vouch_id: "vouch_gone",
        status: "revoked",
        revoked_at: "2026-05-20T00:00:00.000Z",
      })
    );

    const row = await revokeVouch(db as unknown as D1Database, {
      vouchId: "vouch_gone",
      revokedAt: UPDATED,
      revokeNonce: "nonce_revoke_again",
      revokeSignedDocumentJson: "{}",
    });
    expect(row).toBeNull();
  });
});

describe("voucherIssuanceCountSince", () => {
  it("counts revoked issuances so quota cannot reset", async () => {
    const db = new FakeVerificationDb();
    const voucher = "8Ym8nQ3pR5sU7wX9zA2bC4dE6";
    db.vouches.push(
      vouch({
        vouch_id: "vouch_active",
        voucher_profile_id: voucher,
        created_at: "2026-04-01T00:00:00.000Z",
      }),
      vouch({
        vouch_id: "vouch_revoked",
        voucher_profile_id: voucher,
        created_at: "2026-04-02T00:00:00.000Z",
        status: "revoked",
      }),
      vouch({
        vouch_id: "vouch_old",
        voucher_profile_id: voucher,
        created_at: "2025-01-01T00:00:00.000Z",
      })
    );

    const n = await voucherIssuanceCountSince(
      db as unknown as D1Database,
      voucher,
      "2026-01-01T00:00:00.000Z"
    );
    expect(n).toBe(2);
  });
});
