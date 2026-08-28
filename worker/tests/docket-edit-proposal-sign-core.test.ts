import { describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  approveDocketEditProposalSigned,
  applyDocketEditProposalSigned,
  createDocketEditProposalSigned,
  docketDgV1FixtureKeypair,
  verifyDocketEditApproval,
} from "../../site/js/docket-edit-proposal-sign-core.mjs";
import {
  buildWsDocketDgV1KitHtml,
  validateWsDocketDgV1KitHtml,
} from "../scripts/ws-docket-dg-v1-kit-core.mjs";
import { assessWsDocketDgV1Preflight } from "../scripts/ws-docket-dg-v1-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const stewards = [
  { id: "hc-founders", display_name: "Founders" },
  { id: "hc-reviewer", display_name: "Reviewer" },
];

describe("docket-edit-proposal-sign-core (DG-v1)", () => {
  it("signs and verifies a fixture approval", async () => {
    const keys = await docketDgV1FixtureKeypair("hc-founders");
    expect(keys.publicKeyBase58.length).toBeGreaterThan(20);
    const proposal = await createDocketEditProposalSigned(
      {
        id: "prop-test-1",
        field_path: "note",
        summary: "Clarify note",
        before: "old",
        after: "new",
        proposed_by: "hc-founders",
      },
      "altman",
      stewards
    );
    expect(proposal.signatures).toHaveLength(1);
    const ok = await verifyDocketEditApproval(
      proposal,
      "altman",
      /** @type {Record<string, unknown>} */ (proposal.signatures[0])
    );
    expect(ok).toBe(true);
  });

  it("requires two verified signatures before apply", async () => {
    const created = await createDocketEditProposalSigned(
      {
        id: "prop-test-2",
        field_path: "counts[0].body",
        summary: "Clarify count",
        before: "a",
        after: "b",
        proposed_by: "hc-founders",
      },
      "altman",
      stewards
    );
    await expect(applyDocketEditProposalSigned(created, "altman")).rejects.toThrow(
      /signatures/
    );
    const approved = await approveDocketEditProposalSigned(
      created,
      "altman",
      "hc-reviewer",
      stewards
    );
    expect(approved.status).toBe("approved");
    expect(approved.signatures).toHaveLength(2);
    const applied = await applyDocketEditProposalSigned(approved, "altman");
    expect(applied.proposal.status).toBe("applied");
    expect(String(applied.changelogEntry.summary)).toContain("DG-v1");
  });

  it("lets an id-only approver attach a signature without duplicating approval", async () => {
    const created = await createDocketEditProposalSigned(
      {
        id: "prop-test-3",
        field_path: "status",
        summary: "Status tweak",
        before: "open",
        after: "monitoring",
        proposed_by: "hc-founders",
      },
      "altman",
      stewards
    );
    const hybrid = {
      ...created,
      approvals: ["hc-founders", "hc-reviewer"],
      status: "approved",
    };
    const signed = await approveDocketEditProposalSigned(
      hybrid,
      "altman",
      "hc-reviewer",
      stewards
    );
    expect(signed.approvals).toEqual(["hc-founders", "hc-reviewer"]);
    expect(signed.signatures).toHaveLength(2);
  });
});

describe("ws-docket-dg-v1 kit + preflight", () => {
  it("builds valid kit HTML", () => {
    const html = buildWsDocketDgV1KitHtml({ origin: "http://127.0.0.1:8788" });
    expect(() => validateWsDocketDgV1KitHtml(html)).not.toThrow();
  });

  it("preflight engineering passes", async () => {
    const report = await assessWsDocketDgV1Preflight(root);
    expect(report.engineeringMet).toBe(true);
  });
});
