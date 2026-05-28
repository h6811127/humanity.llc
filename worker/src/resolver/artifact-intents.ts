import { PROFILE_ID_REGEX } from "../crypto";
import {
  getArtifactIntent,
  insertArtifactIntent,
  updateArtifactIntentStatus,
  type ArtifactIntentRow,
} from "../db/artifact-intents";
import { loadScanContext } from "../db/scan";
import { errorResponse, jsonResponse, requestOrigin } from "../http/resolver";
import {
  generateArtifactIntentId,
  generatePrintArtifactId,
  generateQrId,
} from "../id";
import { buildScanViewModel, QR_ID_REGEX, type ScanPageKind } from "./scan-state";
import {
  getPrintCatalogProduct,
  isKnownStoreProductId,
  resolvePrintTemplateForStoreProductId,
} from "../print/print-catalog";

interface ArtifactIntentRequest {
  profile_id?: unknown;
  source_qr_id?: unknown;
  product_id?: unknown;
  print_template_id?: unknown;
  quantity?: unknown;
  shopify_variant_id?: unknown;
  proof_acknowledged?: unknown;
}

interface BlockReason {
  code: string;
  message: string;
}

const BLOCK_REASONS: Partial<Record<ScanPageKind, BlockReason>> = {
  card_revoked: {
    code: "CARD_REVOKED",
    message: "Card is revoked. New artifact intents are blocked.",
  },
  card_suspended: {
    code: "CARD_SUSPENDED",
    message: "Card is suspended. New artifact intents are blocked.",
  },
  card_expired: {
    code: "CARD_EXPIRED",
    message: "Card is expired. New artifact intents are blocked.",
  },
  qr_revoked: {
    code: "QR_REVOKED",
    message: "QR credential is revoked. New artifact intents are blocked.",
  },
  qr_expired: {
    code: "QR_EXPIRED",
    message: "QR credential is expired. New artifact intents are blocked.",
  },
  qr_replaced: {
    code: "QR_REPLACED",
    message: "QR credential is replaced. New artifact intents are blocked.",
  },
};

/** Short-lived intent for cart attach + Shopify metadata spike (A-001). */
export const ARTIFACT_INTENT_TTL_MS = 60 * 60 * 1000;

const MAX_ARTIFACT_INTENT_QUANTITY = 10;

function parseQuantity(raw: unknown): number | null {
  if (raw === undefined || raw === null) return 1;
  if (typeof raw !== "number" || !Number.isInteger(raw)) return null;
  if (raw < 1 || raw > MAX_ARTIFACT_INTENT_QUANTITY) return null;
  return raw;
}

function artifactIntentResponse(
  row: ArtifactIntentRow,
  origin: string,
  shopifyVariantId: string | null
) {
  const plannedItemQrIds = JSON.parse(row.planned_item_qr_ids_json) as string[];
  const plannedPrintArtifactIds = JSON.parse(
    row.planned_print_artifact_ids_json
  ) as string[];

  return {
    artifact_intent_id: row.artifact_intent_id,
    profile_id: row.profile_id,
    source_qr_id: row.source_qr_id,
    planned_item_qr_ids: plannedItemQrIds,
    planned_print_artifact_ids: plannedPrintArtifactIds,
    product_id: row.product_id,
    shopify_variant_id: shopifyVariantId,
    quantity: row.quantity,
    preview_url: `${origin}/print/previews/${row.artifact_intent_id}`,
    status: row.status,
    expires_at: row.expires_at,
  };
}

function shopifyCartMetadata(row: ArtifactIntentRow, printTemplateId: string | null = null) {
  const plannedItemQrIds = JSON.parse(row.planned_item_qr_ids_json) as string[];
  const plannedPrintArtifactIds = JSON.parse(
    row.planned_print_artifact_ids_json
  ) as string[];

  const templateId =
    printTemplateId ?? resolvePrintTemplateForStoreProductId(row.product_id);

  return {
    cart_line_attributes: [
      { key: "artifact_intent_id", value: row.artifact_intent_id },
      { key: "profile_id", value: row.profile_id },
      { key: "source_qr_id", value: row.source_qr_id },
      { key: "planned_item_qr_ids", value: plannedItemQrIds.join(",") },
      {
        key: "planned_print_artifact_ids",
        value: plannedPrintArtifactIds.join(","),
      },
      ...(row.product_id ? [{ key: "product_id", value: row.product_id }] : []),
      ...(templateId ? [{ key: "print_template_id", value: templateId }] : []),
    ],
    order_note_attributes: [
      { name: "artifact_intent_id", value: row.artifact_intent_id },
      { name: "profile_id", value: row.profile_id },
      ...(templateId ? [{ name: "print_template_id", value: templateId }] : []),
    ],
  };
}

