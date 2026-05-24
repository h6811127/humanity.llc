import { describe, expect, it } from "vitest";

import type { ScanContext } from "../src/db/scan";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { renderScanPage } from "../src/resolver/scan-html";
import { BEARER_WARNING } from "../src/resolver/trust-copy";
import { buildScanViewModel } from "../src/resolver/scan-state";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_test_card_001";

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
    expect(html).not.toContain("Limitations");
    expect(html).toContain("scan-limits-settings");
    expect(html).toContain('class="list"');
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
