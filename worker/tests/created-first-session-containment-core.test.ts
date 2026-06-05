import { describe, expect, it } from "vitest";

import {
  beginFirstControlSession,
  CONTROL_VISITED_STORAGE_KEY_PREFIX,
  FIRST_CONTROL_SESSION_KEY_PREFIX,
  hasControlVisited,
  isFirstControlSessionActive,
  markControlVisited,
  shouldHideRoomSwitcherForFirstSession,
  shouldHideSetupMemoryProtectChip,
  shouldSuppressPilotScorecards,
} from "../../site/js/created-first-session-containment-core.mjs";

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("created-first-session-containment-core", () => {
  it("marks first control visit once and flags tab session", () => {
    const local = memoryStorage();
    const session = memoryStorage();
    const profileId = "prof_first";

    expect(hasControlVisited(profileId, local)).toBe(false);
    expect(beginFirstControlSession(profileId, session, local)).toBe(true);
    expect(hasControlVisited(profileId, local)).toBe(true);
    expect(isFirstControlSessionActive(profileId, session)).toBe(true);
    expect(shouldHideRoomSwitcherForFirstSession(profileId, session)).toBe(true);
    expect(shouldHideSetupMemoryProtectChip(profileId, session)).toBe(true);
    expect(shouldSuppressPilotScorecards(profileId, session)).toBe(true);

    expect(beginFirstControlSession(profileId, session, local)).toBe(true);
    expect(session.getItem(`${FIRST_CONTROL_SESSION_KEY_PREFIX}${profileId}`)).toBe("1");
  });

  it("skips containment on returning control visits", () => {
    const local = memoryStorage();
    const session = memoryStorage();
    const profileId = "prof_return";
    markControlVisited(profileId, local);

    expect(beginFirstControlSession(profileId, session, local)).toBe(false);
    expect(isFirstControlSessionActive(profileId, session)).toBe(false);
    expect(shouldSuppressPilotScorecards(profileId, session)).toBe(false);
    expect(local.getItem(`${CONTROL_VISITED_STORAGE_KEY_PREFIX}${profileId}`)).toBe("1");
  });
});
