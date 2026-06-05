import { describe, expect, it } from "vitest";
import { STEWARD_ROOM_DOORS, STEWARD_ROOM_SEASON } from "../../site/js/steward-active-room-core.mjs";
import {
  GAME_SEASON_SETUP_PANEL_ID,
  shouldShowGameSeasonSetupPanel,
} from "../../site/js/created-game-season-setup-panel.mjs";
import { SELF_SERVE_SETUP_ANCHOR } from "../../site/js/city-game-terminal-mint-deprecation-core.mjs";

describe("created-game-season-setup-panel", () => {
  it("shows operator console for game season roots in Season skin", () => {
    expect(
      shouldShowGameSeasonSetupPanel(
        {
          pilot_template: "general",
          issuer_public_key: "abc",
        },
        { activeRoom: STEWARD_ROOM_SEASON, profileId: "p1" }
      )
    ).toBe(true);
  });

  it("hides setup on Doors skin even for season roots", () => {
    expect(
      shouldShowGameSeasonSetupPanel(
        {
          pilot_template: "general",
          issuer_public_key: "abc",
        },
        { activeRoom: STEWARD_ROOM_DOORS, profileId: "p1" }
      )
    ).toBe(false);
    expect(
      shouldShowGameSeasonSetupPanel({ pilot_template: "general" }, {
        activeRoom: STEWARD_ROOM_DOORS,
        profileId: "p1",
      })
    ).toBe(false);
  });

  it("shows setup path for season manifesto root without organizer key yet", () => {
    expect(
      shouldShowGameSeasonSetupPanel(
        {
          pilot_template: "general",
          manifesto_line: "City game season spring-2026",
        },
        { activeRoom: STEWARD_ROOM_SEASON, profileId: "p1" }
      )
    ).toBe(true);
  });

  it("hides setup for non-general pilots", () => {
    expect(shouldShowGameSeasonSetupPanel({ pilot_template: "status_plate" })).toBe(false);
  });

  it("exports stable panel id and self-serve anchor on Manage", () => {
    expect(GAME_SEASON_SETUP_PANEL_ID).toBe("game-season-setup");
    expect(SELF_SERVE_SETUP_ANCHOR).toBe("#child-object-add-game-node");
  });
});
