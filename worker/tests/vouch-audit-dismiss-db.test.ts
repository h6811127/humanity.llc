import { describe, expect, it } from "vitest";

import {
  deleteVouchAuditDismissal,
  listVouchAuditDismissals,
  upsertVouchAuditDismissal,
  type VouchAuditDismissalRow,
} from "../src/db/vouch-audit-review";

const KEY_A = "closed_loop_only|profile_a|profile_b";
const KEY_B = "directed_cycle_cluster|profile_c|profile_d";
const KEY_C = "shared_voucher_set|profile_e|profile_f";

class DismissalDb {
  rows = new Map<string, VouchAuditDismissalRow>();

  prepare(sql: string) {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async all<T>() {
            if (sql.includes("FROM vouch_audit_dismissals") && sql.includes("IN (")) {
              const requested = new Set(args.map(String));
              const results = [...db.rows.values()].filter((row) =>
                requested.has(row.flag_key)
              );
              return { results: results as T[] };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (sql.includes("INSERT INTO vouch_audit_dismissals")) {
              const [flagKey, flagKind, note, dismissedBy, dismissedAt, updatedAt] =
                args as [
                  string,
                  VouchAuditDismissalRow["flag_kind"],
                  string,
                  string,
                  string,
                  string,
                ];
              db.rows.set(flagKey, {
                flag_key: flagKey,
                flag_kind: flagKind,
                note,
                dismissed_by: dismissedBy,
                dismissed_at: dismissedAt,
                updated_at: updatedAt,
              });
              return { meta: { changes: 1 } };
            }
            if (sql.includes("DELETE FROM vouch_audit_dismissals")) {
              const flagKey = String(args[0]);
              const existed = db.rows.delete(flagKey);
              return { meta: { changes: existed ? 1 : 0 } };
            }
            return { meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function db(): DismissalDb & D1Database {
  return new DismissalDb() as DismissalDb & D1Database;
}

describe("vouch audit dismissal persistence", () => {
  it("lists nothing when no keys are requested", async () => {
    const store = db();
    await upsertVouchAuditDismissal(store, {
      flagKey: KEY_A,
      flagKind: "closed_loop_only",
      note: "reviewed",
      dismissedBy: "operator",
      dismissedAt: "2026-08-17T10:00:00.000Z",
    });
    expect(await listVouchAuditDismissals(store, [])).toEqual([]);
  });

  it("lists only the requested keys and ignores neighbors", async () => {
    const store = db();
    await upsertVouchAuditDismissal(store, {
      flagKey: KEY_A,
      flagKind: "closed_loop_only",
      note: "loop reviewed",
      dismissedBy: "operator",
      dismissedAt: "2026-08-17T10:00:00.000Z",
    });
    await upsertVouchAuditDismissal(store, {
      flagKey: KEY_B,
      flagKind: "directed_cycle_cluster",
      note: "cycle reviewed",
      dismissedBy: "operator",
      dismissedAt: "2026-08-17T10:01:00.000Z",
    });
    await upsertVouchAuditDismissal(store, {
      flagKey: KEY_C,
      flagKind: "shared_voucher_set",
      note: "shared reviewed",
      dismissedBy: "operator",
      dismissedAt: "2026-08-17T10:02:00.000Z",
    });

    const listed = await listVouchAuditDismissals(store, [KEY_B, KEY_A, "missing|key"]);
    expect(listed.map((row) => row.flag_key).sort()).toEqual([KEY_A, KEY_B].sort());
    expect(listed.find((row) => row.flag_key === KEY_B)?.note).toBe("cycle reviewed");
  });

  it("upsert overwrites note, kind, and timestamps on the same flag_key", async () => {
    const store = db();
    await upsertVouchAuditDismissal(store, {
      flagKey: KEY_A,
      flagKind: "closed_loop_only",
      note: "first look",
      dismissedBy: "operator-a",
      dismissedAt: "2026-08-17T10:00:00.000Z",
    });
    await upsertVouchAuditDismissal(store, {
      flagKey: KEY_A,
      flagKind: "steward_issuance_burst",
      note: "re-reviewed",
      dismissedBy: "operator-b",
      dismissedAt: "2026-08-17T11:00:00.000Z",
    });

    expect(store.rows.size).toBe(1);
    expect(store.rows.get(KEY_A)).toEqual({
      flag_key: KEY_A,
      flag_kind: "steward_issuance_burst",
      note: "re-reviewed",
      dismissed_by: "operator-b",
      dismissed_at: "2026-08-17T11:00:00.000Z",
      updated_at: "2026-08-17T11:00:00.000Z",
    });
  });

  it("delete reports whether the target row existed and leaves neighbors", async () => {
    const store = db();
    await upsertVouchAuditDismissal(store, {
      flagKey: KEY_A,
      flagKind: "closed_loop_only",
      note: "keep neighbor",
      dismissedBy: "operator",
      dismissedAt: "2026-08-17T10:00:00.000Z",
    });
    await upsertVouchAuditDismissal(store, {
      flagKey: KEY_B,
      flagKind: "directed_cycle_cluster",
      note: "remove me",
      dismissedBy: "operator",
      dismissedAt: "2026-08-17T10:01:00.000Z",
    });

    expect(await deleteVouchAuditDismissal(store, KEY_B)).toBe(true);
    expect(await deleteVouchAuditDismissal(store, KEY_B)).toBe(false);
    expect(store.rows.has(KEY_A)).toBe(true);
    expect(store.rows.has(KEY_B)).toBe(false);
  });
});
