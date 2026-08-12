import { describe, expect, it } from "vitest";

import type { VouchAuditFlag } from "../src/db/vouch-audit";
import { vouchAuditFlagKey } from "../src/db/vouch-audit-review";

describe("vouchAuditFlagKey", () => {
  it("sorts closed_loop related profile ids so key order is stable", () => {
    const a: VouchAuditFlag = {
      kind: "closed_loop_only",
      voucher_profile_id: "voucher_a",
      related_profile_ids: ["zulu", "alpha"],
      active_outgoing_count: 1,
    };
    const b: VouchAuditFlag = {
      ...a,
      related_profile_ids: ["alpha", "zulu"],
    };
    expect(vouchAuditFlagKey(a)).toBe(vouchAuditFlagKey(b));
    expect(vouchAuditFlagKey(a)).toBe(
      "closed_loop_only|voucher_a|alpha|zulu"
    );
  });

  it("includes issuance window fields for quota and steward bursts", () => {
    const quota: VouchAuditFlag = {
      kind: "burst_at_quota_boundary",
      voucher_profile_id: "voucher_b",
      issuance_count: 5,
      window_hours: 24,
      first_created_at: "2026-05-01T00:00:00.000Z",
      last_created_at: "2026-05-01T02:00:00.000Z",
    };
    const steward: VouchAuditFlag = {
      kind: "steward_issuance_burst",
      voucher_profile_id: "voucher_b",
      issuance_count: 5,
      window_hours: 24,
      first_created_at: "2026-05-01T00:00:00.000Z",
      last_created_at: "2026-05-01T02:00:00.000Z",
    };
    expect(vouchAuditFlagKey(quota)).toBe(
      "burst_at_quota_boundary|voucher_b|5|2026-05-01T00:00:00.000Z|2026-05-01T02:00:00.000Z"
    );
    expect(vouchAuditFlagKey(steward)).toBe(
      "steward_issuance_burst|voucher_b|5|2026-05-01T00:00:00.000Z|2026-05-01T02:00:00.000Z"
    );
    expect(vouchAuditFlagKey(quota)).not.toBe(vouchAuditFlagKey(steward));
  });

  it("sorts shared voucher-set ids on both sides", () => {
    const left: VouchAuditFlag = {
      kind: "shared_voucher_set",
      vouchee_profile_ids: ["vee_b", "vee_a"],
      shared_voucher_profile_ids: ["v3", "v1", "v2"],
      similarity: 0.9,
    };
    const right: VouchAuditFlag = {
      kind: "shared_voucher_set",
      vouchee_profile_ids: ["vee_a", "vee_b"],
      shared_voucher_profile_ids: ["v2", "v3", "v1"],
      similarity: 0.5,
    };
    expect(vouchAuditFlagKey(left)).toBe(vouchAuditFlagKey(right));
    expect(vouchAuditFlagKey(left)).toBe(
      "shared_voucher_set|vee_a|vee_b|v1|v2|v3"
    );
  });

  it("sorts directed cycle cluster profile ids", () => {
    const a: VouchAuditFlag = {
      kind: "directed_cycle_cluster",
      profile_ids: ["c", "a", "b"],
      active_edge_count: 4,
      density: 0.7,
    };
    const b: VouchAuditFlag = {
      ...a,
      profile_ids: ["a", "b", "c"],
      density: 0.1,
    };
    expect(vouchAuditFlagKey(a)).toBe(vouchAuditFlagKey(b));
    expect(vouchAuditFlagKey(a)).toBe("directed_cycle_cluster|a|b|c");
  });
});
