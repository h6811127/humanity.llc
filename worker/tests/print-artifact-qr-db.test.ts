import { describe, expect, it } from "vitest";

import {
  getActivePrintArtifactQr,
  insertPrintArtifactQr,
} from "../src/db/print-artifact-qr";

const PROFILE = "nSVXWPqgRFEhGPjxyRzidF6s";
const OTHER = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const PA_A = "pa_testPreMintAuto919";
const PA_B = "pa_testPreMintAuto818";
const QR_A = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_B = "qr_nSVXWPqgRFEhGPjxyRzidF6s";
const ISSUED = "2026-08-15T10:00:00.000Z";

type QrRow = {
  qr_id: string;
  profile_id: string;
  scope: string;
  print_artifact_id: string | null;
  object_id: string | null;
  status: string;
};

class FakePrintArtifactQrDb {
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
              sql.includes("print_artifact_id = ?") &&
              sql.includes("profile_id = ?")
            ) {
              const profileId = String(args[0]);
              const printArtifactId = String(args[1]);
              const match = self.qrs.find((row) => {
                if (
                  row.profile_id !== profileId ||
                  row.print_artifact_id !== printArtifactId
                ) {
                  return false;
                }
                if (
                  sql.includes("scope = 'print_artifact'") &&
                  row.scope !== "print_artifact"
                ) {
                  return false;
                }
                if (sql.includes("status = 'active'") && row.status !== "active") {
                  return false;
                }
                return true;
              });
              return (match
                ? { qr_id: match.qr_id, print_artifact_id: match.print_artifact_id }
                : null) as T | null;
            }
            return null;
          },
          async run() {
            if (sql.includes("INSERT INTO qr_credentials")) {
              if (!self.insertSuccess) {
                return { success: false, error: "UNIQUE constraint failed" };
              }
              self.qrs.push({
                qr_id: String(args[0]),
                profile_id: String(args[1]),
                scope: "print_artifact",
                print_artifact_id: String(args[3]),
                object_id: null,
                status: "active",
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

function db(fake: FakePrintArtifactQrDb): D1Database {
  return fake as unknown as D1Database;
}

function seed(fake: FakePrintArtifactQrDb) {
  fake.qrs.push(
    {
      qr_id: QR_A,
      profile_id: PROFILE,
      scope: "print_artifact",
      print_artifact_id: PA_A,
      object_id: null,
      status: "active",
    },
    {
      qr_id: QR_B,
      profile_id: PROFILE,
      scope: "print_artifact",
      print_artifact_id: PA_B,
      object_id: null,
      status: "active",
    },
    {
      qr_id: "qr_revokedPrintArtifact",
      profile_id: PROFILE,
      scope: "print_artifact",
      print_artifact_id: PA_A,
      object_id: null,
      status: "revoked",
    },
    {
      qr_id: "qr_otherStewardPrintAa",
      profile_id: OTHER,
      scope: "print_artifact",
      print_artifact_id: PA_A,
      object_id: null,
      status: "active",
    },
    {
      qr_id: "qr_childObjectSamePaId",
      profile_id: PROFILE,
      scope: "child_object",
      print_artifact_id: PA_A,
      object_id: "obj_statusPlateDoor",
      status: "active",
    }
  );
}

describe("print_artifact QR db helpers", () => {
  it("getActive returns only the caller's active print_artifact QR for that artifact", async () => {
    const fake = new FakePrintArtifactQrDb();
    seed(fake);

    await expect(getActivePrintArtifactQr(db(fake), PROFILE, PA_A)).resolves.toEqual({
      qr_id: QR_A,
      print_artifact_id: PA_A,
    });
    await expect(getActivePrintArtifactQr(db(fake), PROFILE, PA_B)).resolves.toEqual({
      qr_id: QR_B,
      print_artifact_id: PA_B,
    });
    await expect(getActivePrintArtifactQr(db(fake), OTHER, PA_A)).resolves.toEqual({
      qr_id: "qr_otherStewardPrintAa",
      print_artifact_id: PA_A,
    });
    await expect(getActivePrintArtifactQr(db(fake), PROFILE, "pa_missingArtifact")).resolves.toBeNull();
  });

  it("insert writes an active print_artifact row that getActive can read back", async () => {
    const fake = new FakePrintArtifactQrDb();
    await insertPrintArtifactQr(db(fake), {
      qrId: "qr_freshPrintArtifactMint",
      profileId: PROFILE,
      epoch: 1,
      printArtifactId: PA_A,
      payload: "pay_fresh",
      issuedAt: ISSUED,
      credentialDocumentJson: '{"scope":"print_artifact"}',
    });

    expect(fake.qrs[0]).toMatchObject({
      qr_id: "qr_freshPrintArtifactMint",
      profile_id: PROFILE,
      scope: "print_artifact",
      print_artifact_id: PA_A,
      status: "active",
    });
    await expect(getActivePrintArtifactQr(db(fake), PROFILE, PA_A)).resolves.toEqual({
      qr_id: "qr_freshPrintArtifactMint",
      print_artifact_id: PA_A,
    });
  });

  it("insert throws when D1 rejects the print_artifact QR row", async () => {
    const fake = new FakePrintArtifactQrDb();
    fake.insertSuccess = false;
    await expect(
      insertPrintArtifactQr(db(fake), {
        qrId: QR_A,
        profileId: PROFILE,
        epoch: 1,
        printArtifactId: PA_A,
        payload: "pay_fail",
        issuedAt: ISSUED,
        credentialDocumentJson: "{}",
      })
    ).rejects.toThrow("UNIQUE constraint failed");
  });
});
