/**
 * Post-payment auto-mint from pre-checkout owner-signed credentials on artifact intents.
 * See docs/MERCH_HEADLESS_COMMERCE.md § End-to-end flow (Tier 1 personalized).
 */
import {
  allPlannedQrsMinted,
  mintPrintOrderFromCredentials,
} from "./fulfillment-mint";
import { getArtifactIntent } from "../db/artifact-intents";
import { getPrintOrderById, type PrintOrderRow } from "../db/print-orders";
import type { Env } from "../env";

export interface AutoMintFromIntentsResult {
  attempted: boolean;
  all_planned_minted: boolean;
  print_order_id: string | null;
  minted_count: number;
  failure_count: number;
}

function parsePendingMintCredentials(raw: string | null | undefined): Record<string, unknown>[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === "object"
    );
  } catch {
    return [];
  }
}

export async function collectPreMintCredentialsForIntents(
  db: D1Database,
  artifactIntentIds: string[]
): Promise<Record<string, unknown>[]> {
  const credentials: Record<string, unknown>[] = [];
  for (const intentId of artifactIntentIds) {
    const intent = await getArtifactIntent(db, intentId);
    if (!intent) continue;
    credentials.push(...parsePendingMintCredentials(intent.pending_mint_credentials_json));
  }
  return credentials;
}

/**
 * Mint planned QRs on a print order when artifact intents carry pre-signed credentials.
 * Non-fatal: webhook processing continues when mint fails (operator can retry manually).
 */
export async function tryAutoMintPrintOrderFromIntents(
  request: Request,
  _env: Env,
  db: D1Database,
  printOrderId: string,
  artifactIntentIds: string[]
): Promise<AutoMintFromIntentsResult> {
  const printOrder = await getPrintOrderById(db, printOrderId);
  if (!printOrder) {
    return {
      attempted: false,
      all_planned_minted: false,
      print_order_id: null,
      minted_count: 0,
      failure_count: 0,
    };
  }

  const credentials = await collectPreMintCredentialsForIntents(db, artifactIntentIds);
  if (credentials.length === 0) {
    const alreadyMinted = await allPlannedQrsMinted(db, printOrder);
    return {
      attempted: false,
      all_planned_minted: alreadyMinted,
      print_order_id: printOrder.order_id,
      minted_count: 0,
      failure_count: 0,
    };
  }

  const mintResult = await mintPrintOrderFromCredentials(
    request,
    db,
    printOrder,
    credentials
  );

  if (!mintResult.ok) {
    return {
      attempted: true,
      all_planned_minted: false,
      print_order_id: printOrder.order_id,
      minted_count: 0,
      failure_count: credentials.length,
    };
  }

  return {
    attempted: true,
    all_planned_minted: mintResult.all_planned_minted,
    print_order_id: printOrder.order_id,
    minted_count: mintResult.minted.length,
    failure_count: mintResult.failures.length,
  };
}

export async function tryAutoMintQueuedPrintOrders(
  request: Request,
  env: Env,
  db: D1Database,
  printOrderIds: string[],
  artifactIntentIds: string[]
): Promise<AutoMintFromIntentsResult[]> {
  const results: AutoMintFromIntentsResult[] = [];
  for (const printOrderId of printOrderIds) {
    results.push(
      await tryAutoMintPrintOrderFromIntents(
        request,
        env,
        db,
        printOrderId,
        artifactIntentIds
      )
    );
  }
  return results;
}

export type { PrintOrderRow };
