import { describe, expect, it } from "vitest";
import {
  GAME_SEASON_SETUP_PANEL_ID,
  shouldShowGameSeasonSetupPanel,
} from "../../site/js/created-game-season-setup-panel.mjs";
import { SELF_SERVE_SETUP_ANCHOR } from "../../site/js/city-game-terminal-mint-deprecation-core.mjs";

describe("created-game-season-setup-panel", () => {
  it("shows operator console for game season roots", () => {
    expect(
      shouldShowGameSeasonSetupPanel({
        pilot_template: "general",
        issuer_public_key: "abc",
      })
    ).toBe(true);
  });

  it("shows setup path for general root without organizer key yet", () => {
    expect(shouldShowGameSeasonSetupPanel({ pilot_template: "general" })).toBe(true);
  });

  it("hides setup for non-general pilots", () => {
    expect(shouldShowGameSeasonSetupPanel({ pilot_template: "status_plate" })).toBe(false);
  });

  it("exports stable panel id and self-serve anchor on Manage", () => {
    expect(GAME_SEASON_SETUP_PANEL_ID).toBe("game-season-setup");
    expect(SELF_SERVE_SETUP_ANCHOR).toBe("#child-object-add-game-node");
  });
});
