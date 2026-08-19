import { describe, expect, it } from "vitest";

import {
  createVouchCase,
  getLatestSuspensionForProfile,
  getOpenVouchCaseBySource,
  getVouchCaseById,
  listVouchCases,
  suspendProfileForVouchCase,
  updateVouchCaseStatus,
  type VouchCaseRow,
  type VouchCaseSuspensionRow,
} from "../src/db/vouch-cases";

const NOW = "2026-08-19T10:00:00.000Z";
const PROFILE_A = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const PROFILE_B = "8Ym0nQ3oR5sU7wX9zA2bC4dE6";

class VouchCaseStore {
  cases = new Map<string, VouchCaseRow>();
  cards = new Map<string, { profile_id: string; status: string; updated_at: string }>();
  suspensions: VouchCaseSuspensionRow[] = [];

  addCard(profileId: string, status = "active"): void {
    this.cards.set(profileId, {
      profile_id: profileId,
      status,
      updated_at: NOW,
    });
  }

  prepare(sql: string) {
    const store = this;
    return {
      bind(...args: unknown[]) {
        return {
          async all<T>() {
            if (!sql.includes("FROM vouch_cases")) {
              return { results: [] as T[] };
            }
            const limit = Number(args[args.length - 1] ?? 100);
            let rows = [...store.cases.values()];
            if (sql.includes("WHERE status = ? AND source = ?")) {
              rows = rows.filter(
                (row) => row.status === args[0] && row.source === args[1]
              );
            } else if (sql.includes("WHERE status = ?")) {
              rows = rows.filter((row) => row.status === args[0]);
            } else if (sql.includes("WHERE source = ?")) {
              rows = rows.filter((row) => row.source === args[0]);
            }
            rows.sort(
              (a, b) =>
                b.updated_at.localeCompare(a.updated_at) ||
                b.case_id.localeCompare(a.case_id)
            );
            return { results: rows.slice(0, limit) as T[] };
          },
          async first<T>() {
            if (sql.includes("FROM vouch_cases") && sql.includes("case_id = ?")) {
              return (store.cases.get(String(args[0])) ?? null) as T | null;
            }
            if (
              sql.includes("FROM vouch_cases") &&
              sql.includes("source = ?") &&
              sql.includes("source_key = ?")
            ) {
              const [source, sourceKey, ...statuses] = args as string[];
              const matches = [...store.cases.values()]
                .filter(
                  (row) =>
                    row.source === source &&
                    row.source_key === sourceKey &&
                    statuses.includes(row.status)
                )
                .sort(
                  (a, b) =>
                    b.updated_at.localeCompare(a.updated_at) ||
                    b.case_id.localeCompare(a.case_id)
                );
              return (matches[0] ?? null) as T | null;
            }
            if (
              sql.includes("FROM vouch_case_suspensions") &&
              sql.includes("suspension_id = ?")
            ) {
              return (
                store.suspensions.find((row) => row.suspension_id === args[0]) ??
                null
              ) as T | null;
            }
            if (
              sql.includes("FROM vouch_case_suspensions") &&
              sql.includes("profile_id = ?")
            ) {
              const matches = store.suspensions
                .filter((row) => row.profile_id === args[0])
                .sort(
                  (a, b) =>
                    b.suspended_at.localeCompare(a.suspended_at) ||
                    b.suspension_id.localeCompare(a.suspension_id)
                );
              return (matches[0] ?? null) as T | null;
            }
            return null as T | null;
          },
          async run() {
            if (sql.includes("INSERT INTO vouch_cases")) {
              const [
                case_id,
                kind,
                source,
                source_key,
                subject_profile_ids_json,
                subject_vouch_ids_json,
                status,
                priority,
                threat_ids_json,
                summary,
                created_by,
                assigned_to,
                created_at,
                updated_at,
              ] = args as string[];
              const row: VouchCaseRow = {
                case_id,
                kind: kind as VouchCaseRow["kind"],
                source: source as VouchCaseRow["source"],
                source_key,
                subject_profile_ids_json,
                subject_vouch_ids_json,
                status: status as VouchCaseRow["status"],
                priority: priority as VouchCaseRow["priority"],
                threat_ids_json,
                summary,
                created_by,
                assigned_to: assigned_to ?? null,
                created_at,
                updated_at,
              };
              store.cases.set(case_id, row);
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("INSERT INTO vouch_case_suspensions")) {
              const [
                suspension_id,
                case_id,
                profile_id,
                cause_category,
                notice,
                appeal_deadline,
                signed_document_json,
                suspended_by,
                suspended_at,
                created_at,
              ] = args as string[];
              store.suspensions.push({
                suspension_id,
                case_id,
                profile_id,
                status: "suspended",
                public_label: "Suspended under public rules",
                cause_category: cause_category as VouchCaseSuspensionRow["cause_category"],
                notice,
                appeal_deadline,
                signed_document_json: signed_document_json ?? null,
                suspended_by,
                suspended_at,
                created_at,
              });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("UPDATE cards") && sql.includes("status = 'suspended'")) {
              const [updated_at, profile_id] = args as string[];
              const card = store.cards.get(profile_id);
              if (!card) return { success: true, meta: { changes: 0 } };
              card.status = "suspended";
              card.updated_at = updated_at;
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("UPDATE vouch_cases")) {
              if (sql.includes("status = 'suspended'")) {
                const [updated_at, case_id] = args as string[];
                const found = store.cases.get(case_id);
                if (!found) return { success: true, meta: { changes: 0 } };
                found.status = "suspended";
                found.updated_at = updated_at;
                return { success: true, meta: { changes: 1 } };
              }
              const [status, updated_at, case_id] = args as string[];
              const found = store.cases.get(case_id);
              if (!found) return { success: true, meta: { changes: 0 } };
              found.status = status as VouchCaseRow["status"];
              found.updated_at = updated_at;
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function db(): { store: VouchCaseStore; database: D1Database } {
  const store = new VouchCaseStore();
  return { store, database: store as unknown as D1Database };
}

function caseParams(
  overrides: Partial<Parameters<typeof createVouchCase>[1]> = {}
): Parameters<typeof createVouchCase>[1] {
  return {
    caseId: "case_open_01",
    kind: "false_vouch",
    source: "public_report",
    sourceKey: `report:false_vouch:${PROFILE_A}`,
    subjectProfileIds: [PROFILE_A, ` ${PROFILE_A} `, PROFILE_B, ""],
    subjectVouchIds: ["vouch_bbbbbbbbbbbb", "vouch_aaaaaaaaaaaa", "vouch_aaaaaaaaaaaa"],
    priority: "p1",
    threatIds: ["V-06", " H-02 ", "V-06"],
    summary: "Public false vouch report.",
    createdBy: "public_report",
    now: NOW,
    ...overrides,
  };
}

describe("vouch-cases D1 persistence", () => {
  it("createVouchCase persists normalized subject and threat JSON", async () => {
    const { database } = db();
    const row = await createVouchCase(database, caseParams());
    expect(JSON.parse(row.subject_profile_ids_json)).toEqual([PROFILE_A, PROFILE_B]);
    expect(JSON.parse(row.subject_vouch_ids_json)).toEqual([
      "vouch_aaaaaaaaaaaa",
      "vouch_bbbbbbbbbbbb",
    ]);
    expect(JSON.parse(row.threat_ids_json)).toEqual(["H-02", "V-06"]);
    expect(row.status).toBe("open");
    expect(await getVouchCaseById(database, row.case_id)).toEqual(row);
  });

  it("getOpenVouchCaseBySource returns the latest open case and ignores dismissed/closed", async () => {
    const { database } = db();
    await createVouchCase(
      database,
      caseParams({
        caseId: "case_old_open",
        now: "2026-08-18T10:00:00.000Z",
      })
    );
    await createVouchCase(
      database,
      caseParams({
        caseId: "case_closed",
        status: "closed",
        now: "2026-08-19T11:00:00.000Z",
      })
    );
    await createVouchCase(
      database,
      caseParams({
        caseId: "case_latest_open",
        now: "2026-08-19T12:00:00.000Z",
      })
    );

    const open = await getOpenVouchCaseBySource(
      database,
      "public_report",
      `report:false_vouch:${PROFILE_A}`
    );
    expect(open?.case_id).toBe("case_latest_open");

    await updateVouchCaseStatus(database, "case_latest_open", "dismissed", "2026-08-19T13:00:00.000Z");
    const remaining = await getOpenVouchCaseBySource(
      database,
      "public_report",
      `report:false_vouch:${PROFILE_A}`
    );
    expect(remaining?.case_id).toBe("case_old_open");
  });

  it("listVouchCases filters by status/source and clamps the limit", async () => {
    const { database } = db();
    await createVouchCase(database, caseParams({ caseId: "case_a" }));
    await createVouchCase(
      database,
      caseParams({
        caseId: "case_b",
        source: "operator_manual",
        sourceKey: "manual:1",
        status: "watching",
        now: "2026-08-19T11:00:00.000Z",
      })
    );

    const watching = await listVouchCases(database, { status: "watching" });
    expect(watching.map((row) => row.case_id)).toEqual(["case_b"]);

    const reports = await listVouchCases(database, { source: "public_report" });
    expect(reports.map((row) => row.case_id)).toEqual(["case_a"]);

    const both = await listVouchCases(database, {
      status: "watching",
      source: "operator_manual",
    });
    expect(both.map((row) => row.case_id)).toEqual(["case_b"]);

    const minLimited = await listVouchCases(database, { limit: 0 });
    expect(minLimited).toHaveLength(1);
    expect(minLimited[0]?.case_id).toBe("case_b");
  });

  it("updateVouchCaseStatus is a no-op CAS miss for unknown case ids", async () => {
    const { database } = db();
    expect(
      await updateVouchCaseStatus(database, "case_missing", "closed", NOW)
    ).toBeNull();
  });
});

describe("suspendProfileForVouchCase", () => {
  it("suspends the card and case together and records the latest suspension", async () => {
    const { store, database } = db();
    store.addCard(PROFILE_A);
    store.addCard(PROFILE_B);
    const created = await createVouchCase(database, caseParams());

    const suspension = await suspendProfileForVouchCase(database, {
      suspensionId: "sus_01",
      caseId: created.case_id,
      profileId: PROFILE_A,
      causeCategory: "vouch_abuse",
      notice: "Suspended under public rules.",
      appealDeadline: "2026-09-02T10:00:00.000Z",
      suspendedBy: "operator_alice",
      now: "2026-08-19T14:00:00.000Z",
    });

    expect(suspension.status).toBe("suspended");
    expect(suspension.public_label).toBe("Suspended under public rules");
    expect(store.cards.get(PROFILE_A)?.status).toBe("suspended");
    expect(store.cards.get(PROFILE_B)?.status).toBe("active");
    expect((await getVouchCaseById(database, created.case_id))?.status).toBe(
      "suspended"
    );
    expect((await getLatestSuspensionForProfile(database, PROFILE_A))?.suspension_id).toBe(
      "sus_01"
    );
  });

  it("throws CARD_NOT_FOUND without marking the case suspended", async () => {
    const { store, database } = db();
    const created = await createVouchCase(database, caseParams());

    await expect(
      suspendProfileForVouchCase(database, {
        suspensionId: "sus_missing_card",
        caseId: created.case_id,
        profileId: PROFILE_A,
        causeCategory: "impersonation",
        notice: "No card.",
        appealDeadline: "2026-09-02T10:00:00.000Z",
        suspendedBy: "operator_alice",
        now: NOW,
      })
    ).rejects.toThrow("CARD_NOT_FOUND");

    expect((await getVouchCaseById(database, created.case_id))?.status).toBe("open");
    expect(store.suspensions).toHaveLength(1);
    expect(store.cards.get(PROFILE_A)).toBeUndefined();
  });

  it("throws CASE_NOT_FOUND after the card write when the case row is missing", async () => {
    const { store, database } = db();
    store.addCard(PROFILE_A);

    await expect(
      suspendProfileForVouchCase(database, {
        suspensionId: "sus_missing_case",
        caseId: "case_missing",
        profileId: PROFILE_A,
        causeCategory: "harassment",
        notice: "No case.",
        appealDeadline: "2026-09-02T10:00:00.000Z",
        suspendedBy: "operator_alice",
        now: NOW,
      })
    ).rejects.toThrow("CASE_NOT_FOUND");

    expect(store.cards.get(PROFILE_A)?.status).toBe("suspended");
    expect(store.suspensions.map((row) => row.suspension_id)).toEqual([
      "sus_missing_case",
    ]);
  });
});
