import { describe, expect, it } from "vitest";

import { buildScanCapabilities } from "../src/live-object/scan-capabilities";
import { resolveSuccessionScanContext } from "../src/live-object/succession-spec";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { scanStatusBodyFromViewModel } from "../src/resolver/scan-status";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_succession001";

describe("succession spec (Order 6)", () => {
  it("marks revoked scans as archived", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: {
          profile_id: PROFILE,
          public_key: "pk",
          handle: "bench",
          handle_normalized: "bench",
          manifesto_line: "Bench",
          status: "revoked",
          card_document_json: "{}",
          created_at: "2026-06-01T12:00:00.000Z",
          updated_at: "2026-06-01T12:00:00.000Z",
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
          issued_at: "2026-06-01T12:00:00.000Z",
          expires_at: null,
          credential_document_json: null,
          created_at: "2026-06-01T12:00:00.000Z",
          updated_at: "2026-06-01T12:00:00.000Z",
        },
        verification: null,
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    expect(resolveSuccessionScanContext(vm)).toMatchObject({
      phase: "archived",
    });
  });

  it("exposes freshness and succession on scan status JSON", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: {
          profile_id: PROFILE,
          public_key: "pk",
          handle: "garden",
          handle_normalized: "garden",
          manifesto_line: "Garden gate",
          status: "active",
          card_document_json: "{}",
          created_at: "2026-06-01T12:00:00.000Z",
          updated_at: "2026-06-01T12:00:00.000Z",
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
          issued_at: "2026-06-01T12:00:00.000Z",
          expires_at: null,
          credential_document_json: null,
          created_at: "2026-06-01T12:00:00.000Z",
          updated_at: "2026-06-01T12:00:00.000Z",
        },
        verification: null,
        revocationDisplay: null,
      },
      "https://humanity.llc",
      new Date("2026-06-07T18:00:00.000Z")
    );
    const body = scanStatusBodyFromViewModel(
      vm,
      new Date("2026-06-07T18:00:00.000Z")
    );
    expect(body.scan.freshness.fetched_at).toBe("2026-06-07T18:00:00.000Z");
    expect(body.scan.freshness.max_age_seconds).toBe(300);
    expect(body.scan.succession.phase).toBe("live");
    expect(buildScanCapabilities(vm).length).toBeGreaterThan(0);
  });
});
