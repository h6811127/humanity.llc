import { describe, expect, it } from "vitest";

import type { CardRow, ChildObjectRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_child_status_plate01";
const OBJECT_ID = "obj_status_plate_live1";
const ORIGIN = "https://humanity.llc";

function card(): CardRow {
  return {
    profile_id: PROFILE,
    public_key: "pk",
    handle: "river_example",
    handle_normalized: "river_example",
    manifesto_line: "Root manifesto",
    status: "active",
    card_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function child(overrides: Partial<ChildObjectRow> = {}): ChildObjectRow {
  return {
    object_id: OBJECT_ID,
    parent_profile_id: PROFILE,
    object_type: "status_plate",
    public_label: "Studio door",
    public_state: "Open until 9 PM",
    status: "active",
    child_object_document_json: JSON.stringify({
      object_streams: [
        { id: "tasks", class: "care", label: "Today's tasks", value: "Water bed 3" },
      ],
    }),
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

function childQr(): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "child_object",
    print_artifact_id: null,
    object_id: OBJECT_ID,
    resolver_hint: ORIGIN,
    status: "active",
    payload: `${ORIGIN}/c/${PROFILE}?q=${QR}`,
    issued_at: "2026-05-16T17:00:00Z",
    expires_at: null,
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

function childScanVm(childRow: ChildObjectRow) {
  return buildScanViewModel(
    PROFILE,
    QR,
    {
      card: {
        ...card(),
        manifesto_line: `${childRow.public_label}\n${childRow.public_state}`,
      },
      qr: childQr(),
      verification: summary(),
      revocationDisplay: null,
      childObject: childRow,
    },
    ORIGIN
  );
}

describe("live object child scan (Layer 1 — status plate + lost-item relay)", () => {
  it("exposes first-class child public fields on the scan view model", () => {
    const row = child();
    const vm = childScanVm(row);
    expect(vm.childObjectType).toBe("status_plate");
    expect(vm.childObjectId).toBe(OBJECT_ID);
    expect(vm.childPublicLabel).toBe("Studio door");
    expect(vm.childPublicState).toBe("Open until 9 PM");
    expect(vm.qrScope).toBe("child_object");
  });

  it("reflects owner updates in childPublicState without changing manifesto bridge shape", () => {
    const row = child({ public_state: "Closed until Monday" });
    const vm = childScanVm(row);
    expect(vm.childPublicState).toBe("Closed until Monday");
    expect(vm.manifestoLine).toContain("Closed until Monday");
  });

  it("renders status plate hero from child object fields and child object_streams", async () => {
    const vm = childScanVm(child());
    const html = await renderScanPage(vm, ORIGIN);
    expect(html).toContain("Studio door");
    expect(html).toContain("Open until 9 PM");
    expect(html).toContain("Today's tasks");
    expect(html).toContain("Water bed 3");
    expect(html).toContain(`data-object-id="${OBJECT_ID}"`);
  });

  it("renders lost-item relay hero from child object type", async () => {
    const row = child({
      object_type: "lost_item_relay",
      public_label: "House keys",
      public_state: "Lost — contact owner through relay",
      child_object_document_json: "{}",
    });
    const vm = childScanVm(row);
    expect(vm.childObjectType).toBe("lost_item_relay");
    const html = await renderScanPage(vm, ORIGIN);
    expect(html).toContain("Lost item relay");
    expect(html).toContain("House keys");
    expect(html).toContain("Lost — contact owner through relay");
  });
});
