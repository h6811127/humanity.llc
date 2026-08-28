import { describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyDocketEditProposalToCaseCopy,
  buildDocketEditMergePreview,
  buildDocketMergePack,
  readDocketCaseFieldPath,
  validateDocketMergePack,
} from "../../site/js/docket-edit-proposal-merge-core.mjs";
import { assessWsDocketDgMergePreflight } from "../scripts/ws-docket-dg-merge-preflight-core.mjs";
import {
  buildWsDocketDgMergeKitHtml,
  validateWsDocketDgMergeKitHtml,
} from "../scripts/ws-docket-dg-merge-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const sampleCase = {
  id: "altman",
  status: "open",
  note: "Published note",
  action: { label: "Open case" },
  counts: [{ id: "c1", title: "Count", body: "Before body" }],
};

describe("docket-edit-proposal-merge-core (DG-merge-v0)", () => {
  it("reads and applies field paths on a case copy", () => {
    expect(readDocketCaseFieldPath(sampleCase, "counts[0].body")).toBe("Before body");
    const next = applyDocketEditProposalToCaseCopy(sampleCase, {
      field_path: "counts[0].body",
      after: "After body",
    });
    expect(readDocketCaseFieldPath(next, "counts[0].body")).toBe("After body");
    expect(readDocketCaseFieldPath(sampleCase, "counts[0].body")).toBe("Before body");
  });

  it("builds a human-gated merge pack that never claims to write published JSON", () => {
    const preview = buildDocketEditMergePreview(sampleCase, {
      id: "prop_1",
      field_path: "note",
      summary: "Tighten note",
      before: "Published note",
      after: "Revised note",
      status: "applied",
      approvals: ["hc-founders", "hc-reviewer"],
    });
    expect(preview.writes_published_json).toBe(false);
    expect(preview.merged_value).toBe("Revised note");

    const pack = buildDocketMergePack({
      caseId: "altman",
      fullCase: sampleCase,
      proposals: [
        {
          id: "prop_1",
          field_path: "note",
          summary: "Tighten note",
          before: "Published note",
          after: "Revised note",
          status: "applied",
          approvals: ["hc-founders", "hc-reviewer"],
        },
        {
          id: "prop_pending",
          field_path: "status",
          summary: "skip",
          before: "open",
          after: "monitoring",
          status: "pending",
          approvals: ["hc-founders"],
        },
      ],
    });
    expect(validateDocketMergePack(pack).ok).toBe(true);
    expect(pack.previews).toHaveLength(1);
    expect(pack.writes_published_json).toBe(false);
    expect(pack.worker_store).toBe(true);
    expect(readDocketCaseFieldPath(pack.case_after_merge, "note")).toBe("Revised note");
  });
});

describe("ws-docket-dg-merge kit + preflight", () => {
  it("builds valid kit HTML", () => {
    const html = buildWsDocketDgMergeKitHtml({ origin: "http://127.0.0.1:8788" });
    expect(validateWsDocketDgMergeKitHtml(html)).toBe(true);
  });

  it("preflight ready after kit write", () => {
    expect(assessWsDocketDgMergePreflight(root).engineeringMet).toBe(true);
  });
});
