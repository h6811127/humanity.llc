import { describe, expect, it } from "vitest";

import {
  approveDocketEditProposal,
  applyDocketEditProposal,
  createDocketEditProposal,
  DOCKET_EDIT_DUAL_GATE_THRESHOLD,
  docketEditProposalMeetsDualGate,
  validateDocketEditProposals,
} from "../../site/js/docket-edit-proposal-core.mjs";
import { validateDocketCase } from "../../site/js/docket-case-core.mjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = join(root, "site/data");

const twoStewards = [
  { id: "hc-founders", display_name: "A", role_label: "First" },
  { id: "hc-reviewer", display_name: "B", role_label: "Second" },
];

describe("docket-edit-proposal-core (dual-gate DG-v0)", () => {
  it("requires two distinct steward approvals", () => {
    expect(DOCKET_EDIT_DUAL_GATE_THRESHOLD).toBe(2);
    expect(docketEditProposalMeetsDualGate(["hc-founders"])).toBe(false);
    expect(docketEditProposalMeetsDualGate(["hc-founders", "hc-reviewer"])).toBe(
      true
    );
  });

  it("creates a pending proposal with proposer as first gate", () => {
    const prop = createDocketEditProposal(
      {
        id: "prop_test",
        field_path: "note",
        summary: "Add context note",
        before: "",
        after: "Broader context note",
        proposed_by: "hc-founders",
      },
      twoStewards
    );
    expect(prop.status).toBe("pending");
    expect(prop.approvals).toEqual(["hc-founders"]);
  });

  it("rejects create when fewer than two stewards", () => {
    expect(() =>
      createDocketEditProposal(
        {
          id: "x",
          field_path: "note",
          summary: "x",
          before: "",
          after: "y",
          proposed_by: "hc-founders",
        },
        [{ id: "hc-founders", display_name: "A", role_label: "Only" }]
      )
    ).toThrow(/at least 2 stewards/i);
  });

  it("second steward approval flips status to approved", () => {
    const prop = createDocketEditProposal(
      {
        id: "prop_test2",
        field_path: "action.label",
        summary: "Retarget CTA",
        before: "Old",
        after: "New CTA",
        proposed_by: "hc-founders",
      },
      twoStewards
    );
    const approved = approveDocketEditProposal(prop, "hc-reviewer", twoStewards);
    expect(approved.status).toBe("approved");
    expect(approved.approvals).toEqual(["hc-founders", "hc-reviewer"]);
  });

  it("apply requires dual-gate and writes changelog entry", () => {
    const prop = createDocketEditProposal(
      {
        id: "prop_apply",
        field_path: "counts[0].title",
        summary: "Tighten title",
        before: "A",
        after: "B",
        proposed_by: "hc-founders",
      },
      twoStewards
    );
    const approved = approveDocketEditProposal(prop, "hc-reviewer", twoStewards);
    const result = applyDocketEditProposal(approved, "2026-07-16");
    expect(result.proposal.status).toBe("applied");
    expect(result.proposal.resolved_at).toBe("2026-07-16");
    expect(result.changelogEntry.summary).toContain("Dual-gate applied");
  });

  it("rejects approved status without dual-gate in validation", () => {
    const errors = [];
    validateDocketEditProposals(
      [
        {
          id: "bad",
          field_path: "note",
          summary: "Nope",
          before: "",
          after: "x",
          proposed_by: "hc-founders",
          approvals: ["hc-founders"],
          status: "approved",
          proposed_at: "2026-07-16",
          resolved_at: null,
        },
      ],
      twoStewards,
      errors
    );
    expect(errors.some((e) => e.includes("requires 2"))).toBe(true);
  });

  it("ships altman fixture pending proposal and ≥2 stewards on all cases", () => {
    for (const id of [
      "netanyahu",
      "putin",
      "altman",
      "musk",
      "zuckerberg",
      "andreessen",
      "thiel",
    ]) {
      const raw = JSON.parse(
        readFileSync(join(dataDir, `docket-case-${id}.json`), "utf8")
      );
      expect(validateDocketCase(raw).ok, id).toBe(true);
      expect(raw.stewards.length).toBeGreaterThanOrEqual(2);
    }
    const altman = JSON.parse(
      readFileSync(join(dataDir, "docket-case-altman.json"), "utf8")
    );
    expect(altman.edit_proposals[0].status).toBe("pending");
    expect(altman.edit_proposals[0].approvals).toEqual(["hc-founders"]);
  });
});
