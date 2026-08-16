import { describe, expect, it } from "vitest";

import { loadQrCredentialById } from "../src/db/qr-metadata";
import type { QrCredentialRow } from "../src/db/types";

const QR_A = "qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6";
const QR_B = "qr_9Zm2pR4qS6tV8xY1aB3cD5eF7";
const PROFILE_A = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const PROFILE_B = "8Ym2nQ4pR6sT8vW1yZ3aB5cD7";
const NOW = "2026-08-16T10:00:00.000Z";

class FakeQrMetadataDb {
  rows = new Map<string, QrCredentialRow>();

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM qr_credentials WHERE qr_id = ?")) {
              return (self.rows.get(String(args[0])) ?? null) as T | null;
            }
            return null;
          },
        };
      },
    };
  }
}

function db(fake: FakeQrMetadataDb): D1Database {
  return fake as unknown as D1Database;
}

function credential(qrId: string, overrides: Partial<QrCredentialRow> = {}): QrCredentialRow {
  const isA = qrId === QR_A;
  return {
    qr_id: qrId,
    profile_id: isA ? PROFILE_A : PROFILE_B,
    epoch: 1,
    scope: isA ? "print_artifact" : "child_object",
    print_artifact_id: isA ? "pa_testPreMintAuto919" : null,
    object_id: isA ? null : "obj_doorPlate919",
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${isA ? PROFILE_A : PROFILE_B}?q=${qrId}`,
    issued_at: NOW,
    expires_at: null,
    credential_document_json: JSON.stringify({ qr_id: qrId }),
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

describe("qr metadata db helper", () => {
  it("loads the full credential row by qr_id and isolates neighbors", async () => {
    const fake = new FakeQrMetadataDb();
    fake.rows.set(QR_A, credential(QR_A));
    fake.rows.set(QR_B, credential(QR_B, { status: "revoked" }));

    const a = await loadQrCredentialById(db(fake), QR_A);
    const b = await loadQrCredentialById(db(fake), QR_B);

    expect(a?.profile_id).toBe(PROFILE_A);
    expect(a?.scope).toBe("print_artifact");
    expect(a?.credential_document_json).toBe(JSON.stringify({ qr_id: QR_A }));
    expect(b?.profile_id).toBe(PROFILE_B);
    expect(b?.status).toBe("revoked");
    expect(b?.object_id).toBe("obj_doorPlate919");
    expect(await loadQrCredentialById(db(fake), "qr_missingCredential")).toBeNull();
  });
});
