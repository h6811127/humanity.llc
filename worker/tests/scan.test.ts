import { describe, expect, it } from "vitest";

import type { ScanContext } from "../src/db/scan";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { renderScanPage } from "../src/resolver/scan-html";
import { BEARER_WARNING } from "../src/resolver/trust-copy";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { handleGetScan } from "../src/resolver/scan";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const LIVE_CHALLENGE = "lc_7Xk9mP2nQ4rT6vW8";

function card(overrides: Partial<CardRow> = {}): CardRow {
  return {
    profile_id: PROFILE,
    public_key: "pk",
    handle: "river_example",
    handle_normalized: "river_example",
    manifesto_line: "Open studio",
    status: "active",
    card_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

function qr(overrides: Partial<QrCredentialRow> = {}): QrCredentialRow {
  return {
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
    ...overrides,
  };
}

function summary(): VerificationSummaryRow {
  return {
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
  };
}

function scanDbFor(challenge: Record<string, unknown> | null = null): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM cards")) return card();
          if (sql.includes("FROM qr_credentials")) return qr();
          if (sql.includes("FROM verification_summaries")) return summary();
          if (sql.includes("FROM live_control_challenges")) {
            if (sql.includes("ORDER BY proven_at DESC")) {
              const [profile_id, qr_id, provenAfter] = params;
              if (
                challenge &&
                challenge.status === "proven" &&
                challenge.profile_id === profile_id &&
                challenge.qr_id === qr_id &&
                String(challenge.proven_at) > String(provenAfter)
              ) {
                return challenge;
              }
              return null;
            }
            return params[0] === LIVE_CHALLENGE ? challenge : null;
          }
          return null;
        },
      }),
    }),
  } as unknown as D1Database;
}

describe("buildScanViewModel", () => {
  it("active scan includes all trust blocks", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: summary(),
      },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("active");
    expect(vm.showCardBlock).toBe(true);
    expect(vm.showHumanTrustBlock).toBe(true);
    expect(vm.showArtifactBlock).toBe(true);
    expect(vm.showLiveControlBlock).toBe(true);
    expect(vm.liveControlAvailable).toBe(false);
  });
});

