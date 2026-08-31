import { describe, expect, it } from "vitest";

import {
  applyDocketEditProposalToCaseCopy,
  buildDocketEditMergePreview,
  buildDocketMergePack,
  DOCKET_MERGE_PACK_KIND,
  DOCKET_MERGE_PACK_VERSION,
  docketMergePackFilename,
  readDocketCaseFieldPath,
  validateDocketMergePack,
} from "../../site/js/docket-edit-proposal-merge-core.mjs";

const sampleCase = {
  id: "altman",
  status: "open",
  note: "Published note",
  action: { label: "Open case" },
  counts: [{ id: "c1", title: "Count", body: "Before body" }],
};

const appliedNote = {
  id: "prop_1",
  field_path: "note",
  summary: "Tighten note",
  before: "Published note",
  after: "Revised note",
  status: "applied",
  approvals: ["hc-founders", "hc-reviewer"],
};

describe("docket-edit-proposal-merge-core reject edges (DG-merge-v0)", () => {
  it("throws on unsupported field paths and missing counts[0]", () => {
    expect(() => readDocketCaseFieldPath(sampleCase, "secret")).toThrow(/Unsupported field_path/);
    expect(() =>
      applyDocketEditProposalToCaseCopy(sampleCase, { field_path: "counts[1].body", after: "x" })
    ).toThrow(/Unsupported field_path/);
    expect(() =>
      applyDocketEditProposalToCaseCopy({ ...sampleCase, counts: [] }, {
        field_path: "counts[0].body",
        after: "x",
      })
    ).toThrow(/counts\[0\] missing/);
  });

  it("does not mutate the published case when applying a copy", () => {
    const next = applyDocketEditProposalToCaseCopy(sampleCase, {
      field_path: "action.label",
      after: "Revised CTA",
    });
    expect(readDocketCaseFieldPath(next, "action.label")).toBe("Revised CTA");
    expect(readDocketCaseFieldPath(sampleCase, "action.label")).toBe("Open case");
    expect(sampleCase.note).toBe("Published note");
  });

  it("creates action when merging action.label onto a case without one", () => {
    const next = applyDocketEditProposalToCaseCopy(
      { id: "altman", status: "open" },
      { field_path: "action.label", after: "File brief" }
    );
    expect(readDocketCaseFieldPath(next, "action.label")).toBe("File brief");
    expect(readDocketCaseFieldPath({ id: "altman" }, "action.label")).toBe("");
    expect(readDocketCaseFieldPath({ id: "altman", counts: [null] }, "counts[0].title")).toBe("");
  });

  it("merge pack skips non-applied proposals and requires a case id", () => {
    expect(() =>
      buildDocketMergePack({ caseId: "  ", fullCase: sampleCase, proposals: [appliedNote] })
    ).toThrow(/caseId required/);

    const pack = buildDocketMergePack({
      caseId: "altman",
      fullCase: sampleCase,
      proposals: [
        appliedNote,
        {
          id: "prop_pending",
          field_path: "status",
          summary: "skip",
          before: "open",
          after: "closed",
          status: "pending",
          approvals: ["hc-founders"],
        },
        {
          id: "prop_approved",
          field_path: "status",
          summary: "also skip",
          before: "open",
          after: "monitoring",
          status: "approved",
          approvals: ["hc-founders", "hc-reviewer"],
        },
      ],
      generatedAt: "2026-08-31T10:00:00.000Z",
    });
    expect(pack.previews).toHaveLength(1);
    expect(pack.writes_published_json).toBe(false);
    expect(readDocketCaseFieldPath(pack.case_after_merge, "status")).toBe("open");
    expect(readDocketCaseFieldPath(pack.case_after_merge, "note")).toBe("Revised note");
  });

  it("validateDocketMergePack rejects auto-write or malformed packs", () => {
    expect(validateDocketMergePack(null).ok).toBe(false);
    expect(validateDocketMergePack([]).ok).toBe(false);

    const valid = buildDocketMergePack({
      caseId: "altman",
      fullCase: sampleCase,
      proposals: [appliedNote],
    });
    expect(validateDocketMergePack(valid).ok).toBe(true);

    expect(validateDocketMergePack({ ...valid, writes_published_json: true }).ok).toBe(false);
    expect(validateDocketMergePack({ ...valid, human_gated: false }).ok).toBe(false);
    expect(validateDocketMergePack({ ...valid, worker_store: false }).ok).toBe(false);
    expect(validateDocketMergePack({ ...valid, kind: "hc.docket.merge_pack.v1" }).ok).toBe(false);
    expect(validateDocketMergePack({ ...valid, version: 2 }).ok).toBe(false);
    expect(validateDocketMergePack({ ...valid, case_id: "" }).ok).toBe(false);
    expect(validateDocketMergePack({ ...valid, previews: null }).ok).toBe(false);
    expect(validateDocketMergePack({ ...valid, case_after_merge: null }).ok).toBe(false);
    expect(valid.kind).toBe(DOCKET_MERGE_PACK_KIND);
    expect(valid.version).toBe(DOCKET_MERGE_PACK_VERSION);
  });

  it("preview never claims to write published JSON", () => {
    const preview = buildDocketEditMergePreview(sampleCase, appliedNote);
    expect(preview.writes_published_json).toBe(false);
    expect(preview.human_gated).toBe(true);
    expect(preview.published_before).toBe("Published note");
    expect(docketMergePackFilename("altman", "2026-08-31T10:11:12.345Z")).toBe(
      "docket-merge-pack-altman-2026-08-31T10-11-12.json"
    );
  });
});
