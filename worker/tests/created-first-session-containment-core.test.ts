import { describe, expect, it } from "vitest";

import {
  beginFirstControlSession,
  hasControlVisited,
  isFirstControlSessionActive,
  shouldHideRoomSwitcherForFirstSession,
  shouldHideSetupMemoryProtectChip,
  shouldSuppressPilotScorecards,
} from "../../site/js/created-first-session-containment-core.mjs";

function makeStorage() {
  const storage = new Map<string, string>();
  return {
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storage.set(key, String(value));
    },
  };
}

describe("created-first-session-containment-core", () => {
  it("flags first control session until revisit", () => {
    const local = makeStorage();
    const session = makeStorage();
    const profileId = "prof_first";

    expect(hasControlVisited(profileId, local)).toBe(false);
    expect(beginFirstControlSession(profileId, session, local)).toBe(true);
    expect(isFirstControlSessionActive(profileId, session)).toBe(true);
    expect(shouldHideRoomSwitcherForFirstSession(profileId, session)).toBe(true);
    expect(shouldHideSetupMemoryProtectChip(profileId, session)).toBe(true);
    expect(shouldSuppressPilotScorecards(profileId, session)).toBe(true);

    expect(beginFirstControlSession(profileId, makeStorage(), local)).toBe(false);
    expect(hasControlVisited(profileId, local)).toBe(true);
  });
});
