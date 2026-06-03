import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  mobileLoreObjectStreams,
  resolveMobileLoreScanForPrintArtifact,
} from "../src/city-game/mobile-lore";
import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { CITY_GAME_SEASON_OPEN_NOW } from "./city-game-fixture-profile";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

const PROFILE = "CEenC57QN9qqnr2x5L89cbWt";
const QR = "qr_mobileLoreTest001";
const PA = "pa_glitchHoodieCourier01";

const ENROLLMENT = {
  profile_id: PROFILE,
  print_artifact_id: PA,
  label: "Courier North",
  role: "mobile_lore",
  fragment_hint: "Fragment 3 · check Greene at dusk",
  enrolled_at: "2026-06-01T12:00:00.000Z",
};

function cardRow(): CardRow {
  return {
    profile_id: PROFILE,
    public_key: "pk",
    handle: "glitch_courier",
    handle_normalized: "glitch_courier",
    manifesto_line: "Lantern Ward\nWatching the river spine",
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

describe("mobile lore enrollment", () => {
  it("builds object streams from enrollment + owner manifesto", () => {
    const streams = mobileLoreObjectStreams(ENROLLMENT, cardRow().manifesto_line);
    expect(streams.find((s) => s.label === "Courier")?.value).toBe("Courier North");
    expect(streams.find((s) => s.label === "Drop")?.value).toBe(
      "Fragment 3 · check Greene at dusk"
    );
    expect(streams.find((s) => s.label === "Status")?.value).toBe("Lantern Ward");
  });

  it("renders Cedar Rapids game scan for enrolled print_artifact hoodie", async () => {
    const seasonWithEnrollment = {
      ...season,
      mobile_lore_enrollment: [ENROLLMENT],
    };

    const resolved = resolveMobileLoreScanForPrintArtifact({
      profileId: PROFILE,
      printArtifactId: PA,
      manifestoLine: cardRow().manifesto_line,
      env: { CITY_GAME_ENABLED: "1" },
      season: seasonWithEnrollment,
      enrollmentRows: seasonWithEnrollment.mobile_lore_enrollment,
      now: CITY_GAME_SEASON_OPEN_NOW,
    });

    expect(resolved?.gameNode.mode).toBe("game");
    expect(resolved?.gameNode.nodeRole).toBe("mobile_lore");

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
        season: seasonWithEnrollment,
        mobileLoreEnrollment: seasonWithEnrollment.mobile_lore_enrollment,
      }
    );

    expect(vm.gameNode?.nodeRole).toBe("mobile_lore");
    expect(vm.gameNode?.showsContribute).toBe(false);

    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Mobile lore");
    expect(html).toContain("Courier North");
    expect(html).toContain("Fragment 3 · check Greene at dusk");
    expect(html).not.toContain("Create your live object");
  });

  it("falls back to merch funnel when print_artifact is not enrolled", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: { ...cardRow(), manifesto_line: "Wake the city" },
        qr: qrRow(),
        verification: summary(),
        childObject: null,
        revocationDisplay: null,
      },
      "https://humanity.llc",
      new Date("2026-06-01T18:00:00.000Z"),
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vm.gameNode).toBeNull();
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Create your live object");
  });
});
