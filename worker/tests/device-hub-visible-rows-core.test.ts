import { describe, expect, it } from "vitest";

import {
  orderEntriesVisibleFirst,
  profileIdsWithVisibleRows,
} from "../../site/js/device-hub-visible-rows-core.mjs";

const PROFILE_A = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const PROFILE_B = "7Xk9mP2nQ4rT6vW8yZ1aB3cD6";

describe("profileIdsWithVisibleRows", () => {
  it("returns ids intersecting viewport", () => {
    const ids = profileIdsWithVisibleRows(
      [
        { profileId: PROFILE_A, top: 10, bottom: 50 },
        { profileId: PROFILE_B, top: 200, bottom: 240 },
      ],
      { top: 0, bottom: 100 }
    );
    expect(ids).toEqual([PROFILE_A]);
  });
});

describe("orderEntriesVisibleFirst", () => {
  it("moves visible profiles before others", () => {
    const entries = [
      { profile_id: PROFILE_B },
      { profile_id: PROFILE_A },
    ];
    expect(
      orderEntriesVisibleFirst(entries, [PROFILE_A]).map((e) => e.profile_id)
    ).toEqual([PROFILE_A, PROFILE_B]);
  });

  it("returns original order when none visible", () => {
    const entries = [{ profile_id: PROFILE_A }];
    expect(orderEntriesVisibleFirst(entries, [])).toEqual(entries);
  });
});
