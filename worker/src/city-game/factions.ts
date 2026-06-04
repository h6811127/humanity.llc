/** Signal War faction ids — public object state only (SW-03). */

export const GAME_FACTIONS = ["red", "blue", "green", "yellow"] as const;
export type GameFaction = (typeof GAME_FACTIONS)[number];
export const GAME_FACTION_NEUTRAL = "neutral" as const;
export type GameFactionHold = GameFaction | typeof GAME_FACTION_NEUTRAL;

const FACTION_DISPLAY: Record<GameFaction, string> = {
  red: "Red team",
  blue: "Blue team",
  green: "Green team",
  yellow: "Yellow team",
};

export function isGameFaction(value: string): value is GameFaction {
  return (GAME_FACTIONS as readonly string[]).includes(value);
}

export function isGameFactionHold(value: string | null | undefined): value is GameFactionHold {
  if (!value) return false;
  return isGameFaction(value) || value === GAME_FACTION_NEUTRAL;
}

export function factionControllerLabel(faction: GameFactionHold | null | undefined): string {
  if (!faction || faction === GAME_FACTION_NEUTRAL) return "Unclaimed";
  return FACTION_DISPLAY[faction];
}

export function factionRelayStatusLabel(faction: GameFactionHold | null | undefined): string {
  if (!faction || faction === GAME_FACTION_NEUTRAL) return "Open · unclaimed";
  return `Held · ${FACTION_DISPLAY[faction]}`;
}
