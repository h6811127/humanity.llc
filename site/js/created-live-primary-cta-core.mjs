/**
 * Contextual primary CTA on /created/ Live object card (T3).
 * @see docs/CREATED_TASKS_TAB_REDESIGN.md
 */

/** @typedef {"prove-live" | "save-keys" | "test-scan" | "check-network" | "open-scan"} CreatedLivePrimaryMode */

/**
 * @param {{
 *   liveProofPending: boolean,
 *   hasSigningKeys: boolean,
 *   walletSaved: boolean,
 *   resolverReachable: boolean,
 *   testScanDone: boolean,
 *   scanUrlReady: boolean,
 * }} input
 * @returns {{ mode: CreatedLivePrimaryMode, label: string, subtitle: string }}
 */
export function resolveCreatedLivePrimaryCta(input) {
  if (input.liveProofPending && input.hasSigningKeys) {
    return {
      mode: "prove-live",
      label: "Prove control now",
      subtitle: "Someone is waiting at your QR",
    };
  }
  if (input.hasSigningKeys && !input.walletSaved) {
    return {
      mode: "save-keys",
      label: "Save ownership on this device",
      subtitle: "Required to manage and revoke later",
    };
  }
  if (!input.resolverReachable) {
    return {
      mode: "check-network",
      label: "Check network",
      subtitle: "Updates may fail until back",
    };
  }
  if (!input.testScanDone && input.scanUrlReady) {
    return {
      mode: "test-scan",
      label: "Test scan",
      subtitle: "Preview what finders see",
    };
  }
  return {
    mode: "open-scan",
    label: "Open scan page",
    subtitle: "See your live object as strangers do",
  };
}