describe("renderScanPage M3.2 trust blocks", () => {
  it("renders lost-item relay manifesto layout", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card({
          manifesto_line: "[relay] House keys\nLost — contact owner through relay",
        }),
        qr: qr(),
        verification: summary(),
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Lost item relay");
    expect(html).toContain("House keys");
    expect(html).toContain("contact owner through relay");
    expect(html).not.toContain("[relay]");
    expect(html).toContain("does not prove who holds the item");
  });

  it("renders status-plate manifesto as object label + status line", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card({
          manifesto_line: "Studio door\nOpen · Thu–Sun until 9 PM",
        }),
        qr: qr(),
        verification: summary(),
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Status plate");
    expect(html).toContain("Studio door");
    expect(html).toContain("Open · Thu–Sun until 9 PM");
    expect(html).toContain("pass-handle-muted");
    expect(html).toContain("@river_example");
    expect(html).toContain("current status for this place");
  });

  it("renders landing pass card with flip and shared styles", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: summary(),
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("pass-scene");
    expect(html).toContain("pass-flip-btn");
    expect(html).toContain("pass-tilt-wrap");
    expect(html).toContain("getElementById(\"pass-scene\")");
    expect(html).not.toContain('class="block"');
    expect(html).not.toContain("HUMAN TRUST");
    expect(html).toContain("Live object");
    expect(html).toContain("@river_example");
    expect(html).toContain("Card active");
    expect(html).toContain("QR active");
    expect(html).toContain("scan-bearer-line");
    expect(html).toContain("scan-limits-settings");
    expect(html).toContain("What this scan does not prove");
    const bearerCount = html.split(BEARER_WARNING).length - 1;
    expect(bearerCount).toBe(1);
    expect(html).not.toContain("Does not prove");
    expect(html).toContain('class="pass-dot"');
    expect(html).toContain("pass-qr-slot");
    expect(html).toContain(`q=${QR}`);
    expect(html).toContain("Show link");
    expect(html).toMatch(/<svg[^>]*viewBox="0 0 \d+ \d+"/);
    expect(html).toContain("list-icon-tone-red");
    expect(html).not.toContain('class="pass-qr"><img src="https://humanity.llc/assets/red_qr');
    expect(html).not.toContain("HUMAN TRUST");
  });

  it("puts spec trust blocks in iOS groups below the card", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: summary(),
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("scan-trust-groups");
    expect(html).toContain("Card status");
    expect(html).toContain("Human trust");
    expect(html).toContain("Live control");
    expect(html).toContain('id="live-control-request"');
    expect(html).toContain("live-control-cta");
    expect(html).not.toContain("Limitations");
    expect(html).toContain("scan-limits-settings");
    expect(html).toContain('class="list"');
  });

  it("renders recent live proof when returning with a proven challenge", async () => {
    const res = await handleGetScan(
      new Request(
        `https://humanity.llc/c/${PROFILE}?q=${QR}&live_challenge=${LIVE_CHALLENGE}`
      ),
      scanDbFor({
        challenge_id: LIVE_CHALLENGE,
        profile_id: PROFILE,
        qr_id: QR,
        nonce: "nonce",
        verifier_session_id: "verifier",
        status: "proven",
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        proven_at: new Date().toISOString(),
        signer_public_key: "pk",
        response_document_json: "{}",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
      PROFILE
    );
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(html).toContain("Control proven");
    expect(html).toContain("live-control-card-proven");
    expect(html).toContain('id="live-control-request-again"');
    expect(html).toContain("live-control-proven-ago");
    expect(html).toContain('id="live-control-owner-view"');
    expect(html).toContain('id="live-control-interactive" hidden');
    expect(html).toContain('id="live-control-request"');
  });

  it("uses print_artifact scope copy when applicable", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr({ scope: "print_artifact", print_artifact_id: "art_001" }),
        verification: summary(),
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Printed item");
  });

  it("renders Vouched Human with vouch recency on scan (V-001)", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: {
          ...summary(),
          state: "verified_human",
          level: 2,
          label: "Vouched Human",
          method: "vouch",
          vouch_count: 3,
          latest_accepted_vouch_at: "2026-05-21T12:00:00.000Z",
        },
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Vouched Human");
    expect(html).toContain("3 accepted vouches");
    expect(html).toContain("latest");
  });

  it("shows vouch progress below threshold (V-001)", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: {
          ...summary(),
          vouch_count: 2,
          latest_accepted_vouch_at: "2026-05-20T12:00:00.000Z",
        },
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("2 of 3 vouches accepted");
    expect(html).not.toContain(">Vouched Human<");
  });

  it("overrides Vouched Human when verification is revoked (V-001)", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: {
          ...summary(),
          state: "revoked",
          label: "Revoked",
          vouch_count: 4,
          latest_accepted_vouch_at: "2026-05-20T12:00:00.000Z",
        },
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Verification revoked");
    expect(html).not.toContain(">Vouched Human<");
  });

  it("renders card disabled state (M4.5)", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card({ status: "revoked" }),
        qr: qr(),
        verification: summary(),
      },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("card_revoked");
    expect(vm.minimalScan).toBe(true);
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("This card has been disabled");
    expect(html).toContain("Show link");
    expect(html).not.toContain("@river_example");
    expect(html).not.toContain("Human trust");
  });

  it("renders QR expired minimal while card stays active (M4.6)", async () => {
    const expiredQr = "qr_expired_test_001";
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const vm = buildScanViewModel(
      PROFILE,
      expiredQr,
      {
        card: card(),
        qr: qr({ qr_id: expiredQr, expires_at: past }),
        verification: summary(),
      },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("qr_expired");
    expect(vm.minimalScan).toBe(true);
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("This QR has expired");
    expect(html).not.toContain("@river_example");
    expect(html).not.toContain('id="pass-flip-btn"');
  });

  it("renders QR revoked minimal while card stays active (M4.5)", async () => {
    const revokedQr = "qr_revoked_sibling_test";
    const vmRevoked = buildScanViewModel(
      PROFILE,
      revokedQr,
      {
        card: card(),
        qr: qr({ qr_id: revokedQr, status: "revoked" }),
        verification: summary(),
      },
      "https://humanity.llc"
    );
    expect(vmRevoked.kind).toBe("qr_revoked");
    expect(vmRevoked.minimalScan).toBe(true);
    const htmlRevoked = await renderScanPage(vmRevoked, "https://humanity.llc");
    expect(htmlRevoked).toContain("This QR is no longer valid");
    expect(htmlRevoked).toContain("Show link");
    expect(htmlRevoked).not.toContain("@river_example");
    expect(htmlRevoked).not.toContain("Human trust");
    expect(htmlRevoked).not.toContain('id="pass-flip-btn"');

    const vmSibling = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr({ status: "active" }),
        verification: summary(),
      },
      "https://humanity.llc"
    );
    expect(vmSibling.kind).toBe("active");
  });
});