function resolveIntentPrintTemplateId(
  body: ArtifactIntentRequest,
  productId: string | null
): string | null {
  const explicit =
    typeof body.print_template_id === "string" && body.print_template_id.trim()
      ? body.print_template_id.trim()
      : null;
  const fromProduct = productId ? resolvePrintTemplateForStoreProductId(productId) : null;
  const templateId = explicit ?? fromProduct;
  if (!templateId) return null;
  if (!getPrintCatalogProduct(templateId)) return null;
  if (fromProduct && explicit && explicit !== fromProduct) return null;
  return templateId;
}

function isIntentExpired(row: ArtifactIntentRow, nowMs: number): boolean {
  const expiresMs = Date.parse(row.expires_at);
  return Number.isFinite(expiresMs) && expiresMs <= nowMs;
}

async function validateActiveSourceScan(
  request: Request,
  db: D1Database,
  profileId: string,
  sourceQrId: string
): Promise<
  | { ok: true }
  | { ok: false; response: Response }
> {
  const ctx = await loadScanContext(db, profileId, sourceQrId);
  const vm = buildScanViewModel(profileId, sourceQrId, ctx, requestOrigin(request));

  if (vm.kind === "unknown_profile" || vm.kind === "unknown_qr") {
    return {
      ok: false,
      response: errorResponse(
        "SOURCE_QR_NOT_FOUND",
        "Source card or QR credential was not found.",
        404
      ),
    };
  }

  if (vm.kind === "profile_qr_mismatch" || vm.kind === "malformed") {
    return {
      ok: false,
      response: errorResponse(
        "SOURCE_QR_INVALID",
        "Source QR credential does not match the requested profile.",
        400
      ),
    };
  }

  const block = BLOCK_REASONS[vm.kind];
  if (block) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: block.code,
          message: block.message,
          status: "blocked",
          profile_id: profileId,
          source_qr_id: sourceQrId,
          scan: { kind: vm.kind },
        },
        403
      ),
    };
  }

  return { ok: true };
}

/**
 * SF-002 artifact intent preview. Allocates planned item QR ids (not minted until
 * paid webhook). Card-owner signed auth deferred; inactive source states block.
 */
