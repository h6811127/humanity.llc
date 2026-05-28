/**
 * /shop/ — story-row hub driven by GET /v1/store/rows (Phase 6).
 */
import { loadShopConfig } from "./shop-config.mjs";
import {
  appendMerchRefToCreateUrl,
  persistMerchCreateRef,
  peekMerchCreateRef,
} from "./merch-funnel-core.mjs";
import { fetchPrintCatalog } from "./shop-print-catalog-core.mjs";
import { resolverApiOrigin } from "./hc-sign.mjs";
import {
  enrichStoreRows,
  fetchStoreRows,
  renderStoreRowsHtml,
} from "./shop-store-rows-core.mjs";

const rowsRootEl = document.getElementById("shop-rows-root");
const rowsFallbackEl = document.getElementById("shop-rows-fallback");

function decorateShopCreateLinks() {
  const ref = peekMerchCreateRef();
  if (!ref) return;
  for (const anchor of document.querySelectorAll('a[href*="/create"]')) {
    anchor.href = appendMerchRefToCreateUrl(anchor.href, ref);
  }
}

function showFallbackRows() {
  if (rowsRootEl) rowsRootEl.hidden = true;
  if (rowsFallbackEl) rowsFallbackEl.hidden = false;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
function renderRows(rows) {
  if (!rowsRootEl) return;
  const html = renderStoreRowsHtml(rows);
  if (!html) {
    showFallbackRows();
    return;
  }
  rowsRootEl.innerHTML = html;
  rowsRootEl.hidden = false;
  if (rowsFallbackEl) rowsFallbackEl.hidden = true;
}

async function initHub() {
  persistMerchCreateRef("tier0_shop");
  decorateShopCreateLinks();

  const origin = resolverApiOrigin();
  try {
    const [config, catalogPayload, rowsPayload] = await Promise.all([
      loadShopConfig(),
      fetchPrintCatalog(origin).catch(() => ({ products: [] })),
      fetchStoreRows(origin),
    ]);
    const rows = enrichStoreRows(config, catalogPayload, rowsPayload?.rows ?? []);
    renderRows(rows);
  } catch {
    showFallbackRows();
  }
}

void initHub();
