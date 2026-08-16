import { describe, expect, it } from "vitest";

import { allPlannedQrsMinted, getPlannedMintStatus } from "../src/commerce/fulfillment-mint";
import type { PrintOrderRow } from "../src/db/print-orders";

const PROFILE_A = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const PROFILE_B = "8Ym2nQ4pR6sT8vW1yZ3aB5cD7";
const QR_A = "qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6";
const QR_B = "qr_9Zm2pR4qS6tV8xY1aB3cD5eF7";
const QR_SQUAT = "qr_squatOtherActive919";
const PA_A = "pa_testPreMintAuto919";
const PA_B = "pa_testPreMintAuto818";
const NOW = "2026-08-16T10:00:00.000Z";

type ActiveQr = {
  profile_id: string;
  print_artifact_id: string;
  qr_id: string;
  scope: string;
  status: string;
};

class FakeMintStatusDb {
  active: ActiveQr[] = [];

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (
              sql.includes("FROM qr_credentials") &&
              sql.includes("print_artifact_id = ?") &&
              sql.includes("scope = 'print_artifact'") &&
              sql.includes("status = 'active'")
            ) {
              const profileId = String(args[0]);
              const printArtifactId = String(args[1]);
              const match = self.active.find(
                (row) =>
                  row.profile_id === profileId &&
                  row.print_artifact_id === printArtifactId &&
                  row.scope === "print_artifact" &&
                  row.status === "active"
              );
              return (match
                ? { qr_id: match.qr_id, print_artifact_id: match.print_artifact_id }
                : null) as T | null;
            }
            return null;
          },
        };
      },
    };
  }
}

function db(fake: FakeMintStatusDb): D1Database {
  return fake as unknown as D1Database;
}

function printOrder(overrides: Partial<PrintOrderRow> = {}): PrintOrderRow {
  return {
    order_id: "po_mintStatusAa919",
    profile_id: PROFILE_A,
    print_artifact_ids_json: JSON.stringify([PA_A]),
    planned_item_qr_ids_json: JSON.stringify([QR_A]),
    commerce_order_id: "co_mintStatusAa919",
    shopify_order_id: "450789469",
    printify_order_id: null,
    printify_shop_id: null,
    template_id: "hc-sticker-square-v1",
    print_variant_id: null,
    print_frame_background: "full",
    status: "awaiting_production_approval",
    shipping_method: "standard",
    tracking_carrier: null,
    tracking_number: null,
    tracking_url: null,
    last_reconciled_at: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function active(
  printArtifactId: string,
  qrId: string,
  overrides: Partial<ActiveQr> = {}
): ActiveQr {
  return {
    profile_id: PROFILE_A,
    print_artifact_id: printArtifactId,
    qr_id: qrId,
    scope: "print_artifact",
    status: "active",
    ...overrides,
  };
}

describe("planned mint status helpers", () => {
  it("marks an order complete only when every planned QR is the active print_artifact credential", async () => {
    const fake = new FakeMintStatusDb();
    fake.active.push(active(PA_A, QR_A), active(PA_B, QR_B));

    const order = printOrder({
      print_artifact_ids_json: JSON.stringify([PA_A, PA_B]),
      planned_item_qr_ids_json: JSON.stringify([QR_A, QR_B]),
    });

    const status = await getPlannedMintStatus(db(fake), order);
    expect(status.all_planned_minted).toBe(true);
    expect(status.items).toEqual([
      {
        print_artifact_id: PA_A,
        planned_qr_id: QR_A,
        minted: true,
        active_qr_id: QR_A,
      },
      {
        print_artifact_id: PA_B,
        planned_qr_id: QR_B,
        minted: true,
        active_qr_id: QR_B,
      },
    ]);
    await expect(allPlannedQrsMinted(db(fake), order)).resolves.toBe(true);
  });

  it("treats a squat / wrong active QR as not minted", async () => {
    const fake = new FakeMintStatusDb();
    fake.active.push(active(PA_A, QR_SQUAT));

    const status = await getPlannedMintStatus(db(fake), printOrder());
    expect(status.all_planned_minted).toBe(false);
    expect(status.items).toEqual([
      {
        print_artifact_id: PA_A,
        planned_qr_id: QR_A,
        minted: false,
        active_qr_id: QR_SQUAT,
      },
    ]);
    await expect(allPlannedQrsMinted(db(fake), printOrder())).resolves.toBe(false);
  });

  it("does not treat another steward's active QR as minted", async () => {
    const fake = new FakeMintStatusDb();
    fake.active.push(active(PA_A, QR_A, { profile_id: PROFILE_B }));

    const status = await getPlannedMintStatus(db(fake), printOrder());
    expect(status.all_planned_minted).toBe(false);
    expect(status.items[0]).toEqual({
      print_artifact_id: PA_A,
      planned_qr_id: QR_A,
      minted: false,
      active_qr_id: null,
    });
  });

  it("returns all_planned_minted false when any planned pair is still missing", async () => {
    const fake = new FakeMintStatusDb();
    fake.active.push(active(PA_A, QR_A));

    const order = printOrder({
      print_artifact_ids_json: JSON.stringify([PA_A, PA_B]),
      planned_item_qr_ids_json: JSON.stringify([QR_A, QR_B]),
    });

    const status = await getPlannedMintStatus(db(fake), order);
    expect(status.all_planned_minted).toBe(false);
    expect(status.items.map((item) => item.minted)).toEqual([true, false]);
    await expect(allPlannedQrsMinted(db(fake), order)).resolves.toBe(false);
  });

  it("treats an empty planned QR list as already minted", async () => {
    const fake = new FakeMintStatusDb();
    await expect(
      allPlannedQrsMinted(
        db(fake),
        printOrder({
          planned_item_qr_ids_json: "[]",
          print_artifact_ids_json: "[]",
        })
      )
    ).resolves.toBe(true);
  });

  it("does not report completion when the print-artifact list is empty", async () => {
    const fake = new FakeMintStatusDb();
    const status = await getPlannedMintStatus(
      db(fake),
      printOrder({
        print_artifact_ids_json: "[]",
        planned_item_qr_ids_json: JSON.stringify([QR_A]),
      })
    );
    expect(status.items).toEqual([]);
    expect(status.all_planned_minted).toBe(false);
  });
});
