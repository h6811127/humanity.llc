import { describe, expect, it } from "vitest";

import {
  factionBadgeObjectStreams,
  resolveFactionBadgeScanForPrintArtifact,
} from "../src/city-game/faction-badge";
import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { CITY_GAME_SEASON_OPEN_NOW } from "./city-game-fixture-profile";

const PROFILE = "CEenC57QN9qqnr2x5L89cbWt";
const QR = "qr_factionBadgeTest01";
const PA = "pa_factionBadgeWrist01";

const ENROLLMENT = {
  profile_id: PROFILE,
  print_artifact_id: PA,
  label: "Red team wristband",
  role: "faction_badge",
  faction: "red",
  mission_line: "Hold the river spine relays through Sunday",
  achievement_lines: ["First capture · Bridge relay", "Sanctuary pledge"],
  enrolled_at: "2026-06-01T12:00:00.000Z",
};

function cardRow(): CardRow {
  return {
    profile_id: PROFILE,
    public_key: "pk",
    handle: "badge_player",
    handle_normalized: "badge_player",
    manifesto_line: "Red team · weekend",
    status: "active",
    card_document_json: "{}",
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:00:00.000Z",
  };
}

function qrRow(): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "print_artifact",
    print_artifact_id: PA,
    object_id: null,
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

describe("faction badge scan (SW-15)", () => {
  it("builds public object streams from enrollment", () => {
    const streams = factionBadgeObjectStreams(ENROLLMENT);
    expect(streams.find((s) => s.label === "Faction")?.value).toContain("Red");
    expect(streams.find((s) => s.label === "Mission")?.value).toContain("river spine");
    expect(streams.find((s) => s.label === "Achievements")?.value).toContain("Bridge relay");
  });

  it("renders game scan for enrolled faction badge without merch funnel", async () => {
    const season = {
      season_id: "cr_season_01_wake",
      window: { starts_at: "2026-06-06T18:00:00-05:00", ends_at: "2026-09-01T22:00:00-05:00" },
      mobile_lore_enrollment: [ENROLLMENT],
    };

    const resolved = resolveFactionBadgeScanForPrintArtifact({
      profileId: PROFILE,
      printArtifactId: PA,
      env: { CITY_GAME_ENABLED: "1" },
      season,
      enrollmentRows: season.mobile_lore_enrollment,
      now: CITY_GAME_SEASON_OPEN_NOW,
    });

    expect(resolved?.gameNode.nodeRole).toBe("faction_badge");
    expect(resolved?.gameNode.showsContribute).toBe(false);

    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(),
        verification: summary(),
        childObject: null,
        revocationDisplay: null,
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      {
        env: { CITY_GAME_ENABLED: "1" },
        season,
        mobileLoreEnrollment: season.mobile_lore_enrollment,
      }
    );

    expect(vm.gameNode?.nodeRole).toBe("faction_badge");
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Faction badge");
    expect(html).toContain("Red team");
    expect(html).toContain("Hold the river spine");
    expect(html).not.toContain("Create your live object");
  });
});
