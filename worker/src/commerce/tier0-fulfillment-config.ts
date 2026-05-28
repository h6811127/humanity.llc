/** Tier 0 batch sticker fulfillment (no artifact intent). Operator env on Worker. */

export interface Tier0FulfillmentConfig {
  campaign_profile_id: string;
  shopify_variant_ids: Set<string>;
}

function parseVariantIdSet(raw: string): Set<string> {
  const shopify_variant_ids = new Set<string>();
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (id) shopify_variant_ids.add(id);
  }
  return shopify_variant_ids;
}

export function readTier0FulfillmentConfig(env: {
  TIER0_CAMPAIGN_PROFILE_ID?: string;
  TIER0_SHOPIFY_VARIANT_IDS?: string;
}): Tier0FulfillmentConfig | null {
  const campaignProfileId = env.TIER0_CAMPAIGN_PROFILE_ID?.trim() ?? "";
  const rawVariantIds = env.TIER0_SHOPIFY_VARIANT_IDS?.trim() ?? "";
  if (!campaignProfileId || !rawVariantIds) return null;

  const shopify_variant_ids = parseVariantIdSet(rawVariantIds);
  if (shopify_variant_ids.size === 0) return null;

  return { campaign_profile_id: campaignProfileId, shopify_variant_ids };
}

/** Pre-printed / Shopify-inventory Tier 0 SKUs — no Printify queue (docs/COMPANY_MERCH_AND_COMMUNITY_CAMPAIGN.md). */
export function readTier0InventoryFulfillmentConfig(env: {
  TIER0_CAMPAIGN_PROFILE_ID?: string;
  TIER0_SHOPIFY_INVENTORY_VARIANT_IDS?: string;
}): Tier0FulfillmentConfig | null {
  const campaignProfileId = env.TIER0_CAMPAIGN_PROFILE_ID?.trim() ?? "";
  const rawVariantIds = env.TIER0_SHOPIFY_INVENTORY_VARIANT_IDS?.trim() ?? "";
  if (!campaignProfileId || !rawVariantIds) return null;

  const shopify_variant_ids = parseVariantIdSet(rawVariantIds);
  if (shopify_variant_ids.size === 0) return null;

  return { campaign_profile_id: campaignProfileId, shopify_variant_ids };
}