export async function handlePostArtifactIntent(
  request: Request,
  db: D1Database
): Promise<Response> {
  let body: ArtifactIntentRequest;
  try {
    body = (await request.json()) as ArtifactIntentRequest;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const profileId = typeof body.profile_id === "string" ? body.profile_id.trim() : "";
  const sourceQrId =
    typeof body.source_qr_id === "string" ? body.source_qr_id.trim() : "";
  const productId =
    typeof body.product_id === "string" && body.product_id.trim()
      ? body.product_id.trim()
      : null;
  const shopifyVariantId =
    typeof body.shopify_variant_id === "string" && body.shopify_variant_id.trim()
      ? body.shopify_variant_id.trim()
      : null;

  if (!PROFILE_ID_REGEX.test(profileId)) {
    return errorResponse("INVALID_PROFILE_ID", "Invalid profile_id.", 422);
  }

  if (!QR_ID_REGEX.test(sourceQrId)) {
    return errorResponse("INVALID_QR_ID", "Invalid source_qr_id.", 422);
  }

  const quantity = parseQuantity(body.quantity);
  if (quantity === null) {
    return errorResponse(
      "INVALID_QUANTITY",
      `quantity must be an integer from 1 to ${MAX_ARTIFACT_INTENT_QUANTITY}.`,
      422
    );
  }

  const printTemplateId = resolveIntentPrintTemplateId(body, productId);
  if (productId && !isKnownStoreProductId(productId)) {
    return errorResponse(
      "UNKNOWN_PRINT_PRODUCT",
      "product_id is not mapped to an approved print template.",
      422
    );
  }
  if (productId && !printTemplateId) {
    return errorResponse(
      "UNKNOWN_PRINT_PRODUCT",
      "product_id is not mapped to an approved print template.",
      422
    );
  }

  const scanCheck = await validateActiveSourceScan(request, db, profileId, sourceQrId);
  if (!scanCheck.ok) return scanCheck.response;

  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ARTIFACT_INTENT_TTL_MS).toISOString();
  const artifactIntentId = generateArtifactIntentId();

  const plannedItemQrIds: string[] = [];
  const plannedPrintArtifactIds: string[] = [];
  for (let i = 0; i < quantity; i++) {
    plannedItemQrIds.push(generateQrId());
    plannedPrintArtifactIds.push(generatePrintArtifactId());
  }

  await insertArtifactIntent(db, {
    artifact_intent_id: artifactIntentId,
    profile_id: profileId,
    source_qr_id: sourceQrId,
    product_id: productId,
    quantity,
    planned_item_qr_ids: plannedItemQrIds,
    planned_print_artifact_ids: plannedPrintArtifactIds,
    status: "proofed",
    expires_at: expiresAt,
    created_at: createdAt,
  });

  const row: ArtifactIntentRow = {
    artifact_intent_id: artifactIntentId,
    profile_id: profileId,
    source_qr_id: sourceQrId,
    product_id: productId,
    quantity,
    planned_item_qr_ids_json: JSON.stringify(plannedItemQrIds),
    planned_print_artifact_ids_json: JSON.stringify(plannedPrintArtifactIds),
    status: "proofed",
    expires_at: expiresAt,
    created_at: createdAt,
    updated_at: createdAt,
  };

  return jsonResponse(
    {
      ...artifactIntentResponse(row, requestOrigin(request), shopifyVariantId),
      print_template_id: printTemplateId,
    },
    201
  );
}

/** Returns Shopify cart/order attribute shapes for A-001 metadata spike. */
export async function handlePostArtifactIntentAttach(
  request: Request,
  db: D1Database,
  artifactIntentId: string
): Promise<Response> {
  let body: ArtifactIntentRequest = {};
  if (request.headers.get("Content-Type")?.includes("application/json")) {
    try {
      body = (await request.json()) as ArtifactIntentRequest;
    } catch {
      return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
    }
  }

  const row = await getArtifactIntent(db, artifactIntentId);
  if (!row) {
    return errorResponse("ARTIFACT_INTENT_NOT_FOUND", "Artifact intent not found.", 404);
  }

  const nowMs = Date.now();
  if (isIntentExpired(row, nowMs)) {
    if (row.status !== "expired" && row.status !== "converted") {
      await updateArtifactIntentStatus(db, artifactIntentId, "expired", new Date().toISOString());
      row.status = "expired";
    }
    return errorResponse("ARTIFACT_INTENT_EXPIRED", "Artifact intent has expired.", 410);
  }

  if (row.status === "blocked" || row.status === "converted") {
    return errorResponse(
      "ARTIFACT_INTENT_UNAVAILABLE",
      "Artifact intent cannot be attached to cart.",
      409
    );
  }

  if (body.proof_acknowledged !== true) {
    return errorResponse(
      "PROOF_CONSENT_REQUIRED",
      "Explicit proof and persistence acknowledgment is required before cart attach.",
      422
    );
  }

  const shopifyVariantId =
    typeof body.shopify_variant_id === "string" && body.shopify_variant_id.trim()
      ? body.shopify_variant_id.trim()
      : null;

  const updatedAt = new Date().toISOString();
  if (row.status === "proofed" || row.status === "draft") {
    await updateArtifactIntentStatus(db, artifactIntentId, "attached_to_cart", updatedAt);
    row.status = "attached_to_cart";
    row.updated_at = updatedAt;
  }

  return jsonResponse({
    ...artifactIntentResponse(row, requestOrigin(request), shopifyVariantId),
    shopify: shopifyCartMetadata(
      row,
      resolvePrintTemplateForStoreProductId(row.product_id)
    ),
  });
}

export { shopifyCartMetadata };
