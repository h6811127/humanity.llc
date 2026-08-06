import { describe, expect, it } from "vitest";

import {
  GAME_FACTIONS,
  GAME_FACTION_NEUTRAL,
  factionControllerLabel,
  factionRelayStatusLabel,
  isGameFaction,
  isGameFactionHold,
} from "../src/city-game/factions";

describe("isGameFaction / isGameFactionHold", () => {
  it("accepts the four Signal War faction ids", () => {
    for (const faction of GAME_FACTIONS) {
      expect(isGameFaction(faction)).toBe(true);
      expect(isGameFactionHold(faction)).toBe(true);
    }
  });

  it("treats neutral as a hold state but not a capture faction", () => {
    expect(isGameFaction(GAME_FACTION_NEUTRAL)).toBe(false);
    expect(isGameFactionHold(GAME_FACTION_NEUTRAL)).toBe(true);
  });

  it("rejects unknown, empty, and nullish hold values", () => {
    expect(isGameFaction("purple")).toBe(false);
    expect(isGameFaction("Red")).toBe(false);
    expect(isGameFactionHold("")).toBe(false);
    expect(isGameFactionHold(null)).toBe(false);
    expect(isGameFactionHold(undefined)).toBe(false);
  });
});

describe("faction public labels", () => {
  it("labels controllers and unclaimed relays for scan/board copy", () => {
    expect(factionControllerLabel("red")).toBe("Red team");
    expect(factionControllerLabel("blue")).toBe("Blue team");
    expect(factionControllerLabel("green")).toBe("Green team");
    expect(factionControllerLabel("yellow")).toBe("Yellow team");
    expect(factionControllerLabel("neutral")).toBe("Unclaimed");
    expect(factionControllerLabel(null)).toBe("Unclaimed");
    expect(factionControllerLabel(undefined)).toBe("Unclaimed");
  });

  it("formats relay status chips for held vs open relays", () => {
    expect(factionRelayStatusLabel("red")).toBe("Held · Red team");
    expect(factionRelayStatusLabel("neutral")).toBe("Open · unclaimed");
    expect(factionRelayStatusLabel(null)).toBe("Open · unclaimed");
  });
});
