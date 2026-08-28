import { describe, expect, it } from "vitest";

import type { ScanContext } from "../src/db/scan";
import {
  humanTrustDisplay,
  humanTrustListIcon,
} from "../src/resolver/verification-display";
import { buildScanViewModel } from "../src/resolver/scan-state";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const NOW = new Date("2026-05-24T12:00:00.000Z");

function activeVm(overrides: Partial<ScanContext["verification"]> = {}) {
  return buildScanViewModel(
    PROFILE,
    QR,
    {
      card: {
        profile_id: PROFILE,
        public_key: "pk",
        handle: "river_example",
        handle_normalized: "river_example",
        manifesto_line: "Open studio",
        status: "active",
        card_document_json: "{}",
        created_at: "2026-05-16T17:00:00Z",
        updated_at: "2026-05-16T17:00:00Z",
      },
      qr: {
        qr_id: QR,
        profile_id: PROFILE,
        epoch: 1,
        scope: "card",
        print_artifact_id: null,
        resolver_hint: "https://humanity.llc",
        status: "active",
        payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
        issued_at: "2026-05-16T17:00:00Z",
        expires_at: "2027-05-16T17:00:00Z",
        credential_document_json: "{}",
        created_at: "2026-05-16T17:00:00Z",
        updated_at: "2026-05-16T17:00:00Z",
      },
      verification: {
        profile_id: PROFILE,
        state: "registered",
        level: 1,
        label: "Registered",
        method: "registered",
        vouch_count: 0,
        latest_accepted_vouch_at: null,
        credential_ids_json: "[]",
        summary_document_json: null,
        updated_at: "2026-05-16T17:00:00Z",
        ...overrides,
      },
      revocationDisplay: null,
    },
    "https://humanity.llc"
  );
}

function cardStatusVm(
  status: "revoked" | "expired",
  verification: Partial<ScanContext["verification"]> = {}
) {
  return buildScanViewModel(
    PROFILE,
    QR,
    {
      card: {
        profile_id: PROFILE,
        public_key: "pk",
        handle: "river_example",
        handle_normalized: "river_example",
        manifesto_line: "Open studio",
        status,
        card_document_json: "{}",
        created_at: "2026-05-16T17:00:00Z",
        updated_at: "2026-05-16T17:00:00Z",
      },
      qr: {
        qr_id: QR,
        profile_id: PROFILE,
        epoch: 1,
        scope: "card",
        print_artifact_id: null,
        resolver_hint: "https://humanity.llc",
        status: "active",
        payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
        issued_at: "2026-05-16T17:00:00Z",
        expires_at: "2027-05-16T17:00:00Z",
        credential_document_json: "{}",
        created_at: "2026-05-16T17:00:00Z",
        updated_at: "2026-05-16T17:00:00Z",
      },
      verification: {
        profile_id: PROFILE,
        state: "verified_human",
        level: 2,
        label: "Vouched Human",
        method: "vouch",
        vouch_count: 4,
        latest_accepted_vouch_at: "2026-05-20T12:00:00.000Z",
        credential_ids_json: "[]",
        summary_document_json: null,
        updated_at: "2026-05-16T17:00:00Z",
        ...verification,
      },
      revocationDisplay: null,
    },
    "https://humanity.llc"
  );
}

describe("humanTrustDisplay edges (V-001)", () => {
  it("treats verification-state suspension like card suspension", () => {
    const d = humanTrustDisplay(
      activeVm({
        state: "suspended",
        label: "Vouched Human",
        vouch_count: 4,
      })
    );
    expect(d.label).toBe("Suspended");
    expect(d.subtitle).toContain("suspended under published rules");
    expect(d.iconTone).toBe("orange");
    expect(d.pillActive).toBe(false);
    expect(humanTrustListIcon(d)).toEqual({ id: "warning", tone: "orange" });
  });

  it("hides positive badges when the card is revoked or expired", () => {
    for (const status of ["revoked", "expired"] as const) {
      const d = humanTrustDisplay(cardStatusVm(status));
      expect(d.label).toBe("Vouched Human");
      expect(d.subtitle).toBe(
        "Verification may not apply while the card is not active."
      );
      expect(d.iconTone).toBe("slate");
      expect(d.pillActive).toBe(false);
    }
  });

  it("shows steward credential copy with optional recency", () => {
    const withRecency = humanTrustDisplay(
      activeVm({
        state: "steward",
        level: 3,
        label: "Steward",
        method: "steward",
        latest_accepted_vouch_at: "2026-05-24T11:00:00.000Z",
      }),
      NOW
    );
    expect(withRecency.label).toBe("Steward");
    expect(withRecency.subtitle).toBe(
      "Steward credential on this operator · latest vouch 1h ago"
    );
    expect(withRecency.iconTone).toBe("green");
    expect(withRecency.pillActive).toBe(true);
    expect(humanTrustListIcon(withRecency)).toEqual({
      id: "shield",
      tone: "green",
    });

    const withoutRecency = humanTrustDisplay(
      activeVm({
        state: "registered",
        label: "Steward",
        latest_accepted_vouch_at: null,
      })
    );
    expect(withoutRecency.label).toBe("Steward");
    expect(withoutRecency.subtitle).toBe("Steward credential on this operator");
  });

  it("uses singular vouch copy and omits latest when the timestamp is invalid", () => {
    const d = humanTrustDisplay(
      activeVm({
        state: "registered",
        label: "Vouched Human",
        vouch_count: 1,
        latest_accepted_vouch_at: "not-a-date",
      }),
      NOW
    );
    expect(d.label).toBe("Vouched Human");
    expect(d.subtitle).toBe("1 accepted vouch on this operator");
    expect(d.subtitle).not.toContain("latest");
    expect(d.iconTone).toBe("green");
    expect(d.pillActive).toBe(true);
  });

  it("maps progress, unverified, and revoked list icons", () => {
    const progress = humanTrustDisplay(activeVm({ vouch_count: 1 }));
    expect(progress.label).toBe("Registered");
    expect(progress.subtitle).toContain("1 of 3 vouches");
    expect(humanTrustListIcon(progress)).toEqual({ id: "people", tone: "purple" });

    const unverified = humanTrustDisplay(
      activeVm({
        state: "unverified",
        label: "Unverified",
      })
    );
    expect(unverified.label).toBe("Unverified");
    expect(unverified.subtitle).toContain("No accepted human vouches");
    expect(humanTrustListIcon(unverified)).toEqual({ id: "people", tone: "slate" });

    const revoked = humanTrustDisplay(
      activeVm({
        state: "revoked",
        label: "Revoked",
      })
    );
    expect(humanTrustListIcon(revoked)).toEqual({ id: "ban", tone: "red" });
  });
});
