import { describe, expect, it } from "vitest";

import {
  canProceedToCheckout,
  isProofConsentComplete,
  proofConsentRequiredIds,
  proofConsentStatusMessage,
  PROOF_CONSENT_COPY,
} from "../../site/js/shop-proof-consent-core.mjs";

describe("shop-proof-consent-core", () => {
  it("requires three personalized consent lines", () => {
    expect(proofConsentRequiredIds("personalized")).toEqual([
      "commerce_not_verification",
      "bearer_not_ownership",
      "persistence_revocable",
    ]);
    expect(proofConsentRequiredIds("tier0")).toContain("batch_qr_pointer");
  });

  it("blocks checkout until all required boxes are checked", () => {
    const required = proofConsentRequiredIds("personalized");
    expect(isProofConsentComplete(required, new Set(["commerce_not_verification"]))).toBe(false);
    expect(
      isProofConsentComplete(
        required,
        new Set(["commerce_not_verification", "bearer_not_ownership", "persistence_revocable"])
      )
    ).toBe(true);
    expect(canProceedToCheckout(true, required, new Set(["commerce_not_verification"]))).toBe(
      false
    );
    expect(
      canProceedToCheckout(
        true,
        required,
        new Set(["commerce_not_verification", "bearer_not_ownership", "persistence_revocable"])
      )
    ).toBe(true);
  });

  it("returns status copy for preview and approved states", () => {
    expect(proofConsentStatusMessage("personalized", true, new Set())).toContain("Confirm each");
    expect(
      proofConsentStatusMessage(
        "personalized",
        true,
        new Set(proofConsentRequiredIds("personalized"))
      )
    ).toContain("Proof approved");
    expect(PROOF_CONSENT_COPY.persistence_revocable.label).toMatch(/Printed ink persists/i);
  });
});
