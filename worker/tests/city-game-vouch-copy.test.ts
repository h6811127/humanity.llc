import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";
import type { CardRow, ChildObjectRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import {
  RULES_PAGE_REL,
  auditGameNodeScanVouchCopy,
  auditRulesPageVouchCopy,
} from "../scripts/city-game-vouch-copy-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rulesHtml = readFileSync(join(root, RULES_PAGE_REL), "utf8");

import {
  CITY_GAME_SEASON_OPEN_NOW,
  CITY_GAME_SEASON_ROOT_PROFILE,
} from "./city-game-fixture-profile";

const PROFILE = CITY_GAME_SEASON_ROOT_PROFILE;
const QR = "qr_7Xk9mP2nQ4rT6vW8";

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

describe("city-game-vouch-copy (B1)", () => {
  it("rules page distinguishes game witness path from human Steward vouch", () => {
    const { ok, issues } = auditRulesPageVouchCopy(rulesHtml);
    expect(issues).toEqual([]);
    expect(ok).toBe(true);
  });

  it("flags rules page that ties Steward vouch to cabinet unlock", () => {
    const bad = rulesHtml.replace(
      "witness seal or nearby vouch",
      "Steward vouch on the cabinet unlocks node_07"
    );
    const { ok, issues } = auditRulesPageVouchCopy(bad);
    expect(ok).toBe(false);
    expect(issues.some((issue) => issue.includes("Steward vouch"))).toBe(true);
  });

  it("node_07 scan uses witness/trust-path copy, not game chips Issue vouch", async () => {
    const cabinetObject = "obj_cr_node_07_cabinet";
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(cabinetObject),
        verification: summary(),
        childObject: {
          object_id: cabinetObject,
          parent_profile_id: PROFILE,
          object_type: "game_node",
          public_label: "Czech Village cabinet",
          public_state: "Locked until River Lantern quorum",
          status: "active",
          child_object_document_json: JSON.stringify({
            object_id: cabinetObject,
            parent_profile_id: PROFILE,
            object_type: "game_node",
            public_label: "Czech Village cabinet",
            public_state: "Locked until River Lantern quorum",
            status: "active",
            season_id: "cr_season_01_wake",
            node_role: "lore_archive",
            district: "czech_village",
            object_streams: [
              { id: "territory", class: "place", label: "Gate", value: "Vouch required" },
            ],
            game_meta: {
              visible_until: null,
              compromised: false,
              collective_progress: null,
              collective_target: null,
              unlocked_by: [],
              vouch_requires: ["node_10"],
              vouch_active_for: [],
              scarcity_remaining: null,
              fragment_id: "czech_1",
            },
            created_at: "2026-06-01T12:00:00.000Z",
            updated_at: "2026-06-01T12:05:00.000Z",
          }),
          created_at: "2026-06-01T12:00:00.000Z",
          updated_at: "2026-06-01T12:05:00.000Z",
        },
        revocationDisplay: null,
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      {
        env: { CITY_GAME_ENABLED: "1" },
        gameVouchWitnesses: {
          node_10: {
            visible_until: null,
            compromised: false,
            collective_progress: null,
            collective_target: null,
            unlocked_by: [],
            vouch_requires: [],
            vouch_active_for: [],
            scarcity_remaining: null,
            fragment_id: null,
          },
        },
      }
    );

    const html = await renderScanPage(vm, "https://humanity.llc");
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;
    const { ok, issues } = auditGameNodeScanVouchCopy(main);
    expect(issues).toEqual([]);
    expect(ok).toBe(true);
    expect(main).toContain("Vouch pending from node_10");
    expect(main).toContain("scan-game-vouch-note");
  });
});
