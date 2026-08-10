import { describe, expect, it } from "vitest";

import {
  VOUCH_CASE_KINDS,
  VOUCH_CASE_PRIORITIES,
  VOUCH_SUSPENSION_CAUSE_CATEGORIES,
  isVouchCaseKind,
  isVouchCasePriority,
  isVouchSuspensionCauseCategory,
  normalizeProfileIds,
  normalizeVouchIds,
} from "../src/db/vouch-cases";

describe("vouch case validators", () => {
  it("accepts only declared case kinds", () => {
    for (const kind of VOUCH_CASE_KINDS) {
      expect(isVouchCaseKind(kind)).toBe(true);
    }
    expect(isVouchCaseKind("vouch_graph")).toBe(true);
    expect(isVouchCaseKind("not_a_kind")).toBe(false);
    expect(isVouchCaseKind("")).toBe(false);
    expect(isVouchCaseKind(null)).toBe(false);
    expect(isVouchCaseKind(1)).toBe(false);
  });

  it("accepts only p0–p2 priorities", () => {
    for (const priority of VOUCH_CASE_PRIORITIES) {
      expect(isVouchCasePriority(priority)).toBe(true);
    }
    expect(isVouchCasePriority("p3")).toBe(false);
    expect(isVouchCasePriority("P0")).toBe(false);
    expect(isVouchCasePriority(undefined)).toBe(false);
  });

  it("accepts only declared suspension cause categories", () => {
    for (const category of VOUCH_SUSPENSION_CAUSE_CATEGORIES) {
      expect(isVouchSuspensionCauseCategory(category)).toBe(true);
    }
    expect(isVouchSuspensionCauseCategory("spam")).toBe(false);
    expect(isVouchSuspensionCauseCategory({})).toBe(false);
  });
});

describe("vouch case subject id normalization", () => {
  it("trims, drops empties, dedupes, and sorts profile ids", () => {
    expect(
      normalizeProfileIds(["  bob  ", "", "alice", "bob", "  ", "carol"])
    ).toEqual(["alice", "bob", "carol"]);
  });

  it("normalizes vouch ids the same way and defaults missing lists", () => {
    expect(normalizeVouchIds()).toEqual([]);
    expect(
      normalizeVouchIds([" vouch_b ", "vouch_a", "vouch_a", "", " vouch_c"])
    ).toEqual(["vouch_a", "vouch_b", "vouch_c"]);
  });
});
