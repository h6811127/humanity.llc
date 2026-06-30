/**
 * Renders game scan HTML for onboarding before/after review assets.
 * Usage: npx tsx worker/scripts/capture-game-scan-onboarding.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { defaultSeason } from "../src/city-game/season-loader";
import type { CardRow, ChildObjectRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { CITY_GAME_SEASON_ROOT_PROFILE } from "../tests/city-game-fixture-profile";

const OUT = join(process.cwd(), "site/dev/city-game-scan-onboarding");
const PROFILE = CITY_GAME_SEASON_ROOT_PROFILE;
const QR = "qr_capture_onboarding";
const OBJECT_ID = "obj_cr_node_01_newbo";
const SEASON_OPEN_NOW = new Date("2026-06-07T00:00:00-05:00");

function childDocument() {
  return JSON.stringify({
    object_id: OBJECT_ID,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: "NewBo relay arch",
    public_state: "Red team holds the relay",
    status: "active",
    season_id: "cr_season_01_wake",
    node_role: "relay_gate",
    district: "newbo",
    object_streams: [
      { id: "territory", class: "place", label: "Controller", value: "Red team" },
      { id: "relay", class: "route", label: "Relay status", value: "Open · 18 min" },
    ],
    game_meta: {
      visible_until: null,
      compromised: false,
      collective_progress: null,
      collective_target: null,
      unlocked_by: [],
      vouch_requires: [],
      vouch_active_for: [],
      scarcity_remaining: null,
      fragment_id: null,
      held_by_faction: "red",
    },
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:05:00.000Z",
  });
}

function cardRow(): CardRow {
  return {
    profile_id: PROFILE,
    public_key: "pk",
    handle: "season_root",
    handle_normalized: "season_root",
    manifesto_line: "Wake the city",
    status: "active",
    card_document_json: "{}",
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:00:00.000Z",
  };
}

function childRow(): ChildObjectRow {
  return {
    object_id: OBJECT_ID,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: "NewBo relay arch",
    public_state: "Red team holds the relay",
    status: "active",
    child_object_document_json: childDocument(),
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:05:00.000Z",
  };
}

function qrRow(): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "child_object",
    print_artifact_id: null,
    object_id: OBJECT_ID,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
    issued_at: "2026-06-01T12:00:00.000Z",
    expires_at: null,
    credential_document_json: "{}",
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:00:00.000Z",
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
    updated_at: "2026-06-01T12:00:00.000Z",
  };
}

const beforeFixture = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Before · game scan onboarding</title>
  <link rel="stylesheet" href="../../scan-pass.css" />
  <style>body{background:#f2f2f7;margin:0;padding:16px}.page{max-width:420px;margin:0 auto}</style>
</head>
<body>
  <div class="page scan-page">
    <main class="screen scan-screen">
      <article class="scan-hero">
        <p class="scan-hero-eyebrow">NewBo · Relay · gate</p>
        <h1 class="scan-hero-title">NewBo relay arch</h1>
        <p class="scan-hero-line">Red team holds the relay</p>
        <ul class="scan-game-chips"><li class="scan-game-chip">Relay · Red holds</li></ul>
        <p class="scan-game-coop-hint">Red holds this relay on the public board.</p>
        <p class="scan-game-rules-link"><a href="/play/cedar-rapids/#rules-prove-title">What a scan proves</a> · <a href="/play/cedar-rapids/map/">Open board</a></p>
      </article>
      <section class="scan-trust-tools">
        <h2 class="scan-trust-tools-title">Check at scan time</h2>
        <p>Card status · Human trust · This QR · Live control (expanded)</p>
      </section>
    </main>
  </div>
</body>
</html>`;

async function main() {
  mkdirSync(OUT, { recursive: true });

  const vmOpen = buildScanViewModel(
    PROFILE,
    QR,
    {
      card: cardRow(),
      qr: qrRow(),
      verification: summary(),
      childObject: childRow(),
      revocationDisplay: null,
    },
    "https://humanity.llc",
    SEASON_OPEN_NOW,
    { env: { CITY_GAME_ENABLED: "1" } }
  );

  const vmPre = buildScanViewModel(
    PROFILE,
    QR,
    {
      card: cardRow(),
      qr: qrRow(),
      verification: summary(),
      childObject: childRow(),
      revocationDisplay: null,
    },
    "https://humanity.llc",
    new Date("2026-06-06T12:00:00-05:00"),
    {
      env: { CITY_GAME_ENABLED: "1" },
      season: {
        ...defaultSeason(),
        status: "planned",
        window: {
          starts_at: "2026-06-06T18:00:00-05:00",
          ends_at: "2026-06-08T22:00:00-05:00",
        },
      },
    }
  );

  const afterOpen = await renderScanPage(vmOpen, "https://humanity.llc");
  const afterPre = await renderScanPage(vmPre, "https://humanity.llc");

  writeFileSync(join(OUT, "before-legacy-layout.html"), beforeFixture, "utf8");
  writeFileSync(join(OUT, "after-season-open.html"), afterOpen, "utf8");
  writeFileSync(join(OUT, "after-pre-season.html"), afterPre, "utf8");
  console.log(`Wrote onboarding fixtures to ${OUT}`);
}

void main();
