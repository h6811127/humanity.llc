/**
 * Defer /created/ verification + steward surfaces until resolver poll confirms.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-9
 */

export const CREATED_VERIFICATION_CHECKING_LABEL = "Checking…";
export const CREATED_VERIFICATION_CHECKING_SUB = "Confirming with the network…";

/**
 * @param {boolean} pollConfirmed first successful GET .../status completed
 */
export function shouldDeferCreatedStewardSurfacesUntilPoll(pollConfirmed) {
  return !pollConfirmed;
}

/**
 * @param {string | null | undefined} verificationState
 * @param {boolean} pollConfirmed
 */
export function shouldShowCreatedStewardReviewQueue(verificationState, pollConfirmed) {
  if (!pollConfirmed) return false;
  return verificationState === "steward";
}

/**
 * Icon input that avoids inferring steward/green from session label before poll.
 * @param {{ label?: string | null, subtitle?: string | null, state?: string | null }} ht
 * @param {{ state?: string | null } | null | undefined} verification
 * @param {boolean} pollConfirmed
 */
export function createdHumanTrustIconInput(ht, verification, pollConfirmed) {
  if (!pollConfirmed) {
    return {
      label: CREATED_VERIFICATION_CHECKING_LABEL,
      subtitle: null,
      state: null,
    };
  }
  return {
    label: ht?.label ?? null,
    subtitle: ht?.subtitle ?? null,
    state: verification?.state ?? null,
  };
}

/**
 * @param {boolean} pollConfirmed
 * @param {{ label?: string | null, subtitle?: string | null } | null | undefined} ht
 */
export function createdHumanTrustCopyBeforePoll(pollConfirmed, ht) {
  if (pollConfirmed && ht) {
    return {
      label: ht.label ?? CREATED_VERIFICATION_CHECKING_LABEL,
      subtitle: ht.subtitle ?? CREATED_VERIFICATION_CHECKING_SUB,
    };
  }
  return {
    label: CREATED_VERIFICATION_CHECKING_LABEL,
    subtitle: CREATED_VERIFICATION_CHECKING_SUB,
  };
}
