import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { GAME_NODE_FORBIDDEN_COPY } from "../src/city-game/scan-view";
import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";
import {
  forbiddenCopyInMain,
  extractScanMain,
} from "../scripts/city-game-smoke-local-core.mjs";
import type { CardRow, ChildObjectRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const templates = JSON.parse(
  readFileSync(
    join(root, "worker/tests/fixtures/city-game-node-templates.json"),
    "utf8"
  )
).nodes as Record<string, unknown>[];
const rulesHtml = readFileSync(
  join(root, "site/play/cedar-rapids/index.html"),
  "utf8"
);

import { CITY_GAME_SEASON_ROOT_PROFILE } from "./city-game-fixture-profile";

const PROFILE = CITY_GAME_SEASON_ROOT_PROFILE;
const QR = "qr_gameTheoryScan001";

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

function childRow(template: Record<string, unknown>): ChildObjectRow {
  const doc = {
    object_id: template.object_id,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: template.public_label,
    public_state: template.public_state,
    status: "active",
    season_id: template.season_id,
    node_role: template.node_role,
    district: template.district,
    object_streams: template.object_streams,
    game_meta: template.game_meta ?? {},
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:05:00.000Z",
  };
  return {
    object_id: String(template.object_id),
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: String(template.public_label),
    public_state: String(template.public_state),
    status: "active",
    child_object_document_json: JSON.stringify(doc),
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:05:00.000Z",
  };
}

function qrRow(objectId: string): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "child_object",
    print_artifact_id: null,
    object_id: objectId,
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

describe("city game game-theory copy guards", () => {
  it("rules page states game-theory privacy guardrails", () => {
    const lower = rulesHtml.toLowerCase();
    expect(lower).toContain("no leaderboard");
    expect(lower).toContain("no scan tracking");
    expect(lower).not.toMatch(/\byour rank\b/);
    expect(lower).not.toMatch(/\bexperience points\b/);
  });

  it.each(templates)(
    "scan template for $node_id avoids forbidden player-rank copy",
    async (template) => {
      const objectId = String(template.object_id);
      const vm = buildScanViewModel(
        PROFILE,
        QR,
        {
          card: cardRow(),
          qr: qrRow(objectId),
          verification: summary(),
          childObject: childRow(template),
          revocationDisplay: null,
        },
        "https://humanity.llc",
        new Date("2026-06-01T18:00:00.000Z"),
        { env: { CITY_GAME_ENABLED: "1" } }
      );

      const html = await renderScanPage(vm, "https://humanity.llc");
      const main = extractScanMain(html).toLowerCase();
      for (const term of GAME_NODE_FORBIDDEN_COPY) {
        expect(forbiddenCopyInMain(main, term)).toBe(false);
      }
    }
  );
});
