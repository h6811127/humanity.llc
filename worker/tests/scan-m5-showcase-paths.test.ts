import { describe, expect, it } from "vitest";

import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { renderScanPage, SCAN_UI_VERSION } from "../src/resolver/scan-html";
import { SCAN_HERO_LIVE_OBJECT_FOOT, LOST_ITEM_RELAY_CREATE_HINT, LOST_ITEM_RELAY_CREATE_PATH } from "../src/resolver/scan-safety";
import { BEARER_WARNING } from "../src/resolver/trust-copy";
import { buildScanViewModel } from "../src/resolver/scan-state";
import {
  LIVE_OBJECT_MANIFESTO,
  LIVE_OBJECT_STREAMS,
  LOST_ITEM_MANIFESTO,
  SHOWCASE_HANDLE,
  SHOWCASE_PROFILE,
  SHOWCASE_QR,
  STATUS_PLATE_MANIFESTO,
  STATUS_PLATE_OBJECT_STREAMS,
  showcaseCardDocumentJson,
} from "./fixtures/scan-showcase-fixtures";
import { OBJECT_STREAMS_LIMIT, OBJECT_PUBLIC_SNAPSHOT_LIMIT } from "../src/resolver/trust-copy";

function card(manifestoLine: string | null, overrides: Partial<CardRow> = {}): CardRow {
  return {
    profile_id: SHOWCASE_PROFILE,
    public_key: "pk",
    handle: SHOWCASE_HANDLE,
    handle_normalized: SHOWCASE_HANDLE,
    manifesto_line: manifestoLine,
    status: "active",
    card_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

function qr(overrides: Partial<QrCredentialRow> = {}): QrCredentialRow {
  return {
    qr_id: SHOWCASE_QR,
    profile_id: SHOWCASE_PROFILE,
    epoch: 1,
    scope: "print_artifact",
    print_artifact_id: "artifact_demo",
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${SHOWCASE_PROFILE}?q=${SHOWCASE_QR}`,
    issued_at: "2026-05-16T17:00:00Z",
    expires_at: null,
    credential_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

function summary(): VerificationSummaryRow {
  return {
    profile_id: SHOWCASE_PROFILE,
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

async function renderActiveShowcaseScan(
  manifestoLine: string | null,
  opts: { objectSignatureVerified?: boolean; cardDocumentJson?: string } = {}
) {
  const vm = buildScanViewModel(
    SHOWCASE_PROFILE,
    SHOWCASE_QR,
    {
      card: card(manifestoLine, {
        card_document_json: opts.cardDocumentJson ?? "{}",
      }),
      qr: qr(),
      verification: summary(),
      revocationDisplay: null,
    },
    "https://humanity.llc"
  );
  return renderScanPage(vm, "https://humanity.llc", {
    objectSignatureVerified: opts.objectSignatureVerified ?? true,
    stewardRegistered: false,
  });
}

/** M5 / SCANNER_EXPERIENCE - shared stranger-path invariants. */
function expectM5StrangerScanBasics(html: string) {
  expect(SCAN_UI_VERSION).toMatch(/^pass-v\d+$/);
  expect(html).not.toContain("This QR is active");
  expect(html).not.toContain('class="section-kicker">Network status');
  expect(html).toContain("scan-proves");
  expect(html).not.toMatch(/class="scan-does-not-prove"/);
  expect(html).toContain('id="scan-limits-settings"');
  expect(html.split(BEARER_WARNING).length - 1).toBe(1);
  const bearerIdx = html.indexOf(BEARER_WARNING);
  const provesIdx = html.indexOf('class="scan-proves"');
  const limitsIdx = html.indexOf('id="scan-limits-settings"');
  expect(bearerIdx).toBeGreaterThan(-1);
  expect(provesIdx).toBeGreaterThan(bearerIdx);
  expect(limitsIdx).toBeGreaterThan(provesIdx);
}

/** Match H1 with Path 2 arrive classes on the live check hero. */
function expectHeroTitle(html: string, title: string) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  expect(html).toMatch(
    new RegExp(`<h1 class="[^"]*scan-hero-title[^"]*">${escaped}</h1>`)
  );
}

describe("M5 showcase scan paths", () => {
  it("live object: manifesto H1, steward strip, foot copy", async () => {
    const html = await renderActiveShowcaseScan(LIVE_OBJECT_MANIFESTO);
    expectM5StrangerScanBasics(html);
    expectHeroTitle(html, LIVE_OBJECT_MANIFESTO);
    expect(html).toContain("Controlled by @river_example");
    expect(html).not.toMatch(/<h1 class="[^"]*scan-hero-title[^"]*">@river_example<\/h1>/);
    expect(html).toContain(SCAN_HERO_LIVE_OBJECT_FOOT);
    expect(html).not.toContain("Scan shows live object state");
    expect(html).toContain("scan-hero-meta-details");
    expect(html).toContain("Signed and checked just now");
    expect(html).not.toContain("Signed object verified by resolver");
    expect(html).toContain("This QR");
    expect(html).not.toContain("QR on this page");
  });

  it("status plate: object label H1, status line, door foot copy", async () => {
    const html = await renderActiveShowcaseScan(STATUS_PLATE_MANIFESTO);
    expectM5StrangerScanBasics(html);
    expectHeroTitle(html, "Studio door");
    expect(html).toContain("Open · Thu–Sun until 9 PM");
    expect(html).toContain(
      "Scan shows current status for this place - not who owns the door."
    );
    expect(html).not.toMatch(/<h1 class="[^"]*scan-hero-title[^"]*">@river_example<\/h1>/);
  });

  it("status plate: object_streams show detail cards and limit copy", async () => {
    const html = await renderActiveShowcaseScan(STATUS_PLATE_MANIFESTO, {
      cardDocumentJson: showcaseCardDocumentJson(STATUS_PLATE_OBJECT_STREAMS),
    });
    expect(html).toContain("scan-object-streams");
    expect(html).toContain("Special hours");
    expect(html).toContain("Thursday closes at 6 PM this week");
    expect(html).toContain("scan-object-streams-limit");
    expect(html).toContain(OBJECT_STREAMS_LIMIT);
    expect(html).toContain("scan-public-snapshot");
    expect(html).toContain(OBJECT_PUBLIC_SNAPSHOT_LIMIT);
  });

  it("live object: object_streams show detail cards and limit copy", async () => {
    const html = await renderActiveShowcaseScan(LIVE_OBJECT_MANIFESTO, {
      cardDocumentJson: showcaseCardDocumentJson(LIVE_OBJECT_STREAMS),
    });
    expect(html).toContain("scan-object-streams");
    expect(html).toContain("Returns due");
    expect(html).toContain("Cordless drill");
    expect(html).toContain(OBJECT_STREAMS_LIMIT);
    expect(html).toContain("scan-public-snapshot");
    expect(html).toContain(OBJECT_PUBLIC_SNAPSHOT_LIMIT);
  });

  it("lost item relay: relay eyebrow, object H1, holder foot copy", async () => {
    const html = await renderActiveShowcaseScan(LOST_ITEM_MANIFESTO);
    expectM5StrangerScanBasics(html);
    expect(html).toContain("Lost item relay");
    expectHeroTitle(html, "House keys");
    expect(html).toContain("This scan does not prove who holds the item.");
    expect(html).not.toMatch(/<h1 class="[^"]*scan-hero-title[^"]*">@river_example<\/h1>/);
  });

  it("lost item relay: create hint links to lost_item template", async () => {
    const html = await renderActiveShowcaseScan(LOST_ITEM_MANIFESTO);
    expect(html).toMatch(/<p class="scan-create-hint"/);
    expect(html).toContain(LOST_ITEM_RELAY_CREATE_HINT);
    expect(html).toContain(LOST_ITEM_RELAY_CREATE_PATH);
    expect(html).toContain("Create a lost-item tag");
  });
});
