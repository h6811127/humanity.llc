import { describe, expect, it } from "vitest";

import {
  STALE_DISCLOSURE_CACHE,
  STALE_DISCLOSURE_RESOLVER,
} from "../src/live-object/staleness-contract";
import { buildScanViewModel } from "../src/resolver/scan-state";
import {
  renderScanFreshnessBannerMarkup,
  renderScanFreshnessBannerScript,
  scanFreshnessForViewModel,
  shouldShowScanFreshnessBanner,
} from "../src/resolver/scan-freshness-banner";
import { renderScanPage } from "../src/resolver/scan-html";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";

function card(): CardRow {
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
  };
}

function qr(): QrCredentialRow {
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

describe("scan freshness banner (Order 6)", () => {
  it("hides when resolver HTML is within max-age", () => {
    const fetchedAt = new Date("2026-06-07T18:00:00.000Z");
    expect(
      shouldShowScanFreshnessBanner({
        fetchedAt,
        maxAgeSeconds: 300,
        now: new Date("2026-06-07T18:04:00.000Z"),
        source: "resolver",
      })
    ).toBe(false);
  });

  it("shows when resolver HTML exceeds max-age", () => {
    const fetchedAt = new Date("2026-06-07T18:00:00.000Z");
    expect(
      shouldShowScanFreshnessBanner({
        fetchedAt,
        maxAgeSeconds: 300,
        now: new Date("2026-06-07T18:05:01.000Z"),
        source: "resolver",
      })
    ).toBe(true);
  });

  it("shows immediately for cache or mesh source", () => {
    expect(
      shouldShowScanFreshnessBanner({
        fetchedAt: new Date(),
        maxAgeSeconds: 300,
        source: "cache",
      })
    ).toBe(true);
    expect(
      shouldShowScanFreshnessBanner({
        fetchedAt: new Date(),
        maxAgeSeconds: 300,
        source: "mesh",
      })
    ).toBe(true);
  });

  it("embeds freshness metadata and disclosure on scan HTML", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const freshness = scanFreshnessForViewModel(
      vm,
      new Date("2026-06-07T18:00:00.000Z")
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain('id="scan-freshness-banner"');
    expect(html).toContain(STALE_DISCLOSURE_RESOLVER);
    expect(html).toMatch(/data-fetched-at="\d{4}-\d{2}-\d{2}T/);
    expect(html).toContain('data-max-age-seconds="30"');
    expect(html).toContain('data-source="resolver"');
    expect(renderScanFreshnessBannerMarkup(freshness)).toContain(" hidden");
    expect(renderScanFreshnessBannerScript()).toContain("pageshow");
    expect(renderScanFreshnessBannerScript()).toContain("visibilitychange");
  });

  it("cache source markup is visible without hidden attribute", () => {
    const markup = renderScanFreshnessBannerMarkup({
      fetched_at: "2026-06-07T18:00:00.000Z",
      max_age_seconds: 300,
      stale_disclosure: STALE_DISCLOSURE_CACHE,
      source: "cache",
    });
    expect(markup).not.toContain(" hidden");
    expect(markup).toContain(STALE_DISCLOSURE_CACHE);
  });
});
