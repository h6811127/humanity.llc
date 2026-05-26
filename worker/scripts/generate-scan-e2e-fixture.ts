/**
 * Writes a static scan page for Playwright (Pages :8788, no Worker DB).
 * Run: npm run site:generate-scan-e2e-fixture
 * @see docs/SCAN_PAGE_DEVICE_DOT.md § Test plan (E2E)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";
import {
  PERSONAL_CARD_MANIFESTO,
  SHOWCASE_HANDLE,
  SHOWCASE_PROFILE,
  SHOWCASE_QR,
} from "../tests/fixtures/scan-showcase-fixtures";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "site/e2e-fixtures");
const outPath = join(outDir, "scan-active.html");

/** Pages dev origin so module scripts load from the same host as Playwright baseURL. */
const PAGES_ORIGIN = "http://127.0.0.1:8788";

function card(): CardRow {
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
  };
}

function qr(): QrCredentialRow {
  return {
    qr_id: SHOWCASE_QR,
    profile_id: SHOWCASE_PROFILE,
    epoch: 1,
    scope: "card",
    print_artifact_id: null,
    resolver_hint: PAGES_ORIGIN,
    status: "active",
    payload: `${PAGES_ORIGIN}/c/${SHOWCASE_PROFILE}?q=${SHOWCASE_QR}`,
    issued_at: "2026-05-16T17:00:00Z",
    expires_at: "2027-05-16T17:00:00Z",
    credential_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
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

async function main() {
  const vm = buildScanViewModel(
    SHOWCASE_PROFILE,
    SHOWCASE_QR,
    {
      card: card(),
      qr: qr(),
      verification: summary(),
      revocationDisplay: null,
    },
    PAGES_ORIGIN
  );

  const html = await renderScanPage(vm, PAGES_ORIGIN);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, html, "utf8");
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
