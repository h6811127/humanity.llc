import { describe, expect, it } from "vitest";

import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";
import {
  LIVE_OBJECT_MANIFESTO,
  LOST_ITEM_MANIFESTO,
  PERSONAL_CARD_MANIFESTO,
  SHOWCASE_HANDLE,
  SHOWCASE_PROFILE,
  SHOWCASE_QR,
  STATUS_PLATE_MANIFESTO,
} from "./fixtures/scan-showcase-fixtures";

function card(overrides: Partial<CardRow> = {}): CardRow {
  return {
    profile_id: SHOWCASE_PROFILE,
    public_key: "pk",
    handle: SHOWCASE_HANDLE,
    handle_normalized: SHOWCASE_HANDLE,
    manifesto_line: PERSONAL_CARD_MANIFESTO,
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
    scope: "card",
    print_artifact_id: null,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${SHOWCASE_PROFILE}?q=${SHOWCASE_QR}`,
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

/** Normalize hero markup for stable snapshots (Phase 4). */
export function normalizeScanHeroSnippet(html: string): string {
  const match = html.match(
    /<article class="scan-hero[\s\S]*?<\/article>/
  );
  if (!match) return "";
  return match[0]
    .replace(/data-profile-id="[^"]+"/g, 'data-profile-id="PROFILE"')
    .replace(/data-qr-id="[^"]+"/g, 'data-qr-id="QR"')
    .replace(/data-scan-url="[^"]+"/g, 'data-scan-url="SCAN_URL"')
    .replace(/HC-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}/g, "HC-XXXX-XXXX")
    .replace(/<svg[\s\S]*?<\/svg>/g, "<svg><!-- qr --></svg>")
    .replace(/\s+/g, " ")
    .trim();
}

async function heroForManifesto(manifestoLine: string | null) {
  const vm = buildScanViewModel(
    SHOWCASE_PROFILE,
    SHOWCASE_QR,
    {
      card: card({ manifesto_line: manifestoLine }),
      qr: qr(),
      verification: summary(),
      revocationDisplay: null,
    },
    "https://humanity.llc"
  );
  const html = await renderScanPage(vm, "https://humanity.llc");
  return normalizeScanHeroSnippet(html);
}

describe("scan hero HTML snapshots", () => {
  it("live object manifesto-first hero", async () => {
    const snippet = await heroForManifesto(LIVE_OBJECT_MANIFESTO);
    expect(snippet).toMatchSnapshot();
    expect(snippet).toContain("scan-hero-wordmark");
    expect(snippet).not.toMatch(/scan-hero-host[^>]*>[\s\S]*?pass-dot/);
    expect(snippet).toContain(LIVE_OBJECT_MANIFESTO);
    expect(snippet).not.toContain("@river_example</h1>");
  });

  it("status plate hero", async () => {
    const snippet = await heroForManifesto(STATUS_PLATE_MANIFESTO);
    expect(snippet).toMatchSnapshot();
    expect(snippet).toContain("Studio door");
    expect(snippet).toContain("Open · Thu–Sun until 9 PM");
  });

  it("lost item relay hero", async () => {
    const snippet = await heroForManifesto(LOST_ITEM_MANIFESTO);
    expect(snippet).toMatchSnapshot();
    expect(snippet).toContain("House keys");
  });

  it("personal card handle-forward hero", async () => {
    const snippet = await heroForManifesto(PERSONAL_CARD_MANIFESTO);
    expect(snippet).toMatchSnapshot();
    expect(snippet).toContain("@river_example");
    expect(snippet).toContain(PERSONAL_CARD_MANIFESTO);
  });
});
