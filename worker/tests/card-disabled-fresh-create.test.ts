/**
 * P0b-1: card-disabled-since-visit false positive on fresh create (R10).
 * @see docs/SAFARI_KEYS_CUSTODY.md rollout step 8
 */
import { describe, expect, it } from "vitest";

import { mergeLastSeenFromNetworkMap } from "../../site/js/device-wallet-network-core.mjs";
import {
  CARD_REVOKED_ALERT_STATE,
  cardDisabledSinceVisitVisible,
  isRevokedSinceLastVisitFromBaseline,
} from "../../site/js/wallet-network-baseline.mjs";

describe("fresh create since-visit baseline (P0b-1)", () => {
  it("does not seed baseline on in-visit poll when profile has no prior baseline", () => {
    expect(
      mergeLastSeenFromNetworkMap({ freshCard: "active" }, {})
    ).toEqual({});
    expect(
      mergeLastSeenFromNetworkMap({ freshCard: CARD_REVOKED_ALERT_STATE }, {})
    ).toEqual({});
  });

  it("still updates baseline when a prior baseline exists", () => {
    expect(
      mergeLastSeenFromNetworkMap(
        { saved: "active" },
        { saved: "active" }
      )
    ).toEqual({ saved: "active" });
  });

  it("never shows since-visit banner without a prior device baseline", () => {
    expect(
      isRevokedSinceLastVisitFromBaseline(null, CARD_REVOKED_ALERT_STATE)
    ).toBe(false);
    expect(
      cardDisabledSinceVisitVisible(
        CARD_REVOKED_ALERT_STATE,
        null,
        "card_revoked",
        true
      )
    ).toBe(false);
  });

  it("shows since-visit after a prior visit baseline was recorded", () => {
    expect(
      cardDisabledSinceVisitVisible(
        CARD_REVOKED_ALERT_STATE,
        "active",
        "card_revoked",
        true
      )
    ).toBe(true);
  });
});
