/**
 * @param {string[]} argv
 * @returns {{ fast: boolean }}
 */
export function resolveWsLiveVerifyMode(argv = []) {
  return {
    fast: argv.includes("--fast"),
  };
}
