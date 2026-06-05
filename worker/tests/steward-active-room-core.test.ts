import { describe, expect, it } from "vitest";

import { GAME_SEASON_SETUP_FOCUS } from "../../site/js/create-organizer-season-core.mjs";
import { WEAR_PRINT_FOCUS } from "../../site/js/create-wear-wizard-core.mjs";
import {
  STEWARD_ROOM_DOORS,
  STEWARD_ROOM_SEASON,
  STEWARD_ROOM_WEAR,
  bindStewardActiveRoomRuntime,
  readPersistedStewardActiveRoom,
  resolveInitialStewardActiveRoom,
  stewardPresentationExtras,
  stewardRoomCrosshint,
  writePersistedStewardActiveRoom,
} from "../../site/js/steward-active-room-core.mjs";

class MemoryStorage {
  /** @type {Map<string, string>} */
  #map = new Map();
  getItem(key: string) {
    return this.#map.has(key) ? this.#map.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.#map.set(key, value);
  }
}

describe("resolveInitialStewardActiveRoom", () => {
  it("maps focus params to rooms", () => {
    expect(
      resolveInitialStewardActiveRoom({
        searchParams: new URLSearchParams(`focus=${GAME_SEASON_SETUP_FOCUS}`),
      })
    ).toBe(STEWARD_ROOM_SEASON);
    expect(
      resolveInitialStewardActiveRoom({
        searchParams: new URLSearchParams(`focus=${WEAR_PRINT_FOCUS}`),
      })
    ).toBe(STEWARD_ROOM_WEAR);
    expect(
      resolveInitialStewardActiveRoom({
        searchParams: new URLSearchParams("room=doors"),
      })
    ).toBe(STEWARD_ROOM_DOORS);
  });

  it("reads persisted room per profile", () => {
    const storage = new MemoryStorage();
    writePersistedStewardActiveRoom("prof_1", STEWARD_ROOM_SEASON, storage as unknown as Storage);
    expect(
      resolveInitialStewardActiveRoom({
        profileId: "prof_1",
        storage: storage as unknown as Storage,
      })
    ).toBe(STEWARD_ROOM_SEASON);
  });

  it("infers season from custody session when no persisted room", () => {
    expect(
      resolveInitialStewardActiveRoom({
        session: {
          pilot_template: "general",
          manifesto_line: "City game season spring-2026",
        },
      })
    ).toBe(STEWARD_ROOM_SEASON);
  });
});

describe("stewardPresentationExtras", () => {
  it("prefers bound runtime room", () => {
    bindStewardActiveRoomRuntime("prof_bound", STEWARD_ROOM_SEASON);
    expect(stewardPresentationExtras("prof_bound").activeRoom).toBe(STEWARD_ROOM_SEASON);
  });

  it("falls back without forcing doors when unbound", () => {
    bindStewardActiveRoomRuntime("prof_unbound", STEWARD_ROOM_DOORS);
    bindStewardActiveRoomRuntime("prof_other", STEWARD_ROOM_SEASON);
    expect(stewardPresentationExtras("prof_unbound_xyz").activeRoom).toBeUndefined();
  });
});

describe("stewardRoomCrosshint", () => {
  it("offers switch to Doors from Season skin", () => {
    const hint = stewardRoomCrosshint(STEWARD_ROOM_SEASON, { pilot_template: "general" });
    expect(hint?.switchRoom).toBe(STEWARD_ROOM_DOORS);
    expect(hint?.body).toMatch(/Doors/i);
  });

  it("offers switch to Season when deploy skin on season root", () => {
    const hint = stewardRoomCrosshint(STEWARD_ROOM_DOORS, {
      pilot_template: "general",
      manifesto_line: "City game season spring-2026",
    });
    expect(hint?.switchRoom).toBe(STEWARD_ROOM_SEASON);
  });
});

describe("persistence", () => {
  it("round-trips active room", () => {
    const storage = new MemoryStorage();
    writePersistedStewardActiveRoom("p", STEWARD_ROOM_WEAR, storage as unknown as Storage);
    expect(readPersistedStewardActiveRoom("p", storage as unknown as Storage)).toBe(
      STEWARD_ROOM_WEAR
    );
  });
});
