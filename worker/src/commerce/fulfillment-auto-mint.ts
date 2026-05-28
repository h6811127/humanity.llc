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
import { printifySubmitEnabled } from "../print/printify-client";
import { submitPrintOrderToPrintify } from "../print/print-order-printify-submit";

export interface AutoPrintifySubmitResult {
  attempted: boolean;
  submitted: boolean;
  skipped: boolean;
  code?: string;
}

export interface AutoMintFromIntentsResult {
  attempted: boolean;
  all_planned_minted: boolean;
  print_order_id: string | null;
  minted_count: number;
  failure_count: number;
  printify_submit: AutoPrintifySubmitResult;
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

const SUBMIT_DISABLED: AutoPrintifySubmitResult = {
  attempted: false,
  submitted: false,
  skipped: true,
};

/**
 * Idempotent Printify submit after all planned QRs are minted.
 * Gated by PRINTIFY_SUBMIT_ENABLED; non-fatal for webhook processing.
 */
export async function tryAutoSubmitPrintOrderToPrintify(
  request: Request,
  env: Env,
  db: D1Database,
  printOrderId: string
): Promise<AutoPrintifySubmitResult> {
  if (!printifySubmitEnabled(env)) {
    return SUBMIT_DISABLED;
  }

  const printOrder = await getPrintOrderById(db, printOrderId);
  if (!printOrder) {
    return SUBMIT_DISABLED;
  }

  const minted = await allPlannedQrsMinted(db, printOrder);
  if (!minted) {
    return SUBMIT_DISABLED;
  }

  const submitResult = await submitPrintOrderToPrintify(request, env, db, printOrder, {});
  if (submitResult.ok) {
    return {
      attempted: true,
      submitted: submitResult.skipped !== true,
      skipped: submitResult.skipped === true,
    };
  }

  return {
    attempted: true,
    submitted: false,
    skipped: false,
    code: submitResult.code,
  };
}

function emptyMintResult(
  printOrderId: string | null,
  overrides: Partial<AutoMintFromIntentsResult> = {}
): AutoMintFromIntentsResult {
  return {
    attempted: false,
    all_planned_minted: false,
    print_order_id: printOrderId,
    minted_count: 0,
    failure_count: 0,
    printify_submit: SUBMIT_DISABLED,
    ...overrides,
  };
}

/**
 * Mint planned QRs on a print order when artifact intents carry pre-signed credentials.
 * Non-fatal: webhook processing continues when mint fails (operator can retry manually).
 */
export async function tryAutoMintPrintOrderFromIntents(
  request: Request,
  env: Env,
  db: D1Database,
  printOrderId: string,
  artifactIntentIds: string[]
): Promise<AutoMintFromIntentsResult> {
  const printOrder = await getPrintOrderById(db, printOrderId);
  if (!printOrder) {
    return emptyMintResult(null);
  }

  const credentials = await collectPreMintCredentialsForIntents(db, artifactIntentIds);
  if (credentials.length === 0) {
    const alreadyMinted = await allPlannedQrsMinted(db, printOrder);
    const printifySubmit = alreadyMinted
      ? await tryAutoSubmitPrintOrderToPrintify(request, env, db, printOrder.order_id)
      : SUBMIT_DISABLED;
    return emptyMintResult(printOrder.order_id, {
      all_planned_minted: alreadyMinted,
      printify_submit: printifySubmit,
    });
  }

  const mintResult = await mintPrintOrderFromCredentials(
    request,
    db,
    printOrder,
    credentials
  );

  if (!mintResult.ok) {
    return emptyMintResult(printOrder.order_id, {
      attempted: true,
      failure_count: credentials.length,
      printify_submit: SUBMIT_DISABLED,
    });
  }

  const printifySubmit = mintResult.all_planned_minted
    ? await tryAutoSubmitPrintOrderToPrintify(request, env, db, printOrder.order_id)
    : SUBMIT_DISABLED;

  return {
    attempted: true,
    all_planned_minted: mintResult.all_planned_minted,
    print_order_id: printOrder.order_id,
    minted_count: mintResult.minted.length,
    failure_count: mintResult.failures.length,
    printify_submit: printifySubmit,
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
