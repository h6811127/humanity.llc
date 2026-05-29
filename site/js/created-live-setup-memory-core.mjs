/**
 * Read-only setup progress chips on Live tab (T4 · Phase 2 Protect).
 * @see docs/CREATED_TASKS_TAB_REDESIGN.md · docs/OWNERSHIP_RESTORE_UX_PLAN.md
 */

/**
 * @param {{
 *   walletSaved: boolean,
 *   printDone: boolean,
 *   testScanDone: boolean,
 *   protectDone: boolean,
 *   setupComplete: boolean,
 * }} input
 * @returns {{ save: boolean, print: boolean, test: boolean, protect: boolean, live: boolean }}
 */
export function resolveLiveSetupMemory(input) {
  return {
    save: input.walletSaved,
    print: input.printDone,
    test: input.testScanDone,
    protect: input.protectDone,
    live: input.setupComplete,
  };
}

/**
 * @param {{ save: boolean, print: boolean, test: boolean, protect: boolean, live: boolean }} memory
 */
export function liveSetupMemoryKicker(memory) {
  const values = [memory.save, memory.print, memory.test, memory.protect, memory.live];
  const doneCount = values.filter(Boolean).length;
  if (doneCount === values.length) {
    return "You already finished setup";
  }
  if (doneCount === 0) {
    return "Your setup progress";
  }
  return "Setup progress on this card";
}
