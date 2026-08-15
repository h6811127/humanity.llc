import { describe, expect, it } from "vitest";

import {
  getActiveChildObjectQr,
  insertChildObjectQr,
  listActiveChildObjectQrsForParent,
} from "../src/db/child-object-qr";

const PROFILE = "nSVXWPqgRFEhGPjxyRzidF6s";
const OTHER = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const OBJECT_A = "obj_statusPlateDoor";
const OBJECT_B = "obj_lostItemRelay";
const QR_A = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_B = "qr_nSVXWPqgRFEhGPjxyRzidF6s";
const QR_REVOKED = "qr_revokedChildObjectAa";
const ISSUED = "2026-08-15T10:00:00.000Z";

type QrRow = {
  qr_id: string;
  profile_id: string;
  scope: string;
  object_id: string | null;
  print_artifact_id: string | null;
  status: string;
  payload: string;
  issued_at: string;
  expires_at: string | null;
  credential_document_json: string;
};

class FakeChildObjectQrDb {
  qrs: QrRow[] = [];
  insertSuccess = true;

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (
              sql.includes("FROM qr_credentials") &&
              sql.includes("object_id = ?") &&
              sql.includes("profile_id = ?")
            ) {
              const profileId = String(args[0]);
              const objectId = String(args[1]);
              const match = self.qrs.find((row) => {
                if (row.profile_id !== profileId || row.object_id !== objectId) {
                  return false;
                }
                if (sql.includes("scope = 'child_object'") && row.scope !== "child_object") {
                  return false;
                }
                if (sql.includes("status = 'active'") && row.status !== "active") {
                  return false;
                }
                return true;
              });
              return (match
                ? { qr_id: match.qr_id, object_id: match.object_id }
                : null) as T | null;
            }
            return null;
          },
          async all<T>() {
            if (
              sql.includes("FROM qr_credentials") &&
              sql.includes("profile_id = ?") &&
              sql.includes("scope = 'child_object'")
            ) {
              const profileId = String(args[0]);
              const rows = self.qrs.filter((row) => {
                if (row.profile_id !== profileId) return false;
                if (row.scope !== "child_object") return false;
                if (sql.includes("status = 'active'") && row.status !== "active") {
                  return false;
                }
                if (sql.includes("object_id IS NOT NULL") && row.object_id == null) {
                  return false;
                }
                return true;
              });
              return {
                results: rows.map((row) => ({
                  qr_id: row.qr_id,
                  object_id: row.object_id,
                })) as T[],
              };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (sql.includes("INSERT INTO qr_credentials")) {
              if (!self.insertSuccess) {
                return { success: false, error: "UNIQUE constraint failed" };
              }
              self.qrs.push({
                qr_id: String(args[0]),
                profile_id: String(args[1]),
                scope: "child_object",
                print_artifact_id: null,
                object_id: String(args[3]),
                status: "active",
                payload: String(args[4]),
                issued_at: String(args[5]),
                expires_at: null,
                credential_document_json: String(args[6]),
              });
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function db(fake: FakeChildObjectQrDb): D1Database {
  return fake as unknown as D1Database;
}

function seed(fake: FakeChildObjectQrDb) {
  fake.qrs.push(
    {
      qr_id: QR_A,
      profile_id: PROFILE,
      scope: "child_object",
      object_id: OBJECT_A,
      print_artifact_id: null,
      status: "active",
      payload: "pay_a",
      issued_at: ISSUED,
      expires_at: null,
      credential_document_json: "{}",
    },
    {
      qr_id: QR_B,
      profile_id: PROFILE,
      scope: "child_object",
      object_id: OBJECT_B,
      print_artifact_id: null,
      status: "active",
      payload: "pay_b",
      issued_at: ISSUED,
      expires_at: null,
      credential_document_json: "{}",
    },
    {
      qr_id: QR_REVOKED,
      profile_id: PROFILE,
      scope: "child_object",
      object_id: OBJECT_A,
      print_artifact_id: null,
      status: "revoked",
      payload: "pay_revoked",
      issued_at: ISSUED,
      expires_at: null,
      credential_document_json: "{}",
    },
    {
      qr_id: "qr_otherStewardChildAa",
      profile_id: OTHER,
      scope: "child_object",
      object_id: OBJECT_A,
      print_artifact_id: null,
      status: "active",
      payload: "pay_other",
      issued_at: ISSUED,
      expires_at: null,
      credential_document_json: "{}",
    },
    {
      qr_id: "qr_cardScopeSameObject",
      profile_id: PROFILE,
      scope: "card",
      object_id: OBJECT_A,
      print_artifact_id: null,
      status: "active",
      payload: "pay_card",
      issued_at: ISSUED,
      expires_at: null,
      credential_document_json: "{}",
    }
  );
}

describe("child_object QR db helpers", () => {
  it("getActive returns only the caller's active child_object QR for that object", async () => {
    const fake = new FakeChildObjectQrDb();
    seed(fake);

    await expect(getActiveChildObjectQr(db(fake), PROFILE, OBJECT_A)).resolves.toEqual({
      qr_id: QR_A,
      object_id: OBJECT_A,
    });
    await expect(getActiveChildObjectQr(db(fake), PROFILE, OBJECT_B)).resolves.toEqual({
      qr_id: QR_B,
      object_id: OBJECT_B,
    });
    await expect(getActiveChildObjectQr(db(fake), OTHER, OBJECT_A)).resolves.toEqual({
      qr_id: "qr_otherStewardChildAa",
      object_id: OBJECT_A,
    });
    await expect(getActiveChildObjectQr(db(fake), PROFILE, "obj_missingPlate")).resolves.toBeNull();
  });

  it("listActive for a parent omits revoked, other stewards, and non-child scopes", async () => {
    const fake = new FakeChildObjectQrDb();
    seed(fake);
    fake.qrs.push({
      qr_id: "qr_childMissingObjectId",
      profile_id: PROFILE,
      scope: "child_object",
      object_id: null,
      print_artifact_id: null,
      status: "active",
      payload: "pay_null",
      issued_at: ISSUED,
      expires_at: null,
      credential_document_json: "{}",
    });

    await expect(listActiveChildObjectQrsForParent(db(fake), PROFILE)).resolves.toEqual([
      { qr_id: QR_A, object_id: OBJECT_A },
      { qr_id: QR_B, object_id: OBJECT_B },
    ]);
    await expect(listActiveChildObjectQrsForParent(db(fake), OTHER)).resolves.toEqual([
      { qr_id: "qr_otherStewardChildAa", object_id: OBJECT_A },
    ]);
  });

  it("insert writes an active child_object row that getActive can read back", async () => {
    const fake = new FakeChildObjectQrDb();
    await insertChildObjectQr(db(fake), {
      qrId: "qr_freshChildObjectMint",
      profileId: PROFILE,
      epoch: 1,
      objectId: OBJECT_A,
      payload: "pay_fresh",
      issuedAt: ISSUED,
      credentialDocumentJson: '{"scope":"child_object"}',
    });

    expect(fake.qrs[0]).toMatchObject({
      qr_id: "qr_freshChildObjectMint",
      profile_id: PROFILE,
      scope: "child_object",
      object_id: OBJECT_A,
      print_artifact_id: null,
      status: "active",
      expires_at: null,
    });
    await expect(getActiveChildObjectQr(db(fake), PROFILE, OBJECT_A)).resolves.toEqual({
      qr_id: "qr_freshChildObjectMint",
      object_id: OBJECT_A,
    });
  });

  it("insert throws when D1 rejects the child_object QR row", async () => {
    const fake = new FakeChildObjectQrDb();
    fake.insertSuccess = false;
    await expect(
      insertChildObjectQr(db(fake), {
        qrId: QR_A,
        profileId: PROFILE,
        epoch: 1,
        objectId: OBJECT_A,
        payload: "pay_fail",
        issuedAt: ISSUED,
        credentialDocumentJson: "{}",
      })
    ).rejects.toThrow("UNIQUE constraint failed");
  });
});
