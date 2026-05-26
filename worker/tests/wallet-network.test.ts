import { describe, expect, it } from "vitest";

import {
  alertStateForNetworkPoll,
  alertStateFromScanKind,
  CARD_DISABLED_SINCE_VISIT_ALERT_TEXT,
  CARD_REVOKED_ALERT_STATE,
  cardDisabledSinceVisitVisible,
  listCardDisabledSinceVisit,
  isRevokedSinceLastVisitFromBaseline,
  normalizeBaselineState,
  shouldShowCardDisabledSinceVisitAlert,
} from "../../site/js/wallet-network-baseline.mjs";
import {
  mergeLastSeenFromNetworkMap,
  shouldUseCachedNetworkStatus,
  WALLET_NETWORK_CACHE_TTL_MS,
} from "../../site/js/device-wallet-network-core.mjs";

describe("card-disabled since-visit copy", () => {
  it("uses card-disabled wording, not generic revoked", () => {
    expect(CARD_DISABLED_SINCE_VISIT_ALERT_TEXT).toMatch(/card disabled/i);
    expect(CARD_DISABLED_SINCE_VISIT_ALERT_TEXT).not.toMatch(/revoked since last visit/i);
  });
});

describe("alertStateForNetworkPoll (DH-13)", () => {
  it("returns null for unreachable chip statuses", () => {
    expect(alertStateForNetworkPoll(null, "error")).toBe(null);
    expect(alertStateForNetworkPoll(null, "offline")).toBe(null);
    expect(alertStateForNetworkPoll("active", "checking")).toBe(null);
  });

  it("returns card_revoked or active only from resolver truth", () => {
    expect(alertStateForNetworkPoll("card_revoked", "active")).toBe(
      CARD_REVOKED_ALERT_STATE
    );
    expect(alertStateForNetworkPoll("active", "active")).toBe("active");
  });

  it("leaves baseline unchanged when poll omits alert state (failed fetch)", () => {
    const prior = { p1: "card_revoked" };
    const next = mergeLastSeenFromNetworkMap({}, prior);
    expect(next).toEqual(prior);
  });
});

describe("alertStateFromScanKind", () => {
  it("returns card_revoked only for card_revoked scan kind", () => {
    expect(alertStateFromScanKind("card_revoked", "active")).toBe(
      CARD_REVOKED_ALERT_STATE
    );
    expect(alertStateFromScanKind("qr_revoked", "active")).toBe("active");
    expect(alertStateFromScanKind("active", "revoked")).toBe("active");
  });
});

describe("isRevokedSinceLastVisitFromBaseline", () => {
  it("returns false when the network alert state is not card_revoked", () => {
    expect(isRevokedSinceLastVisitFromBaseline("active", "active")).toBe(false);
    expect(isRevokedSinceLastVisitFromBaseline("active", "qr_revoked")).toBe(
      false
    );
  });

  it("returns false with no prior baseline on this device", () => {
    expect(isRevokedSinceLastVisitFromBaseline(null, CARD_REVOKED_ALERT_STATE)).toBe(
      false
    );
    expect(isRevokedSinceLastVisitFromBaseline("", CARD_REVOKED_ALERT_STATE)).toBe(
      false
    );
  });

  it("returns true when last seen was active and network is now card_revoked", () => {
    expect(
      isRevokedSinceLastVisitFromBaseline("active", CARD_REVOKED_ALERT_STATE)
    ).toBe(true);
  });

  it("returns false after the user acknowledged card_revoked state", () => {
    expect(
      isRevokedSinceLastVisitFromBaseline(
        CARD_REVOKED_ALERT_STATE,
        CARD_REVOKED_ALERT_STATE
      )
    ).toBe(false);
  });

  it("treats legacy revoked baseline as acknowledged", () => {
    expect(
      isRevokedSinceLastVisitFromBaseline("revoked", CARD_REVOKED_ALERT_STATE)
    ).toBe(false);
  });
});

describe("normalizeBaselineState", () => {
  it("maps legacy revoked to card_revoked", () => {
    expect(normalizeBaselineState("revoked")).toBe(CARD_REVOKED_ALERT_STATE);
  });
});

