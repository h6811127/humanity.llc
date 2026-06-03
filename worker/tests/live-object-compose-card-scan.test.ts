import { describe, expect, it } from "vitest";

import { defaultSeason } from "../src/city-game/season-loader";
import { composeCardScanState } from "../src/live-object/compose-card-scan-state";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { buildScanCapabilities } from "../src/live-object/scan-capabilities";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_card_streams001";

describe("composeCardScanState (Order 4 — card-scope stream policy)", () => {
  it("passes plain streams when care is clear", () => {
    const result = composeCardScanState({
      cardDocumentJson: JSON.stringify({
        object_streams: [
          { id: "tasks", class: "care", label: "Tasks", value: "Water beds" },
          { id: "note", class: "narrative", label: "Note", value: "Open late" },
        ],
      }),
      season: defaultSeason(),
      now: new Date("2026-06-07T12:00:00.000Z"),
    });
    expect(result.streamPolicy.phase).toBe("plain");
    expect(result.objectStreams).toHaveLength(2);
    expect(result.objectStreams[0]?.value).toBe("Water beds");
  });

  it("detects care pause without muting signed stream values", () => {
    const result = composeCardScanState({
      cardDocumentJson: JSON.stringify({
        object_streams: [
          {
            id: "care",
            class: "care",
            label: "Site",
            value: "Closed for maintenance",
          },
          { id: "note", class: "narrative", label: "Note", value: "Stored" },
        ],
      }),
      season: defaultSeason(),
      now: new Date("2026-06-07T12:00:00.000Z"),
    });
    expect(result.streamPolicy.phase).toBe("care_pause");
    expect(result.streamPolicy.carePaused).toBe(true);
    expect(result.objectStreams.find((s) => s.id === "note")?.value).toBe("Stored");
  });
});

describe("card-scope scan view model", () => {
  it("applies stream policy to card object_streams on active card QR scans", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: {
          profile_id: PROFILE,
          public_key: "pk",
          handle: "garden_gate",
          handle_normalized: "garden_gate",
          manifesto_line: "Community garden\nOpen · volunteers welcome",
          status: "active",
          card_document_json: JSON.stringify({
            object_streams: [
              {
                id: "care",
                class: "care",
                label: "Site",
                value: "Closed for maintenance",
              },
            ],
          }),
          created_at: "2026-05-16T17:00:00.000Z",
          updated_at: "2026-05-17T12:00:00.000Z",
        },
        qr: {
          qr_id: QR,
          profile_id: PROFILE,
          epoch: 1,
          scope: "card",
          print_artifact_id: null,
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
          issued_at: "2026-05-16T17:00:00.000Z",
          expires_at: null,
          credential_document_json: null,
          created_at: "2026-05-16T17:00:00.000Z",
          updated_at: "2026-05-16T17:00:00.000Z",
        },
        verification: null,
        revocationDisplay: null,
      },
      "https://humanity.llc",
      new Date("2026-06-07T12:00:00.000Z")
    );

    expect(vm.qrScope).toBe("card");
    expect(vm.objectStreams[0]?.value).toBe("Closed for maintenance");
    expect(buildScanCapabilities(vm).find((c) => c.verb === "archive")).toMatchObject({
      available: true,
      state: "care_pause",
    });
  });
});
