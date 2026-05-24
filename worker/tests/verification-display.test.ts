import { describe, expect, it } from "vitest";

import type { ScanContext } from "../src/db/scan";
import {
  formatVouchRecency,
  humanTrustDisplay,
  humanTrustListIcon,
} from "../src/resolver/verification-display";
import { buildScanViewModel } from "../src/resolver/scan-state";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";

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
    },
    "https://humanity.llc"
  );
}

describe("formatVouchRecency", () => {
  it("formats relative windows", () => {
    const now = new Date("2026-05-24T12:00:00.000Z");
    expect(formatVouchRecency("2026-05-24T11:59:30.000Z", now)).toBe("just now");
    expect(formatVouchRecency("2026-05-24T11:00:00.000Z", now)).toBe("1h ago");
    expect(formatVouchRecency("2026-05-21T12:00:00.000Z", now)).toBe("3 days ago");
  });
});

describe("humanTrustDisplay (V-001)", () => {
  it("shows registered copy with no vouches", () => {
    const d = humanTrustDisplay(activeVm());
    expect(d.label).toBe("Registered");
    expect(d.subtitle).toContain("No accepted vouches yet");
    expect(d.iconTone).toBe("purple");
    expect(d.pillActive).toBe(true);
  });

  it("shows progress below threshold", () => {
    const d = humanTrustDisplay(
      activeVm({
        vouch_count: 2,
        latest_accepted_vouch_at: "2026-05-20T12:00:00.000Z",
      })
    );
    expect(d.label).toBe("Registered");
    expect(d.subtitle).toBe(
      "2 of 3 vouches accepted — not yet a Vouched Human"
    );
  });

  it("shows Vouched Human with recency", () => {
    const now = new Date("2026-05-24T12:00:00.000Z");
    const d = humanTrustDisplay(
      activeVm({
        state: "verified_human",
        level: 2,
        label: "Vouched Human",
        method: "vouch",
        vouch_count: 3,
        latest_accepted_vouch_at: "2026-05-21T12:00:00.000Z",
      }),
      now
    );
    expect(d.label).toBe("Vouched Human");
    expect(d.subtitle).toContain("3 accepted vouches");
    expect(d.subtitle).toContain("latest 3 days ago");
    expect(d.iconTone).toBe("green");
  });

  it("overrides positive badges when verification is revoked", () => {
    const d = humanTrustDisplay(
      activeVm({
        state: "revoked",
        label: "Revoked",
        vouch_count: 5,
        latest_accepted_vouch_at: "2026-05-20T12:00:00.000Z",
      })
    );
    expect(d.label).toBe("Verification revoked");
    expect(d.pillActive).toBe(false);
    expect(d.iconTone).toBe("red");
  });

  it("overrides positive badges when card is suspended", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: {
          profile_id: PROFILE,
          public_key: "pk",
          handle: "river_example",
          handle_normalized: "river_example",
          manifesto_line: "Open studio",
          status: "suspended",
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
        },
      },
      "https://humanity.llc"
    );
    const d = humanTrustDisplay(vm);
    expect(d.label).toBe("Suspended");
    expect(d.pillActive).toBe(false);
  });

  it("overrides positive badges when card is disabled", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: {
          profile_id: PROFILE,
          public_key: "pk",
          handle: "river_example",
          handle_normalized: "river_example",
          manifesto_line: "Open studio",
          status: "revoked",
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
        },
      },
      "https://humanity.llc"
    );
    const d = humanTrustDisplay(vm);
    expect(d.label).toBe("Disabled");
    expect(d.subtitle).toContain("card is disabled");
    expect(d.iconTone).toBe("red");
    expect(d.pillActive).toBe(false);
  });

  it("humanTrustListIcon uses slate people for Registered", () => {
    const d = humanTrustDisplay(activeVm());
    expect(humanTrustListIcon(d)).toEqual({ id: "people", tone: "slate" });
  });

  it("humanTrustListIcon uses trust shield for Vouched Human", () => {
    const d = humanTrustDisplay(
      activeVm({
        state: "verified_human",
        level: 2,
        label: "Vouched Human",
        method: "vouch",
        vouch_count: 3,
        latest_accepted_vouch_at: "2026-05-21T12:00:00.000Z",
      })
    );
    expect(humanTrustListIcon(d)).toEqual({ id: "shield", tone: "trust" });
  });
});
