import { describe, expect, it } from "vitest";

import { applyQrExtend, getActiveQrCredential } from "../src/db/qr-extend";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5eF";

function mockDb(opts: {
  activeRow?: Record<string, unknown> | null;
  updateChanges?: number;
  updateSuccess?: boolean;
}) {
  const binds: unknown[][] = [];
  return {
    binds,
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          binds.push(args);
          return {
            async first<T>() {
              if (sql.includes("SELECT qr_id, profile_id, epoch")) {
                return (opts.activeRow ?? null) as T | null;
              }
              return null as T | null;
            },
            async run() {
              if (sql.includes("UPDATE qr_credentials SET expires_at")) {
                return {
                  success: opts.updateSuccess ?? true,
                  meta: { changes: opts.updateChanges ?? 1 },
                };
              }
              return { success: true, meta: { changes: 0 } };
            },
          };
        },
      };
    },
  } as unknown as D1Database & { binds: unknown[][] };
}

describe("qr-extend db helpers", () => {
  it("loads only active card-scoped credentials", async () => {
    const row = {
      qr_id: QR,
      profile_id: PROFILE,
      epoch: 2,
      scope: "card",
      payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
      issued_at: "2026-05-16T17:00:00.000Z",
      expires_at: "2026-06-16T17:00:00.000Z",
      status: "active",
    };
    const db = mockDb({ activeRow: row });
    await expect(getActiveQrCredential(db, PROFILE, QR)).resolves.toEqual(row);
    expect(db.binds[0]).toEqual([PROFILE, QR]);
  });

  it("returns null when no active credential exists", async () => {
    const db = mockDb({ activeRow: null });
    await expect(getActiveQrCredential(db, PROFILE, QR)).resolves.toBeNull();
  });

  it("throws when extend update matches no active row", async () => {
    const db = mockDb({ updateChanges: 0 });
    await expect(
      applyQrExtend(
        db,
        PROFILE,
        QR,
        "2027-06-16T17:00:00.000Z",
        '{"status":"active"}',
        "2026-06-01T00:00:00.000Z"
      )
    ).rejects.toThrow(/Active QR credential not found or not updated/);
  });

  it("throws when D1 reports unsuccessful extend update", async () => {
    const db = mockDb({ updateSuccess: false, updateChanges: 1 });
    await expect(
      applyQrExtend(
        db,
        PROFILE,
        QR,
        "2027-06-16T17:00:00.000Z",
        '{"status":"active"}',
        "2026-06-01T00:00:00.000Z"
      )
    ).rejects.toThrow(/Active QR credential not found or not updated/);
  });

  it("binds extend fields in SQL order", async () => {
    const db = mockDb({ updateChanges: 1 });
    const expiresAt = "2027-06-16T17:00:00.000Z";
    const doc = '{"epoch":2}';
    const updatedAt = "2026-06-01T00:00:00.000Z";
    await applyQrExtend(db, PROFILE, QR, expiresAt, doc, updatedAt);
    expect(db.binds.at(-1)).toEqual([
      expiresAt,
      doc,
      updatedAt,
      PROFILE,
      QR,
    ]);
  });
});
