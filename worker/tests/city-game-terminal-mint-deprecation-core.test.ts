import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadSeasonJsonFile } from "../../site/js/city-game-season-path-core.mjs";
import {
  assessTerminalMintCliAccess,
  formatSeasonSetupNextSteps,
  isPilotTerminalMintSeason,
  seasonUsesSelfServeSetup,
  terminalMintAudience,
  terminalMintDeprecationUiCopy,
} from "../../site/js/city-game-terminal-mint-deprecation-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("city-game-terminal-mint-deprecation-core", () => {
  const crSeason = loadSeasonJsonFile(root, "city-game-cr-season-01.json");
  const exampleSeason = loadSeasonJsonFile(root, "city-game-example-season-01.json");

  it("classifies Cedar Rapids as pilot terminal mint", () => {
    expect(isPilotTerminalMintSeason(crSeason)).toBe(true);
    expect(seasonUsesSelfServeSetup(crSeason)).toBe(false);
    expect(terminalMintAudience(crSeason)).toBe("pilot");
  });

  it("classifies example template as self-serve", () => {
    expect(isPilotTerminalMintSeason(exampleSeason)).toBe(false);
    expect(seasonUsesSelfServeSetup(exampleSeason)).toBe(true);
    expect(terminalMintAudience(exampleSeason)).toBe("self_serve");
  });

  it("honors pilot_terminal_mint override on season JSON", () => {
    expect(
      isPilotTerminalMintSeason({ ...exampleSeason, pilot_terminal_mint: true })
    ).toBe(true);
    expect(
      seasonUsesSelfServeSetup({ ...exampleSeason, pilot_terminal_mint: false })
    ).toBe(true);
  });

  it("blocks mint-node for self-serve seasons without force", () => {
    const blocked = assessTerminalMintCliAccess({
      season: exampleSeason,
      scriptName: "city-game:mint-node",
      force: false,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.blockMessage).toMatch(/\/created\//);
    expect(blocked.notice).toMatch(/deprecated/i);
  });

  it("allows pilot season and forced self-serve runs", () => {
    expect(
      assessTerminalMintCliAccess({
        season: crSeason,
        scriptName: "city-game:mint-node",
        force: false,
      }).allowed
    ).toBe(true);
    expect(
      assessTerminalMintCliAccess({
        season: exampleSeason,
        scriptName: "city-game:mint-node",
        force: true,
      }).allowed
    ).toBe(true);
  });

  it("exposes product copy and next-step helpers", () => {
    const ui = terminalMintDeprecationUiCopy();
    expect(ui.title).toMatch(/browser setup/i);
    expect(ui.body).toMatch(/mint-node/);
    expect(formatSeasonSetupNextSteps({ pilot: true })).toMatch(/city-game:mint-node/);
    expect(formatSeasonSetupNextSteps({ selfServe: true, pilot: false })).toMatch(/\/created\//);
  });
});
