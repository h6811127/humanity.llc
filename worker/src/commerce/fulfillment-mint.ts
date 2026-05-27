import type { PrintOrderRow } from "../db/print-orders";
import {
  mintPrintArtifactFromSignedCredential,
  type MintPrintArtifactSuccess,
} from "../resolver/mint-print-artifact-qr";

export interface FulfillmentMintFailure {
  index: number;
  qr_id: string | null;
  print_artifact_id: string | null;
  code: string;
  message: string;
}

export interface FulfillmentMintResult {
  ok: true;
  minted: MintPrintArtifactSuccess[];
  failures: FulfillmentMintFailure[];
  all_planned_minted: boolean;
}

export interface FulfillmentMintError {
  ok: false;
  code: string;
  message: string;
  httpStatus: number;
}

function plannedPairs(printOrder: PrintOrderRow): Map<string, string> {
  const qrIds = JSON.parse(printOrder.planned_item_qr_ids_json) as string[];
  const paIds = JSON.parse(printOrder.print_artifact_ids_json) as string[];
  const pairs = new Map<string, string>();
  for (let i = 0; i < qrIds.length; i++) {
    const qrId = qrIds[i];
    const paId = paIds[i];
    if (qrId && paId) pairs.set(qrId, paId);
  }
  return pairs;
}

/**
 * Batch mint print_order planned credentials (owner-signed, no resolver-held keys).
 * Policy: docs/MERCH_QR_LIFECYCLE_POLICY.md § Fulfillment pipeline step 3.
 */
export async function mintPrintOrderFromCredentials(
  request: Request,
  db: D1Database,
  printOrder: PrintOrderRow,
  qrCredentials: Record<string, unknown>[]
): Promise<FulfillmentMintResult | FulfillmentMintError> {
  const expected = plannedPairs(printOrder);
  if (expected.size === 0) {
    return {
      ok: false,
      code: "PRINT_ORDER_EMPTY",
      message: "Print order has no planned item QR ids.",
      httpStatus: 422,
    };
  }

  if (qrCredentials.length !== expected.size) {
    return {
      ok: false,
      code: "PLANNED_QR_COUNT_MISMATCH",
      message: `Expected ${expected.size} signed qr_credentials; received ${qrCredentials.length}.`,
      httpStatus: 422,
    };
  }

  const seenQr = new Set<string>();
  const seenPa = new Set<string>();
  const minted: MintPrintArtifactSuccess[] = [];
  const failures: FulfillmentMintFailure[] = [];

  for (let index = 0; index < qrCredentials.length; index++) {
    const credential = qrCredentials[index]!;
    const unsigned = credential as { qr_id?: unknown; print_artifact_id?: unknown };
    const qrId = typeof unsigned.qr_id === "string" ? unsigned.qr_id : null;
    const paId =
      typeof unsigned.print_artifact_id === "string" ? unsigned.print_artifact_id : null;

    if (!qrId || !paId || !expected.has(qrId) || expected.get(qrId) !== paId) {
      failures.push({
        index,
        qr_id: qrId,
        print_artifact_id: paId,
        code: "PLANNED_QR_MISMATCH",
        message: "Credential qr_id/print_artifact_id does not match print order plan.",
      });
      continue;
    }
    if (seenQr.has(qrId) || seenPa.has(paId)) {
      failures.push({
        index,
        qr_id: qrId,
        print_artifact_id: paId,
        code: "DUPLICATE_PLANNED_QR",
        message: "Duplicate planned qr_id or print_artifact_id in batch.",
      });
      continue;
    }
    seenQr.add(qrId);
    seenPa.add(paId);

    const result = await mintPrintArtifactFromSignedCredential(
      request,
      db,
      printOrder.profile_id,
      credential,
      { allowAlreadyMinted: true }
    );

    if (!result.ok) {
      failures.push({
        index,
        qr_id: qrId,
        print_artifact_id: paId,
        code: result.code,
        message: result.message,
      });
      continue;
    }

    minted.push(result);
  }

  return {
    ok: true,
    minted,
    failures,
    all_planned_minted: failures.length === 0 && minted.length === expected.size,
  };
}

export async function allPlannedQrsMinted(
  db: D1Database,
  printOrder: PrintOrderRow
): Promise<boolean> {
  const status = await getPlannedMintStatus(db, printOrder);
  return status.all_planned_minted;
}

export interface PlannedMintItemStatus {
  print_artifact_id: string;
  planned_qr_id: string;
  minted: boolean;
  active_qr_id: string | null;
}

export interface PlannedMintStatus {
  all_planned_minted: boolean;
  items: PlannedMintItemStatus[];
}

export async function getPlannedMintStatus(
  db: D1Database,
  printOrder: PrintOrderRow
): Promise<PlannedMintStatus> {
  const { getActivePrintArtifactQr } = await import("../db/print-artifact-qr");
  const qrIds = JSON.parse(printOrder.planned_item_qr_ids_json) as string[];
  const paIds = JSON.parse(printOrder.print_artifact_ids_json) as string[];
  const items: PlannedMintItemStatus[] = [];

  for (let i = 0; i < paIds.length; i++) {
    const paId = paIds[i]!;
    const plannedQrId = qrIds[i] ?? "";
    const active = await getActivePrintArtifactQr(db, printOrder.profile_id, paId);
    const minted = !!active && active.qr_id === plannedQrId;
    items.push({
      print_artifact_id: paId,
      planned_qr_id: plannedQrId,
      minted,
      active_qr_id: active?.qr_id ?? null,
    });
  }

  return {
    all_planned_minted: items.length > 0 && items.every((item) => item.minted),
    items,
  };
}
