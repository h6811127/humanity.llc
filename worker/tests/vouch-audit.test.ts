import { describe, expect, it } from "vitest";

import { listVouchAuditFlags } from "../src/db/vouch-audit";

type AuditRow = {
  voucher_profile_id: string;
  vouchee_profile_id: string;
  status: "active" | "revoked";
  created_at: string;
};

class FakeAuditDb {
  constructor(private readonly rows: AuditRow[]) {}

  prepare(_sql: string) {
    const rows = this.rows;
    return {
      bind(_maxRows: number) {
        return {
          async all<T>() {
            return { results: rows as T[] };
          },
        };
      },
    };
  }
}

function db(rows: AuditRow[]): D1Database {
  return new FakeAuditDb(rows) as unknown as D1Database;
}

describe("listVouchAuditFlags", () => {
  it("flags vouchers who only vouch each other in active closed loops", async () => {
    const flags = await listVouchAuditFlags(
      db([
        {
          voucher_profile_id: "profile_a",
          vouchee_profile_id: "profile_b",
          status: "active",
          created_at: "2026-05-01T00:00:00.000Z",
        },
        {
          voucher_profile_id: "profile_b",
          vouchee_profile_id: "profile_a",
          status: "active",
          created_at: "2026-05-01T01:00:00.000Z",
        },
        {
          voucher_profile_id: "profile_c",
          vouchee_profile_id: "profile_d",
          status: "active",
          created_at: "2026-05-01T02:00:00.000Z",
        },
      ])
    );

    expect(flags.filter((flag) => flag.kind === "closed_loop_only")).toEqual([
      {
        kind: "closed_loop_only",
        voucher_profile_id: "profile_a",
        related_profile_ids: ["profile_b"],
        active_outgoing_count: 1,
      },
      {
        kind: "closed_loop_only",
        voucher_profile_id: "profile_b",
        related_profile_ids: ["profile_a"],
        active_outgoing_count: 1,
      },
    ]);
  });

  it("flags quota-boundary bursts using all issuances, including revoked vouches", async () => {
    const rows: AuditRow[] = [
      "2026-05-01T00:00:00.000Z",
      "2026-05-01T01:00:00.000Z",
      "2026-05-01T02:00:00.000Z",
      "2026-05-01T03:00:00.000Z",
      "2026-05-01T04:00:00.000Z",
    ].map((createdAt, index) => ({
      voucher_profile_id: "profile_bursty",
      vouchee_profile_id: `profile_target_${index}`,
      status: index === 2 ? "revoked" : "active",
      created_at: createdAt,
    }));

    const flags = await listVouchAuditFlags(db(rows), {
      now: "2026-05-02T00:00:00.000Z",
    });

    expect(flags).toContainEqual({
      kind: "burst_at_quota_boundary",
      voucher_profile_id: "profile_bursty",
      issuance_count: 5,
      window_hours: 24,
      first_created_at: "2026-05-01T00:00:00.000Z",
      last_created_at: "2026-05-01T04:00:00.000Z",
    });
  });

  it("flags vouchees with highly overlapping voucher sets", async () => {
    const flags = await listVouchAuditFlags(
      db([
        ["voucher_1", "vouchee_a"],
        ["voucher_2", "vouchee_a"],
        ["voucher_3", "vouchee_a"],
        ["voucher_1", "vouchee_b"],
        ["voucher_2", "vouchee_b"],
        ["voucher_3", "vouchee_b"],
        ["voucher_4", "vouchee_b"],
        ["voucher_1", "vouchee_c"],
        ["voucher_2", "vouchee_c"],
      ].map(([voucher, vouchee], index) => ({
        voucher_profile_id: voucher,
        vouchee_profile_id: vouchee,
        status: "active",
        created_at: `2026-05-01T0${index}:00:00.000Z`,
      })))
    );

    expect(flags).toContainEqual({
      kind: "shared_voucher_set",
      vouchee_profile_ids: ["vouchee_a", "vouchee_b"],
      shared_voucher_profile_ids: ["voucher_1", "voucher_2", "voucher_3"],
      similarity: 0.75,
    });
    expect(
      flags.some(
        (flag) =>
          flag.kind === "shared_voucher_set" &&
          flag.vouchee_profile_ids.includes("vouchee_c")
      )
    ).toBe(false);
  });
});
