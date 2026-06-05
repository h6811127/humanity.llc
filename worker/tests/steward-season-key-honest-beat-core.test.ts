import { describe, expect, it } from "vitest";

import {
  consumeSeasonKeyHonestBeatPending,
  readSeasonKeyHonestBeatDismissed,
  seasonKeyHonestBeatBody,
  seasonKeyHonestBeatTitle,
  shouldShowSeasonKeyHonestBeat,
  writeSeasonKeyHonestBeatDismissed,
} from "../../site/js/steward-season-key-honest-beat-core.mjs";

function makeStorage() {
  const storage = new Map<string, string>();
  return {
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storage.set(key, String(value));
    },
    removeItem(key: string) {
      storage.delete(key);
    },
  };
}

describe("shouldShowSeasonKeyHonestBeat", () => {
  it("shows for dual-skin deploy manifesto with issuer key", () => {
    expect(
      shouldShowSeasonKeyHonestBeat({
        pilot_template: "general",
        manifesto_line: "Live objects · @river_studio",
        issuer_public_key: "org_pub",
      })
    ).toBe(true);
  });

  it("hides for season-only manifesto roots", () => {
    expect(
      shouldShowSeasonKeyHonestBeat({
        pilot_template: "general",
        manifesto_line: "City game season · cr_01 · @river",
        issuer_public_key: "org_pub",
      })
    ).toBe(false);
  });

  it("hides when dismissed", () => {
    expect(
      shouldShowSeasonKeyHonestBeat(
        {
          pilot_template: "general",
          manifesto_line: "Live objects · @river_studio",
          issuer_public_key: "org_pub",
        },
        null,
        { dismissed: true }
      )
    ).toBe(false);
  });
});

describe("honest beat storage", () => {
  it("tracks dismiss and pending room apply", () => {
    const storage = makeStorage();
    expect(readSeasonKeyHonestBeatDismissed("p1", storage)).toBe(false);
    writeSeasonKeyHonestBeatDismissed("p1", storage);
    expect(readSeasonKeyHonestBeatDismissed("p1", storage)).toBe(true);

    storage.setItem("hc_season_key_honest_beat_pending:p2", "1");
    expect(consumeSeasonKeyHonestBeatPending("p2", storage)).toBe(true);
    expect(consumeSeasonKeyHonestBeatPending("p2", storage)).toBe(false);
  });
});

describe("honest beat copy", () => {
  it("uses plain language from the target spec", () => {
    expect(seasonKeyHonestBeatTitle()).toContain("season operator key");
    expect(seasonKeyHonestBeatBody()).toContain("door plates");
  });
});
