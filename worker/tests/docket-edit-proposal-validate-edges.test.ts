import { describe, expect, it } from "vitest";

import {
  applyDocketEditProposal,
  approveDocketEditProposal,
  createDocketEditProposal,
  docketEditProposalStorageKey,
  normalizeDocketEditApprovals,
  normalizeDocketEditSignatures,
  readDocketEditProposalsFromStorage,
  validateDocketEditProposalSignatures,
  validateDocketEditProposals,
  writeDocketEditProposalsToStorage,
} from "../../site/js/docket-edit-proposal-core.mjs";
import {
  applyDocketEditProposalToCaseCopy,
  readDocketCaseFieldPath,
  validateDocketMergePack,
} from "../../site/js/docket-edit-proposal-merge-core.mjs";

const twoStewards = [
  { id: "hc-founders", display_name: "A", role_label: "First" },
  { id: "hc-reviewer", display_name: "B", role_label: "Second" },
];

function pendingProposal(overrides = {}) {
  return {
    id: "prop_edge",
    field_path: "note",
    summary: "Tighten note",
    before: "",
    after: "Revised",
    proposed_by: "hc-founders",
    approvals: ["hc-founders"],
    status: "pending",
    proposed_at: "2026-08-29",
    resolved_at: null,
    ...overrides,
  };
}

