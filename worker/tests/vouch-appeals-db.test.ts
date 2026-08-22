import { describe, expect, it } from "vitest";

import {
  insertVouchAppeal,
  type InsertVouchAppealParams,
  type VouchAppealRow,
} from "../src/db/vouch-appeals";

const NOW = "2026-08-22T10:00:00.000Z";
const PROFILE_A = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const PROFILE_B = "8Ym0nQ3oR5sU7wX9zA2bC4dE6";
const CASE_A = "case_appealisoA123456789012345";
const CASE_B = "case_appealisoB123456789012345";

class VouchAppealStore {
  rows = new Map<string, VouchAppealRow>();
  nextInsertSuccess = true;
  hideAfterInsert = false;

  prepare(sql: string) {
    const store = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM vouch_appeals WHERE appeal_id")) {
              return (store.rows.get(String(args[0])) ?? null) as T | null;
            }
            return null as T | null;
          },
          async run() {
            if (sql.includes("INSERT INTO vouch_appeals")) {
              if (!store.nextInsertSuccess) {
                return { success: false, error: "D1 insert vouch appeal failed", meta: { changes: 0 } };
              }
              const [
                appeal_id,
                reference_code,
                case_id,
                profile_id,
                statement,
                contact_method,
                created_at,
              ] = args as [
                string,
                string | null,
                string,
                string,
                string,
                string | null,
                string,
              ];
              if (store.rows.has(appeal_id)) {
                return { success: false, error: "UNIQUE constraint failed", meta: { changes: 0 } };
              }
              const row: VouchAppealRow = {
                appeal_id,
                reference_code,
                case_id,
                profile_id,
                statement,
                contact_method,
                created_at,
              };
              if (!store.hideAfterInsert) store.rows.set(appeal_id, row);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function appealParams(
  overrides: Partial<InsertVouchAppealParams> = {}
): InsertVouchAppealParams {
  return {
    appealId: "appeal_isoA1234567890123456789012",
    referenceCode: "vra_isoA12",
    caseId: CASE_A,
    profileId: PROFILE_A,
    statement: "I did not do this.",
    contactMethod: "steward@example.com",
    now: NOW,
    ...overrides,
  };
}

describe("insertVouchAppeal", () => {
  it("persists and reads back the bound appeal row", async () => {
    const db = new VouchAppealStore();
    const row = await insertVouchAppeal(db as unknown as D1Database, appealParams());
    expect(row).toEqual({
      appeal_id: "appeal_isoA1234567890123456789012",
      reference_code: "vra_isoA12",
      case_id: CASE_A,
      profile_id: PROFILE_A,
      statement: "I did not do this.",
      contact_method: "steward@example.com",
      created_at: NOW,
    });
  });

  it("keeps optional contact fields null when omitted", async () => {
    const db = new VouchAppealStore();
    const row = await insertVouchAppeal(
      db as unknown as D1Database,
      appealParams({ referenceCode: null, contactMethod: null })
    );
    expect(row.reference_code).toBeNull();
    expect(row.contact_method).toBeNull();
  });

  it("isolates appeals by appeal_id, case, and profile", async () => {
    const db = new VouchAppealStore();
    const first = await insertVouchAppeal(db as unknown as D1Database, appealParams());
    const second = await insertVouchAppeal(
      db as unknown as D1Database,
      appealParams({
        appealId: "appeal_isoB1234567890123456789012",
        referenceCode: "vra_isoB12",
        caseId: CASE_B,
        profileId: PROFILE_B,
        statement: "Different case.",
      })
    );

    expect(first.profile_id).toBe(PROFILE_A);
    expect(second.profile_id).toBe(PROFILE_B);
    expect(db.rows.size).toBe(2);
    expect(db.rows.get(first.appeal_id)?.case_id).toBe(CASE_A);
    expect(db.rows.get(second.appeal_id)?.case_id).toBe(CASE_B);
  });

  it("throws when D1 rejects a duplicate appeal_id", async () => {
    const db = new VouchAppealStore();
    await insertVouchAppeal(db as unknown as D1Database, appealParams());
    await expect(
      insertVouchAppeal(db as unknown as D1Database, appealParams())
    ).rejects.toThrow(/UNIQUE constraint failed|D1 insert vouch appeal failed/);
  });

  it("throws when D1 insert reports unsuccessful", async () => {
    const db = new VouchAppealStore();
    db.nextInsertSuccess = false;
    await expect(
      insertVouchAppeal(db as unknown as D1Database, appealParams())
    ).rejects.toThrow(/D1 insert vouch appeal failed/);
  });

  it("throws when insert succeeds but the row cannot be read back", async () => {
    const db = new VouchAppealStore();
    db.hideAfterInsert = true;
    await expect(
      insertVouchAppeal(db as unknown as D1Database, appealParams())
    ).rejects.toThrow(/could not read it back/);
  });
});
