import { describe, expect, it } from "vitest";

import { composeChildObjectScanState } from "../src/live-object/compose-child-object-scan";
import { defaultSeason } from "../src/city-game/season-loader";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

describe("composeChildObjectScanState (Order 4 — time + stream pipeline)", () => {
  it("applies time_policy schedule public_state after stream overlays", () => {
    const composed = composeChildObjectScanState({
      child: {
        object_id: "obj_status_plate_compose1",
        parent_profile_id: PROFILE,
        object_type: "status_plate",
        public_label: "Studio door",
        public_state: "Open",
        status: "active",
        child_object_document_json: JSON.stringify({
          time_policy: {
            timezone: "UTC",
            schedule: [
              {
                local_hour_from: 0,
                local_hour_until: 24,
                public_state: "Open until 9 PM",
              },
            ],
          },
        }),
        created_at: "2026-05-16T17:00:00Z",
        updated_at: "2026-05-16T17:00:00Z",
      },
      season: defaultSeason(),
      env: { CITY_GAME_ENABLED: "1" },
      now: new Date("2026-06-15T14:00:00.000Z"),
    });

    expect(composed.publicState).toBe("Open until 9 PM");
    expect(composed.childTimePolicy?.phase).toBe("active");
  });

  it("composes game node streams with bulletin schedule during season window", () => {
    const season = defaultSeason();
    const composed = composeChildObjectScanState({
      child: {
        object_id: "obj_cr_node_01_newbo",
        parent_profile_id: PROFILE,
        object_type: "game_node",
        public_label: "NewBo relay arch",
        public_state: "Red team holds the relay",
        status: "active",
        child_object_document_json: JSON.stringify({
          object_type: "game_node",
          season_id: season.season_id,
          node_role: "relay_gate",
          district: "newbo",
          object_streams: [
            { id: "care", class: "care", label: "Site", value: "Clear" },
            { id: "bulletin", class: "narrative", label: "Bulletin", value: "Awaiting" },
          ],
          game_meta: {
            visible_until: null,
            compromised: false,
            collective_progress: null,
            collective_target: null,
            unlocked_by: [],
            vouch_requires: [],
            vouch_active_for: [],
            scarcity_remaining: null,
            fragment_id: null,
          },
        }),
        created_at: "2026-06-01T12:00:00.000Z",
        updated_at: "2026-06-01T12:05:00.000Z",
      },
      season,
      env: { CITY_GAME_ENABLED: "1" },
      now: new Date("2026-06-07T00:00:00-05:00"),
    });

    expect(composed.gameNode?.mode).toBe("game");
    const bulletin = composed.objectStreams.find((s) => s.id === "bulletin");
    expect(bulletin?.value).not.toBe("Awaiting");
    expect(bulletin?.value.length).toBeGreaterThan(3);
  });

  it("preserves care pause without bulletin overlay", () => {
    const season = defaultSeason();
    const composed = composeChildObjectScanState({
      child: {
        object_id: "obj_cr_node_01_newbo",
        parent_profile_id: PROFILE,
        object_type: "game_node",
        public_label: "NewBo relay arch",
        public_state: "Maintenance",
        status: "active",
        child_object_document_json: JSON.stringify({
          object_type: "game_node",
          season_id: season.season_id,
          node_role: "relay_gate",
          district: "newbo",
          object_streams: [
            { id: "care", class: "care", label: "Site", value: "Closed for maintenance" },
            { id: "bulletin", class: "narrative", label: "Bulletin", value: "Stored" },
          ],
          game_meta: {
            visible_until: null,
            compromised: false,
            collective_progress: null,
            collective_target: null,
            unlocked_by: [],
            vouch_requires: [],
            vouch_active_for: [],
            scarcity_remaining: null,
            fragment_id: null,
          },
        }),
        created_at: "2026-06-01T12:00:00.000Z",
        updated_at: "2026-06-01T12:05:00.000Z",
      },
      season,
      env: { CITY_GAME_ENABLED: "1" },
      now: new Date("2026-06-07T00:00:00-05:00"),
    });

    expect(composed.gameNode?.mode).toBe("care_pause");
    expect(composed.objectStreams.find((s) => s.id === "bulletin")?.value).toBe("Stored");
  });
});