describe("listCardDisabledSinceVisit", () => {
  it("returns no rows when alert looks revoked but resolverConfirmed is false", () => {
    const hits = listCardDisabledSinceVisit(
      [{ profile_id: "a", label: "Door" }],
      { a: CARD_REVOKED_ALERT_STATE },
      { a: CARD_REVOKED_ALERT_STATE },
      { a: "active" },
      { a: false }
    );
    expect(hits).toHaveLength(0);
  });

  it("returns only wallet rows with resolver-confirmed since-visit transition", () => {
    const wallet = [
      { profile_id: "a", label: "Door" },
      { profile_id: "b", handle: "keys" },
      { profile_id: "c", label: "Skip" },
    ];
    const hits = listCardDisabledSinceVisit(
      wallet,
      {
        a: CARD_REVOKED_ALERT_STATE,
        b: "active",
        c: CARD_REVOKED_ALERT_STATE,
      },
      {
        a: CARD_REVOKED_ALERT_STATE,
        b: "active",
        c: CARD_REVOKED_ALERT_STATE,
      },
      { a: "active", b: "active", c: CARD_REVOKED_ALERT_STATE },
      { a: true, b: true, c: true }
    );
    expect(hits.map((h) => h.profile_id)).toEqual(["a"]);
  });
});

describe("shouldShowCardDisabledSinceVisitAlert (DH-1)", () => {
  it("never shows from stale cache before resolver confirms", () => {
    expect(
      shouldShowCardDisabledSinceVisitAlert("card_revoked", "active", {
        resolverConfirmed: false,
      })
    ).toBe(false);
  });

  it("shows only after resolver confirms a real card_revoked transition", () => {
    expect(
      shouldShowCardDisabledSinceVisitAlert("card_revoked", "active", {
        resolverConfirmed: true,
      })
    ).toBe(true);
    expect(
      shouldShowCardDisabledSinceVisitAlert("active", "active", {
        resolverConfirmed: true,
      })
    ).toBe(false);
  });
});

describe("stale cache + active fetch (Slice 4 integration)", () => {
  const profileId = "p_stale_cache";

  it("bypasses stale card_revoked cache when baseline is active, then hides since-visit alert", () => {
    const now = 1_000_000;
    const cached = {
      status: "active",
      scanKind: "card_revoked",
      at: now,
    };
    const lastSeen = { [profileId]: "active" };

    expect(
      shouldUseCachedNetworkStatus(lastSeen, profileId, cached, now, WALLET_NETWORK_CACHE_TTL_MS)
    ).toBe(false);

    const pollAlertState = alertStateForNetworkPoll("active", "active");
    const pollScanKind = "active";
    const resolverConfirmed = true;

    expect(pollAlertState).toBe("active");
    expect(
      cardDisabledSinceVisitVisible(
        pollAlertState,
        lastSeen[profileId],
        pollScanKind,
        resolverConfirmed
      )
    ).toBe(false);

    const nextBaseline = mergeLastSeenFromNetworkMap(
      { [profileId]: pollAlertState },
      lastSeen
    );
    expect(nextBaseline[profileId]).toBe("active");
  });

  it("does not show alert from stale cache alone (pre-fetch / baseline-changed guard)", () => {
    const staleAlert = alertStateForNetworkPoll("card_revoked", "active");
    expect(staleAlert).toBe(CARD_REVOKED_ALERT_STATE);
    expect(
      cardDisabledSinceVisitVisible(staleAlert, "active", "card_revoked", false)
    ).toBe(false);
  });
});

describe("cardDisabledSinceVisitVisible (DH-1 + Slice 1)", () => {
  it("hides when session cache says card_revoked but scan.kind is active", () => {
    expect(
      cardDisabledSinceVisitVisible("card_revoked", "active", "active", true)
    ).toBe(false);
  });

  it("hides stale cache card_revoked without resolver confirmation", () => {
    expect(
      cardDisabledSinceVisitVisible("card_revoked", "active", "card_revoked", false)
    ).toBe(false);
  });

  it("shows on confirmed card_revoked transition with matching scan.kind", () => {
    expect(
      cardDisabledSinceVisitVisible(
        CARD_REVOKED_ALERT_STATE,
        "active",
        "card_revoked",
        true
      )
    ).toBe(true);
  });

  it("hides when scan.kind is null even if alert state is card_revoked", () => {
    expect(
      cardDisabledSinceVisitVisible(CARD_REVOKED_ALERT_STATE, "active", null, true)
    ).toBe(false);
  });
});
