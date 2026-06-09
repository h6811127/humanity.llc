import { describe, expect, it } from "vitest";

import {
  resolveWearTrackChoice,
  WEAR_TRACK_BYOP,
  WEAR_TRACK_FULFILLED,
  wearTrackRequiresCreateForm,
} from "../../site/js/create-wear-track-chooser-core.mjs";

describe("resolveWearTrackChoice", () => {
  it("prefers query param over session storage", () => {
    const storage = {
      getItem: () => WEAR_TRACK_FULFILLED,
      setItem: () => {},
    };
    expect(
      resolveWearTrackChoice({
        searchParams: new URLSearchParams("wear_track=byop"),
        storage,
      })
    ).toBe(WEAR_TRACK_BYOP);
  });

  it("falls back to persisted track", () => {
    const storage = {
      getItem: () => WEAR_TRACK_BYOP,
      setItem: () => {},
    };
    expect(
      resolveWearTrackChoice({
        searchParams: new URLSearchParams("intent=wear"),
        storage,
      })
    ).toBe(WEAR_TRACK_BYOP);
  });
});

describe("wearTrackRequiresCreateForm", () => {
  it("requires BYOP track for create form", () => {
    expect(wearTrackRequiresCreateForm(WEAR_TRACK_BYOP)).toBe(true);
    expect(wearTrackRequiresCreateForm(WEAR_TRACK_FULFILLED)).toBe(false);
    expect(wearTrackRequiresCreateForm(null)).toBe(false);
  });
});
