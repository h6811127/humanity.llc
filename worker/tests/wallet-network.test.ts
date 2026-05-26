import { describe, expect, it } from "vitest";

import {
  alertStateFromScanKind,
  CARD_DISABLED_SINCE_VISIT_ALERT_TEXT,
  CARD_REVOKED_ALERT_STATE,
  isRevokedSinceLastVisitFromBaseline,
  normalizeBaselineState,
  shouldShowCardDisabledSinceVisitAlert,
} from "../../site/js/wallet-network-baseline.mjs";

describe("card-disabled since-visit copy", () => {
  it("uses card-disabled wording, not generic revoked", () => {
    expect(CARD_DISABLED_SINCE_VISIT_ALERT_TEXT).toMatch(/card disabled/i);
    expect(CARD_DISABLED_SINCE_VISIT_ALERT_TEXT).not.toMatch(/revoked since last visit/i);
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
