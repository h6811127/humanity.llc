import { describe, expect, it } from "vitest";

import {
  applyRevocation,
  getCardOwner,
  getQrCredential,
  getRevocationDisplay,
  revocationNonceUsed,
} from "../src/db/revoke";

const PROFILE = "nSVXWPqgRFEhGPjxyRzidF6s";
const OTHER = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_A = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_B = "qr_nSVXWPqgRFEhGPjxyRzidF6s";

type CardOwner = {
  profile_id: string;
  public_key: string;
  recovery_public_key: string | null;
  issuer_public_key: string | null;
  status: string;
};

type QrRow = {
  qr_id: string;
  profile_id: string;
  status: string;
  scope: string;
  object_id: string | null;
  print_artifact_id: string | null;
};

type RevocationRow = {
  revocation_id: string;
  profile_id: string;
  target_kind: string;
  target_qr_id: string | null;
  display_mode: string | null;
  public_reason: string | null;
  revoked_at: string;
};

class FakeRevokeDb {
  cards = new Map<string, CardOwner>();
  qrs: QrRow[] = [];
  revocations: RevocationRow[] = [];

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM cards WHERE profile_id")) {
              const row = self.cards.get(String(args[0]));
              if (!row) return null;
              return {
                public_key: row.public_key,
                recovery_public_key: row.recovery_public_key,
                issuer_public_key: row.issuer_public_key,
                status: row.status,
              } as T;
            }
            if (sql.includes("FROM revocations WHERE revocation_id")) {
              return (self.revocations.some((row) => row.revocation_id === args[0])
                ? { 1: 1 }
                : null) as T | null;
            }
            if (sql.includes("FROM qr_credentials WHERE qr_id")) {
              return (self.qrs.find((row) => row.qr_id === args[0]) ?? null) as T | null;
            }
            if (sql.includes("target_kind = 'qr_credential'")) {
              const matches = self.revocations
                .filter(
                  (row) =>
                    row.profile_id === args[0] &&
                    row.target_kind === "qr_credential" &&
                    row.target_qr_id === args[1]
                )
                .sort((a, b) => b.revoked_at.localeCompare(a.revoked_at));
              const latest = matches[0];
              return (latest
                ? { display_mode: latest.display_mode, public_reason: latest.public_reason }
                : null) as T | null;
            }
            if (sql.includes("target_kind = 'card'")) {
              const matches = self.revocations
                .filter(
                  (row) =>
                    row.profile_id === args[0] &&
                    row.target_kind === "card" &&
                    row.target_qr_id == null
                )
                .sort((a, b) => b.revoked_at.localeCompare(a.revoked_at));
              const latest = matches[0];
              return (latest
                ? { display_mode: latest.display_mode, public_reason: latest.public_reason }
                : null) as T | null;
            }
            return null;
          },
          async run() {
            if (sql.includes("INSERT INTO revocations")) {
              self.revocations.push({
                revocation_id: String(args[0]),
                profile_id: String(args[1]),
                target_kind: String(args[2]),
                target_qr_id: (args[3] as string | null) ?? null,
                revoked_at: String(args[6]),
                display_mode: (args[9] as string | null) ?? null,
                public_reason: (args[10] as string | null) ?? null,
              });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("UPDATE cards SET status = 'revoked'")) {
              const card = self.cards.get(String(args[1]));
              if (card) card.status = "revoked";
              return { success: true, meta: { changes: card ? 1 : 0 } };
            }
            if (sql.includes("UPDATE qr_credentials") && sql.includes("WHERE profile_id = ? AND status = 'active'")) {
              const profileId = String(args[1]);
              let changes = 0;
              for (const qr of self.qrs) {
                if (qr.profile_id === profileId && qr.status === "active") {
                  qr.status = "revoked";
                  changes += 1;
                }
              }
              return { success: true, meta: { changes } };
            }
            if (sql.includes("UPDATE qr_credentials") && sql.includes("WHERE qr_id = ? AND profile_id = ?")) {
              const qr = self.qrs.find(
                (row) => row.qr_id === args[1] && row.profile_id === args[2]
              );
              if (qr) qr.status = "revoked";
              return { success: true, meta: { changes: qr ? 1 : 0 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }

  async batch(stmts: { run: () => Promise<{ success: boolean; error?: string }> }[]) {
    const results = [];
    for (const stmt of stmts) {
      results.push(await stmt.run());
    }
    return results;
  }
}

function db(fake: FakeRevokeDb): D1Database {
  return fake as unknown as D1Database;
}

function seed(fake: FakeRevokeDb) {
  fake.cards.set(PROFILE, {
    profile_id: PROFILE,
    public_key: "pk_owner",
    recovery_public_key: "pk_recovery",
    issuer_public_key: null,
    status: "active",
  });
  fake.cards.set(OTHER, {
    profile_id: OTHER,
    public_key: "pk_other",
    recovery_public_key: null,
    issuer_public_key: null,
    status: "active",
  });
  fake.qrs.push(
    {
      qr_id: QR_A,
      profile_id: PROFILE,
      status: "active",
      scope: "card",
      object_id: null,
      print_artifact_id: null,
    },
    {
      qr_id: QR_B,
      profile_id: PROFILE,
      status: "active",
      scope: "child_object",
      object_id: "obj_door_1",
      print_artifact_id: null,
    },
    {
      qr_id: "qr_otherProfileOnly",
      profile_id: OTHER,
      status: "active",
      scope: "card",
      object_id: null,
      print_artifact_id: null,
    }
  );
}

describe("revoke db scope helpers", () => {
  it("treats a revocation id as a spent nonce", async () => {
    const fake = new FakeRevokeDb();
    fake.revocations.push({
      revocation_id: "rev_used",
      profile_id: PROFILE,
      target_kind: "card",
      target_qr_id: null,
      display_mode: "tombstone",
      public_reason: "owner_revoked",
      revoked_at: "2026-08-01T00:00:00.000Z",
    });
    expect(await revocationNonceUsed(db(fake), "rev_used")).toBe(true);
    expect(await revocationNonceUsed(db(fake), "rev_fresh")).toBe(false);
  });

  it("card revoke marks the card and every active QR for that profile only", async () => {
    const fake = new FakeRevokeDb();
    seed(fake);

    await applyRevocation(db(fake), {
      profileId: PROFILE,
      targetKind: "card",
      targetQrId: null,
      reason: "lost keys",
      revokedAt: "2026-08-14T10:00:00.000Z",
      revocationId: "rev_card",
      signedDocumentJson: "{}",
      issuerPublicKey: "pk_owner",
      displayMode: "tombstone",
      publicReason: "owner_revoked",
    });

    expect(fake.cards.get(PROFILE)?.status).toBe("revoked");
    expect(fake.cards.get(OTHER)?.status).toBe("active");
    expect(fake.qrs.filter((row) => row.profile_id === PROFILE).every((row) => row.status === "revoked")).toBe(
      true
    );
    expect(fake.qrs.find((row) => row.profile_id === OTHER)?.status).toBe("active");
    expect(await getRevocationDisplay(db(fake), PROFILE, "card", null)).toEqual({
      display_mode: "tombstone",
      public_reason: "owner_revoked",
    });
  });

  it("QR revoke leaves the card and sibling credentials active", async () => {
    const fake = new FakeRevokeDb();
    seed(fake);

    await applyRevocation(db(fake), {
      profileId: PROFILE,
      targetKind: "qr_credential",
      targetQrId: QR_A,
      reason: "rotated",
      revokedAt: "2026-08-14T10:00:00.000Z",
      revocationId: "rev_qr",
      signedDocumentJson: "{}",
      issuerPublicKey: "pk_owner",
      displayMode: "minimal",
      publicReason: "rotated",
    });

    expect(fake.cards.get(PROFILE)?.status).toBe("active");
    expect(await getQrCredential(db(fake), QR_A)).toMatchObject({ status: "revoked" });
    expect(await getQrCredential(db(fake), QR_B)).toMatchObject({ status: "active" });
    expect(await getRevocationDisplay(db(fake), PROFILE, "qr_credential", QR_A)).toEqual({
      display_mode: "minimal",
      public_reason: "rotated",
    });
    expect(await getRevocationDisplay(db(fake), PROFILE, "qr_credential", QR_B)).toBeNull();
    expect(await getCardOwner(db(fake), PROFILE)).toMatchObject({
      public_key: "pk_owner",
      recovery_public_key: "pk_recovery",
      status: "active",
    });
  });
});
