/**
 * Proof and consent before checkout — SF-003 / Storefront SF-FR-15.
 * See docs/features/Storefront v1.0.md § 10.2.
 */

/** @typedef {"personalized" | "tier0"} ProofConsentProfile */

export const PROOF_CONSENT_COPY = {
  commerce_not_verification: {
    label: "Buying this merch does not verify me or grant a vouch.",
  },
  bearer_not_ownership: {
    label:
      "A printed QR is a pointer — holding the object does not prove I own the Humanity Card.",
  },
  persistence_revocable: {
    label:
      "Printed ink persists. I can revoke this item's QR from my phone, but strangers may still scan old ink until I do.",
  },
  batch_qr_pointer: {
    label:
      "This sticker uses a batch campaign QR — it points at live status, not proof that I hold a card.",
  },
};

/** @type {Record<ProofConsentProfile, string[]>} */
export const PROOF_CONSENT_REQUIRED_IDS = {
  personalized: ["commerce_not_verification", "bearer_not_ownership", "persistence_revocable"],
  tier0: ["commerce_not_verification", "bearer_not_ownership", "batch_qr_pointer"],
};

/**
 * @param {ProofConsentProfile} profile
 */
export function proofConsentRequiredIds(profile) {
  return PROOF_CONSENT_REQUIRED_IDS[profile] ?? PROOF_CONSENT_REQUIRED_IDS.personalized;
}

/**
 * @param {string[]} requiredIds
 * @param {Set<string> | Iterable<string>} checkedIds
 */
export function isProofConsentComplete(requiredIds, checkedIds) {
  const checked = checkedIds instanceof Set ? checkedIds : new Set(checkedIds);
  return requiredIds.every((id) => checked.has(id));
}

/**
 * @param {boolean} checkoutReady
 * @param {string[]} requiredIds
 * @param {Set<string> | Iterable<string>} checkedIds
 */
export function canProceedToCheckout(checkoutReady, requiredIds, checkedIds) {
  return Boolean(checkoutReady) && isProofConsentComplete(requiredIds, checkedIds);
}

/**
 * @param {ParentNode | Document | null | undefined} root
 * @param {string[]} requiredIds
 */
export function readProofConsentState(root, requiredIds) {
  /** @type {Set<string>} */
  const checked = new Set();
  if (!root) return checked;
  for (const id of requiredIds) {
    const input = root.querySelector(`[data-proof-consent="${id}"]`);
    if (input instanceof HTMLInputElement && input.checked) {
      checked.add(id);
    }
  }
  return checked;
}

/**
 * @param {ProofConsentProfile} profile
 * @param {boolean} checkoutReady
 * @param {Set<string> | Iterable<string>} checkedIds
 */
export function proofConsentStatusMessage(profile, checkoutReady, checkedIds) {
  const requiredIds = proofConsentRequiredIds(profile);
  if (!checkoutReady) {
    return profile === "tier0"
      ? "Confirm the limits below before checkout opens."
      : "Preview ready. Confirm each line below when checkout is live.";
  }
  if (isProofConsentComplete(requiredIds, checkedIds)) {
    return profile === "tier0"
      ? "Limits confirmed. Continue to secure checkout when ready."
      : "Proof approved. Continue to checkout when you are ready.";
  }
  return "Confirm each acknowledgment below to continue.";
}