describe("docket-edit-proposal validation edges", () => {
  it("normalizes approvals and signatures with trim + steward dedupe", () => {
    expect(normalizeDocketEditApprovals([" hc-founders ", "hc-founders", ""])).toEqual([
      "hc-founders",
    ]);
    expect(normalizeDocketEditApprovals("hc-founders")).toEqual([]);
    const sigs = normalizeDocketEditSignatures([
      null,
      { steward_id: " hc-founders ", public_key_base58: "pk", signature_base58: "sig", signed_at: "t" },
      { steward_id: "hc-founders", public_key_base58: "other" },
      { steward_id: "" },
    ]);
    expect(sigs).toHaveLength(1);
    expect(sigs[0].steward_id).toBe("hc-founders");
    expect(sigs[0].public_key_base58).toBe("pk");
  });

  it("rejects unknown field paths, unknown stewards, and missing proposer gate", () => {
    const errors = [];
    validateDocketEditProposals(
      [
        pendingProposal({ field_path: "__proto__" }),
        pendingProposal({
          id: "prop_stranger",
          proposed_by: "hc-outsider",
          approvals: ["hc-outsider"],
        }),
        pendingProposal({
          id: "prop_no_self",
          approvals: ["hc-reviewer"],
        }),
        pendingProposal({
          id: "prop_empty_after",
          after: "   ",
        }),
      ],
      twoStewards,
      errors
    );
    expect(errors.some((e) => e.includes("field_path"))).toBe(true);
    expect(errors.some((e) => e.includes("proposed_by must match"))).toBe(true);
    expect(errors.some((e) => e.includes("must include proposed_by"))).toBe(true);
    expect(errors.some((e) => e.includes("after must be a non-empty string"))).toBe(
      true
    );
  });

  it("requires dual signatures when signatures[] is present on approved rows", () => {
    const errors = [];
    validateDocketEditProposalSignatures(
      [
        {
          ...pendingProposal({ status: "approved", approvals: ["hc-founders", "hc-reviewer"] }),
          signatures: [
            {
              steward_id: "hc-founders",
              public_key_base58: "pk",
              signature_base58: "sig",
              signed_at: "2026-08-29T00:00:00.000Z",
            },
          ],
        },
        {
          ...pendingProposal({ id: "prop_unknown_sig" }),
          signatures: [
            {
              steward_id: "hc-outsider",
              public_key_base58: "pk",
              signature_base58: "sig",
              signed_at: "2026-08-29T00:00:00.000Z",
            },
          ],
        },
      ],
      twoStewards,
      errors
    );
    expect(errors.some((e) => e.includes("requires 2 distinct signatures"))).toBe(
      true
    );
    expect(errors.some((e) => e.includes("must match stewards[]"))).toBe(true);
  });

  it("denies create/approve/apply that skip the dual gate or unknown actors", () => {
    expect(() =>
      createDocketEditProposal(
        {
          id: "x",
          field_path: "note",
          summary: "x",
          before: "",
          after: "y",
          proposed_by: "hc-outsider",
        },
        twoStewards
      )
    ).toThrow(/must be a steward/);

    expect(() =>
      createDocketEditProposal(
        {
          id: "x",
          field_path: "counts[1].title",
          summary: "x",
          before: "",
          after: "y",
          proposed_by: "hc-founders",
        },
        twoStewards
      )
    ).toThrow(/Unsupported field_path/);

    const pending = createDocketEditProposal(
      {
        id: "prop_ok",
        field_path: "note",
        summary: "x",
        before: "",
        after: "y",
        proposed_by: "hc-founders",
      },
      twoStewards
    );
    expect(() => approveDocketEditProposal(pending, "hc-founders", twoStewards)).toThrow(
      /already approved/
    );
    expect(() => approveDocketEditProposal(pending, "hc-outsider", twoStewards)).toThrow(
      /must be a steward/
    );
    expect(() =>
      approveDocketEditProposal({ ...pending, status: "applied" }, "hc-reviewer", twoStewards)
    ).toThrow(/Cannot approve/);
    expect(() => applyDocketEditProposal(pending)).toThrow(/dual-gate/);
  });

  it("falls back when session storage is missing, corrupt, or not an array", () => {
    const fallback = [{ id: "fixture" }];
    const store = {};
    const storage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v);
      },
    };
    expect(docketEditProposalStorageKey(" altman ")).toBe(
      "hc_docket_edit_proposals_v0:altman"
    );
    expect(readDocketEditProposalsFromStorage(storage, "altman", fallback)).toEqual(
      fallback
    );

    storage.setItem(docketEditProposalStorageKey("altman"), "{not-json");
    expect(readDocketEditProposalsFromStorage(storage, "altman", fallback)).toEqual(
      fallback
    );

    writeDocketEditProposalsToStorage(storage, "altman", { not: "array" });
    expect(readDocketEditProposalsFromStorage(storage, "altman", fallback)).toEqual(
      fallback
    );

    writeDocketEditProposalsToStorage(storage, "altman", [{ id: "live" }]);
    expect(readDocketEditProposalsFromStorage(storage, "altman", fallback)).toEqual([
      { id: "live" },
    ]);
  });
});

describe("docket merge field-path edges", () => {
  const sampleCase = {
    id: "altman",
    status: "open",
    note: "Published note",
    action: { label: "Open case" },
    counts: [{ id: "c1", title: "Count", body: "Before body" }],
  };

  it("refuses unsupported or injection-shaped field paths", () => {
    expect(() => readDocketCaseFieldPath(sampleCase, "__proto__")).toThrow(
      /Unsupported field_path/
    );
    expect(() =>
      applyDocketEditProposalToCaseCopy(sampleCase, {
        field_path: "counts[1].title",
        after: "nope",
      })
    ).toThrow(/Unsupported field_path/);
    expect(() =>
      applyDocketEditProposalToCaseCopy(sampleCase, {
        field_path: "id",
        after: "musk",
      })
    ).toThrow(/Unsupported field_path/);
    expect(sampleCase.note).toBe("Published note");
  });

  it("rejects merge packs that claim to write published JSON", () => {
    expect(
      validateDocketMergePack({
        kind: "hc.docket.merge_pack.v0",
        version: 1,
        writes_published_json: true,
        human_gated: true,
        worker_store: true,
        case_id: "altman",
        previews: [],
        case_after_merge: sampleCase,
      }).ok
    ).toBe(false);
  });
});
