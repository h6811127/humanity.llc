import { describe, expect, it } from "vitest";
import { GAME_SEASON_SETUP_FOCUS } from "../../site/js/create-organizer-season-core.mjs";
import {
  GAME_SEASON_SETUP_HERO_LEAD,
  GAME_SEASON_SETUP_HERO_TITLE,
  GAME_SEASON_SETUP_SCROLL_TARGET_ID,
} from "../../site/js/created-game-season-setup-focus.mjs";

describe("created-game-season-setup-focus", () => {
  it("exports season setup landing copy distinct from generic control hero", () => {
    expect(GAME_SEASON_SETUP_HERO_TITLE).toBe("Set up your live season");
    expect(GAME_SEASON_SETUP_HERO_TITLE).not.toBe("Your object is live");
    expect(GAME_SEASON_SETUP_HERO_LEAD).toMatch(/checkpoints/i);
  });

  it("scroll target is the self-serve setup checklist panel", () => {
    expect(GAME_SEASON_SETUP_SCROLL_TARGET_ID).toBe("child-object-game-node-setup");
  });

  it("create handoff uses focus=game-season-setup deep link", () => {
    const params = new URLSearchParams(
      `focus=${GAME_SEASON_SETUP_FOCUS}&room=season&profile_id=p1`
    );
    expect(params.get("focus")).toBe("game-season-setup");
    expect(params.get("room")).toBe("season");
  });
});
