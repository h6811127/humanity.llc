/**
 * Scan hero v2 depth — CSS + markup contract (docs/SCAN_HERO_CARD_VISUAL_SPEC.md step 4).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { SCAN_PASS_CSS } from "../src/resolver/scan-pass-styles";
import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { normalizeScanHeroSnippet } from "./scan-hero-snippet";
import {
  SHOWCASE_HANDLE,
  SHOWCASE_PROFILE,
  SHOWCASE_QR,
} from "./fixtures/scan-showcase-fixtures";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function card(): CardRow {
  return {
    profile_id: SHOWCASE_PROFILE,
    public_key: "pk",
    handle: SHOWCASE_HANDLE,
    handle_normalized: SHOWCASE_HANDLE,
    manifesto_line: "Open studio",
    status: "active",
    card_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
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

describe("scan hero visual contract (v2 depth)", () => {
  it("bundles tier-4 tokens and hero surface rules in scan-pass.css", () => {
    expect(SCAN_PASS_CSS).toContain("--hc-scan-hero-shadow");
    expect(SCAN_PASS_CSS).toContain("--scan-hero-qr-expanded-max");
    expect(SCAN_PASS_CSS).toMatch(/\.scan-hero-qr-details\[open\][\s\S]*--scan-hero-qr-expanded-max/);
    expect(SCAN_PASS_CSS).toContain("--hc-scan-hero-fill");
    expect(SCAN_PASS_CSS).toContain("--hc-scan-hero-fill-glass");
    expect(SCAN_PASS_CSS).toContain("--hc-scan-hero-backdrop");
    expect(SCAN_PASS_CSS).toContain("--hc-scan-page-canvas");
    expect(SCAN_PASS_CSS).toContain("--hc-scan-hero-border");
    expect(SCAN_PASS_CSS).toContain("scan-hero-settle-pulse");
    expect(SCAN_PASS_CSS).toMatch(
      /\.scan-hero\.scan-status-panel[\s\S]*background:\s*var\(--hc-scan-hero-fill-glass\)/
    );
    expect(SCAN_PASS_CSS).toMatch(
      /\.scan-hero\.scan-status-panel[\s\S]*backdrop-filter:\s*var\(--hc-scan-hero-backdrop\)/
    );
    expect(SCAN_PASS_CSS).toMatch(
      /\.page\.scan-page[\s\S]*background:\s*var\(--hc-scan-page-canvas\)/
    );
    expect(SCAN_PASS_CSS).toMatch(
      /@supports not[\s\S]*\.scan-hero\.scan-status-panel[\s\S]*--hc-scan-hero-fill/
    );
    expect(SCAN_PASS_CSS).toMatch(
      /html\[data-theme="dark"\][\s\S]*--hc-scan-hero-fill-glass/
    );
    expect(SCAN_PASS_CSS).toContain("--hc-scan-surface-bg");
    expect(SCAN_PASS_CSS).toMatch(
      /\.scan-trust-details[\s\S]*background:\s*var\(--hc-scan-surface-bg\)/
    );
    expect(SCAN_PASS_CSS).toMatch(
      /html\[data-theme="dark"\][\s\S]*--hc-scan-surface-fg/
    );
    expect(SCAN_PASS_CSS).toMatch(
      /\.scan-trust-tools-title[\s\S]*color:\s*var\(--hc-scan-surface-fg\)/
    );
    expect(SCAN_PASS_CSS).toMatch(
      /\.scan-page \.group-label[\s\S]*var\(--hc-scan-surface-fg-muted\)/
    );
    expect(SCAN_PASS_CSS).toMatch(
      /\.scan-safety-resolver[\s\S]*rgba\(60, 60, 67, 0\.72\)/
    );
    const src = readFileSync(join(root, "site/scan-pass.css"), "utf8");
    const resolverBlock = src.match(/\.scan-safety-resolver\s*\{[^}]+\}/)?.[0] ?? "";
    expect(resolverBlock).not.toContain("#248a3d");
    expect(src).toContain("html[data-theme=\"dark\"] .scan-hero.scan-status-panel");
  });

  it("keeps live-check hero markup contract on active and failure scans", async () => {
    const activeVm = buildScanViewModel(
      SHOWCASE_PROFILE,
      SHOWCASE_QR,
      { card: card(), qr: qr(), verification: summary(), revocationDisplay: null },
      "https://humanity.llc"
    );
    const activeHtml = await renderScanPage(activeVm, "https://humanity.llc");
    const activeHero = normalizeScanHeroSnippet(activeHtml);
    expect(activeHero).toContain(
      'class="scan-hero scan-status-panel scan-safety-header scan-live-check--pending"'
    );
    expect(activeHero).toContain("scan-hero-wordmark");
    expect(activeHero).toContain('data-scan-active="1"');
    expect(activeHero).toContain("scan-arrive-strip");
    expect(activeHtml).toContain('meta name="color-scheme" content="light dark"');
    expect(activeHtml).toContain('localStorage.getItem("hc_theme")');

    const revokedVm = buildScanViewModel(
      SHOWCASE_PROFILE,
      "qr_revoked_fixture",
      {
        card: card(),
        qr: qr({ qr_id: "qr_revoked_fixture", status: "revoked" }),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const revokedHtml = await renderScanPage(revokedVm, "https://humanity.llc");
    const revokedHero = normalizeScanHeroSnippet(revokedHtml);
    expect(revokedHero).toContain("scan-safety-strip--bad");
    expect(revokedHero).not.toContain('data-scan-active="1"');
    expect(revokedHero).toContain("scan-live-check--pending");
  });
});
