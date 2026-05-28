/**
 * Read-only setup progress chips on Live tab (T4).
 * @see docs/CREATED_TASKS_TAB_REDESIGN.md
 */

/**
 * @param {{
 *   walletSaved: boolean,
 *   printDone: boolean,
 *   testScanDone: boolean,
 *   setupComplete: boolean,
 * }} input
 * @returns {{ save: boolean, print: boolean, test: boolean, live: boolean }}
 */
export function resolveLiveSetupMemory(input) {
  return {
    save: input.walletSaved,
    print: input.printDone,
    test: input.testScanDone,
    live: input.setupComplete,
  };
}

/**
 * @param {{ save: boolean, print: boolean, test: boolean, live: boolean }} memory
 */
export function liveSetupMemoryKicker(memory) {
  const values = [memory.save, memory.print, memory.test, memory.live];
  const doneCount = values.filter(Boolean).length;
  if (doneCount === values.length) {
    return "You already finished setup";
  }
  if (doneCount === 0) {
    return "Your setup progress";
  }
  return "Setup progress on this card";
}
