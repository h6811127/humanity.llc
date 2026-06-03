/**
 * CLI guard for deprecated terminal mint on self-serve seasons.
 */

import {
  assessTerminalMintCliAccess,
} from "../../site/js/city-game-terminal-mint-deprecation-core.mjs";

/**
 * @param {{
 *   season: Record<string, unknown>;
 *   scriptName: string;
 *   argv?: string[];
 * }} input
 * @returns {boolean} allowed
 */
export function guardTerminalMintScript(input) {
  const argv = input.argv ?? process.argv;
  const force = argv.includes("--force") || argv.includes("--ci");
  const result = assessTerminalMintCliAccess({
    season: input.season,
    scriptName: input.scriptName,
    force,
    ci: argv.includes("--ci"),
  });

  if (result.notice) {
    console.warn(`\n${result.notice}\n`);
  }
  if (!result.allowed) {
    console.error(result.blockMessage ?? "Terminal mint blocked for this season.");
    process.exit(1);
  }
  return true;
}
