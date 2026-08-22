import { describe, expect, it } from "vitest";

import {
  insertVouchReport,
  type InsertVouchReportParams,
  type VouchReportRow,
} from "../src/db/vouch-reports";

const NOW = "2026-08-22T10:00:00.000Z";
const PROFILE_A = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const PROFILE_B = "8Ym0nQ3oR5sU7wX9zA2bC4dE6";
const CASE_A = "case_reportisoA123456789012345";
const CASE_B = "case_reportisoB123456789012345";
const VOUCH_A = "vouch_reportisoA123456789";

class VouchReportStore {
  rows = new Map<string, VouchReportRow>();
  nextInsertSuccess = true;
  hideAfterInsert = false;

  prepare(sql: string) {
    const store = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM vouch_reports WHERE report_id")) {
              return (store.rows.get(String(args[0])) ?? null) as T | null;
            }
            return null as T | null;
          },
          async run() {
            if (sql.includes("INSERT INTO vouch_reports")) {
              if (!store.nextInsertSuccess) {
                return { success: false, error: "D1 insert vouch report failed", meta: { changes: 0 } };
              }
              const [
                report_id,
                reference_code,
                kind,
                target_raw,
                target_profile_id,
                target_vouch_id,
                target_scan_url,
                statement,
                contact_method,
                case_id,
                created_at,
              ] = args as [
                string,
                string | null,
                VouchReportRow["kind"],
                string,
                string | null,
                string | null,
                string | null,
                string,
                string | null,
                string,
                string,
              ];
              if (store.rows.has(report_id)) {
                return { success: false, error: "UNIQUE constraint failed", meta: { changes: 0 } };
              }
              const row: VouchReportRow = {
                report_id,
                reference_code,
                kind,
                target_raw,
                target_profile_id,
                target_vouch_id,
                target_scan_url,
                statement,
                contact_method,
                case_id,
                created_at,
              };
              if (!store.hideAfterInsert) store.rows.set(report_id, row);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function reportParams(
  overrides: Partial<InsertVouchReportParams> = {}
): InsertVouchReportParams {
  return {
    reportId: "report_isoA123456789012345678901",
    referenceCode: "vrr_isoA12",
    kind: "false_vouch",
    targetRaw: PROFILE_A,
    targetProfileId: PROFILE_A,
    targetVouchId: VOUCH_A,
    targetScanUrl: `https://humanity.llc/c/${PROFILE_A}`,
    statement: "This vouch looks fabricated.",
    contactMethod: "reporter@example.com",
    caseId: CASE_A,
    now: NOW,
    ...overrides,
  };
}

describe("insertVouchReport", () => {
  it("persists kind and target columns for later operator review", async () => {
    const db = new VouchReportStore();
    const row = await insertVouchReport(db as unknown as D1Database, reportParams());
    expect(row).toEqual({
      report_id: "report_isoA123456789012345678901",
      reference_code: "vrr_isoA12",
      kind: "false_vouch",
      target_raw: PROFILE_A,
      target_profile_id: PROFILE_A,
      target_vouch_id: VOUCH_A,
      target_scan_url: `https://humanity.llc/c/${PROFILE_A}`,
      statement: "This vouch looks fabricated.",
      contact_method: "reporter@example.com",
      case_id: CASE_A,
      created_at: NOW,
    });
  });

  it("keeps optional target and contact fields null when omitted", async () => {
    const db = new VouchReportStore();
    const row = await insertVouchReport(
      db as unknown as D1Database,
      reportParams({
        referenceCode: null,
        targetProfileId: null,
        targetVouchId: null,
        targetScanUrl: null,
        contactMethod: null,
        kind: "harassment",
        targetRaw: "anonymous-target",
      })
    );
    expect(row.kind).toBe("harassment");
    expect(row.reference_code).toBeNull();
    expect(row.target_profile_id).toBeNull();
    expect(row.target_vouch_id).toBeNull();
    expect(row.target_scan_url).toBeNull();
    expect(row.contact_method).toBeNull();
  });

  it("isolates reports by report_id and case", async () => {
    const db = new VouchReportStore();
    const first = await insertVouchReport(db as unknown as D1Database, reportParams());
    const second = await insertVouchReport(
      db as unknown as D1Database,
      reportParams({
        reportId: "report_isoB123456789012345678901",
        referenceCode: "vrr_isoB12",
        kind: "impersonation",
        targetRaw: PROFILE_B,
        targetProfileId: PROFILE_B,
        targetVouchId: null,
        targetScanUrl: null,
        caseId: CASE_B,
        statement: "Different subject.",
      })
    );

    expect(db.rows.size).toBe(2);
    expect(db.rows.get(first.report_id)?.kind).toBe("false_vouch");
    expect(db.rows.get(second.report_id)?.kind).toBe("impersonation");
    expect(db.rows.get(first.report_id)?.case_id).toBe(CASE_A);
    expect(db.rows.get(second.report_id)?.case_id).toBe(CASE_B);
  });

  it("throws when D1 rejects a duplicate report_id", async () => {
    const db = new VouchReportStore();
    await insertVouchReport(db as unknown as D1Database, reportParams());
    await expect(
      insertVouchReport(db as unknown as D1Database, reportParams())
    ).rejects.toThrow(/UNIQUE constraint failed|D1 insert vouch report failed/);
  });

  it("throws when D1 insert reports unsuccessful", async () => {
    const db = new VouchReportStore();
    db.nextInsertSuccess = false;
    await expect(
      insertVouchReport(db as unknown as D1Database, reportParams())
    ).rejects.toThrow(/D1 insert vouch report failed/);
  });

  it("throws when insert succeeds but the row cannot be read back", async () => {
    const db = new VouchReportStore();
    db.hideAfterInsert = true;
    await expect(
      insertVouchReport(db as unknown as D1Database, reportParams())
    ).rejects.toThrow(/could not read it back/);
  });
});
