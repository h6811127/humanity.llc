import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildScanViewModel } from "../src/resolver/scan-state";
import { scanStatusBodyFromViewModel } from "../src/resolver/scan-status";
import {
  LIVE_OBJECT_MANIFESTO,
  LIVE_OBJECT_STREAMS,
  SHOWCASE_HANDLE,
  SHOWCASE_PROFILE,
  SHOWCASE_QR,
  STATUS_PLATE_MANIFESTO,
  STATUS_PLATE_OBJECT_STREAMS,
  showcaseCardDocumentJson,
} from "./fixtures/scan-showcase-fixtures";

const SITE_DATA = join(process.cwd(), "site/data");

function readShowcaseJson(name: string) {
  return JSON.parse(readFileSync(join(SITE_DATA, name), "utf8")) as {
    object_streams?: Array<{ id: string; class: string; label: string; value: string }>;
  };
}

function cardRow(manifestoLine: string, cardDocumentJson: string) {
  return {
    profile_id: SHOWCASE_PROFILE,
    public_key: "pk",
    handle: SHOWCASE_HANDLE,
    handle_normalized: SHOWCASE_HANDLE,
    manifesto_line: manifestoLine,
    status: "active" as const,
    card_document_json: cardDocumentJson,
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function qrRow(scope: "card" | "print_artifact" = "print_artifact") {
  return {
    qr_id: SHOWCASE_QR,
    profile_id: SHOWCASE_PROFILE,
    epoch: 1,
    scope,
    print_artifact_id: scope === "print_artifact" ? "artifact_demo" : null,
    resolver_hint: "https://humanity.llc",
    status: "active" as const,
    payload: `https://humanity.llc/c/${SHOWCASE_PROFILE}?q=${SHOWCASE_QR}`,
    issued_at: "2026-05-16T17:00:00Z",
    expires_at: null,
    credential_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

/** MANIFESTO_STATUS_UPDATE exit — committed showcase JSON matches M5 scan fixtures. */
describe("manifesto showcase exit (local)", () => {
  it("showcase-status-plate.json streams match M5 fixtures", () => {
    const data = readShowcaseJson("showcase-status-plate.json");
    expect(data.object_streams).toEqual([...STATUS_PLATE_OBJECT_STREAMS]);
  });

  it("showcase-live-object.json streams match M5 fixtures", () => {
    const data = readShowcaseJson("showcase-live-object.json");
    expect(data.object_streams).toEqual([...LIVE_OBJECT_STREAMS]);
  });

  it("status plate status JSON includes public_snapshot when streams present", () => {
    const vm = buildScanViewModel(
      SHOWCASE_PROFILE,
      SHOWCASE_QR,
      {
        card: cardRow(
          STATUS_PLATE_MANIFESTO,
          showcaseCardDocumentJson(STATUS_PLATE_OBJECT_STREAMS)
        ),
        qr: qrRow(),
        verification: null,
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.card?.object_streams).toHaveLength(1);
    expect(body.scan.card?.public_snapshot?.text).toContain("Studio door");
    expect(body.scan.card?.public_snapshot?.text).toContain("Special hours");
  });

  it("live object status JSON includes public_snapshot when streams present", () => {
    const vm = buildScanViewModel(
      SHOWCASE_PROFILE,
      SHOWCASE_QR,
      {
        card: cardRow(
          LIVE_OBJECT_MANIFESTO,
          showcaseCardDocumentJson(LIVE_OBJECT_STREAMS)
        ),
        qr: qrRow(),
        verification: null,
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.card?.object_streams?.[0]?.id).toBe("returns");
    expect(body.scan.card?.public_snapshot?.text).toContain("Returns due");
  });
});
