/**
 * Hydrate landing live object carriers row from shop-config + store catalog.
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import { loadShopConfig } from "./shop-config.mjs";
import {
  applyLandingCarriersViewModel,
  buildLandingCarriersViewModel,
} from "./landing-live-object-carriers-core.mjs";
import { fetchPrintCatalog } from "./shop-print-catalog-core.mjs";
import {
  enrichStoreRows,
  ensureFoundingPurseInStoreRows,
  fetchStoreRows,
} from "./shop-store-rows-core.mjs";

/**
 * @param {Record<string, unknown>} config
 * @returns {Promise<{ catalogPayload: unknown, rows: Array<Record<string, unknown>> }>}
 */
export async function loadLandingCarriersEnrichment(config) {
  const origin = resolverApiOrigin();
  if (!origin) {
    return { catalogPayload: { products: [] }, rows: [] };
  }

  const [catalogPayload, rowsPayload] = await Promise.all([
    fetchPrintCatalog(origin).catch(() => ({ products: [] })),
    fetchStoreRows(origin).catch(() => ({ rows: [] })),
  ]);

  const catalog = catalogPayload ?? { products: [] };
  const rawRows = Array.isArray(rowsPayload?.rows) ? rowsPayload.rows : [];
  const rows = ensureFoundingPurseInStoreRows(
    config,
    catalog,
    enrichStoreRows(config, catalog, rawRows)
  );

  return {
    catalogPayload: catalog,
    rows,
  };
}

/**
 * @param {Document | HTMLElement} [root]
 */
export async function hydrateLandingLiveObjectCarriers(root = document) {
  const doc = root instanceof Document ? root : root.ownerDocument ?? document;
  const section = root.getElementById?.("landing-live-object-carriers") ??
    doc.getElementById("landing-live-object-carriers");
  if (!(section instanceof HTMLElement)) return;

  try {
    const config = await loadShopConfig();
    let enrichment = { catalogPayload: { products: [] }, rows: [] };
    try {
      enrichment = await loadLandingCarriersEnrichment(config);
    } catch {
      /* config-only fallback */
    }
    const model = buildLandingCarriersViewModel(
      config,
      enrichment.catalogPayload,
      enrichment.rows
    );
    if (!model) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    applyLandingCarriersViewModel(section, model);
  } catch (err) {
    console.warn("[landing-live-object-carriers]", err);
  }
}
