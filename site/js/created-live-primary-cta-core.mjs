/**
 * Contextual primary CTA on /created/ Live object card (T3).
 * @see docs/CREATED_TASKS_TAB_REDESIGN.md
 */

/** @typedef {"prove-live" | "save-keys" | "test-scan" | "check-network" | "update-status" | "open-scan"} CreatedLivePrimaryMode */

/**
 * @param {{
 *   liveProofPending: boolean,
 *   hasSigningKeys: boolean,
 *   walletSaved: boolean,
 *   resolverReachable: boolean,
 *   testScanDone: boolean,
 *   scanUrlReady: boolean,
 *   scannersSeeUnlocked?: boolean,
 *   autoSaveEnabled?: boolean,
 *   autoSaveFailed?: boolean,
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
    const autoSaveEnabled = input.autoSaveEnabled !== false;
    const suppressSaveNudge = autoSaveEnabled && !input.autoSaveFailed;
    if (!suppressSaveNudge) {
      return {
        mode: "save-keys",
        label: "Save ownership on this device",
        subtitle: "Required to manage and revoke later",
      };
    }
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
  if (
    input.scannersSeeUnlocked &&
    input.hasSigningKeys &&
    input.resolverReachable &&
    input.scanUrlReady
  ) {
    return {
      mode: "update-status",
      label: "Update what scanners see",
      subtitle: "Same QR — changes on the next scan",
    };
  }
  return {
    mode: "open-scan",
    label: "Open scan page",
    subtitle: "See your live object as strangers do",
  };
}
