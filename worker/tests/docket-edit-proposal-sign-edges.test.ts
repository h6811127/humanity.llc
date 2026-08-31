import { describe, expect, it } from "vitest";

import {
  approveDocketEditProposalSigned,
  applyDocketEditProposalSigned,
  createDocketEditProposalSigned,
  docketDgV1FixtureKeypair,
  signDocketEditApproval,
  verifyDocketEditApproval,
} from "../../site/js/docket-edit-proposal-sign-core.mjs";

const stewards = [
  { id: "hc-founders", display_name: "Founders" },
  { id: "hc-reviewer", display_name: "Reviewer" },
];

async function pendingProposal(id = "prop-sign-edge") {
  return createDocketEditProposalSigned(
    {
      id,
      field_path: "note",
      summary: "Clarify note",
      before: "old",
      after: "new",
      proposed_by: "hc-founders",
    },
    "altman",
    stewards
  );
}

describe("docket-edit-proposal-sign-core reject edges (DG-v1)", () => {
  it("refuses an empty steward id for fixture keypairs", async () => {
    await expect(docketDgV1FixtureKeypair("")).rejects.toThrow(/stewardId required/i);
    await expect(docketDgV1FixtureKeypair("   ")).rejects.toThrow(/stewardId required/i);
  });

  it("verify fails on missing signature fields or garbage Base58", async () => {
    const proposal = await pendingProposal("prop-missing-sig");
    const row = /** @type {Record<string, unknown>} */ (proposal.signatures[0]);

    expect(await verifyDocketEditApproval(proposal, "altman", { ...row, signature_base58: "" })).toBe(
      false
    );
    expect(await verifyDocketEditApproval(proposal, "altman", { ...row, public_key_base58: "" })).toBe(
      false
    );
    expect(await verifyDocketEditApproval(proposal, "altman", { ...row, signed_at: "" })).toBe(false);
    expect(await verifyDocketEditApproval(proposal, "altman", { ...row, steward_id: "" })).toBe(false);
    expect(
      await verifyDocketEditApproval(proposal, "altman", {
        ...row,
        public_key_base58: "not-valid-base58!!!",
      })
    ).toBe(false);
  });

  it("binds the signature to case id and proposal body", async () => {
    const proposal = await pendingProposal("prop-bound-case");
    const row = /** @type {Record<string, unknown>} */ (proposal.signatures[0]);

    expect(await verifyDocketEditApproval(proposal, "altman", row)).toBe(true);
    expect(await verifyDocketEditApproval(proposal, "musk", row)).toBe(false);
    expect(
      await verifyDocketEditApproval({ ...proposal, field_path: "status" }, "altman", row)
    ).toBe(false);
    expect(await verifyDocketEditApproval({ ...proposal, after: "tampered" }, "altman", row)).toBe(
      false
    );
    expect(
      await verifyDocketEditApproval(proposal, "altman", {
        ...row,
        signed_at: "1999-01-01T00:00:00.000Z",
      })
    ).toBe(false);
  });

  it("rejects approve from a non-steward, a repeat signer, or an applied proposal", async () => {
    const proposal = await pendingProposal("prop-approve-deny");

    await expect(
      approveDocketEditProposalSigned(proposal, "altman", "hc-stranger", stewards)
    ).rejects.toThrow(/steward/i);

    await expect(
      approveDocketEditProposalSigned(proposal, "altman", "hc-founders", stewards)
    ).rejects.toThrow(/already signed/i);

    await expect(
      approveDocketEditProposalSigned(
        { ...proposal, status: "applied" },
        "altman",
        "hc-reviewer",
        stewards
      )
    ).rejects.toThrow(/status applied/i);
  });

  it("apply rejects a tampered body and a signer missing from approvals", async () => {
    const created = await pendingProposal("prop-apply-deny");
    const approved = await approveDocketEditProposalSigned(
      created,
      "altman",
      "hc-reviewer",
      stewards
    );
    expect(approved.status).toBe("approved");

    await expect(
      applyDocketEditProposalSigned({ ...approved, after: "rewritten after sign" }, "altman")
    ).rejects.toThrow(/Invalid DG-v1 signature/i);

    const orphanSigner = {
      ...approved,
      approvals: ["hc-founders", "hc-other"],
    };
    await expect(applyDocketEditProposalSigned(orphanSigner, "altman")).rejects.toThrow(
      /missing from approvals/i
    );
  });

  it("verify accepts a freshly attached second-gate signature", async () => {
    const created = await pendingProposal("prop-second-gate");
    const signature = await signDocketEditApproval(created, "altman", "hc-reviewer");
    expect(await verifyDocketEditApproval(created, "altman", signature)).toBe(true);
    expect(await verifyDocketEditApproval(created, "musk", signature)).toBe(false);
  });
});
