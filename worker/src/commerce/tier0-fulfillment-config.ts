/** Tier 0 batch sticker fulfillment (no artifact intent). Operator env on Worker. */

export interface Tier0FulfillmentConfig {
  campaign_profile_id: string;
  shopify_variant_ids: Set<string>;
}

export function readTier0FulfillmentConfig(env: {
  TIER0_CAMPAIGN_PROFILE_ID?: string;
  TIER0_SHOPIFY_VARIANT_IDS?: string;
}): Tier0FulfillmentConfig | null {
  const campaignProfileId = env.TIER0_CAMPAIGN_PROFILE_ID?.trim() ?? "";
  const rawVariantIds = env.TIER0_SHOPIFY_VARIANT_IDS?.trim() ?? "";
  if (!campaignProfileId || !rawVariantIds) return null;

  const shopify_variant_ids = new Set<string>();
  for (const part of rawVariantIds.split(",")) {
    const id = part.trim();
    if (id) shopify_variant_ids.add(id);
  }
  if (shopify_variant_ids.size === 0) return null;

  return { campaign_profile_id: campaignProfileId, shopify_variant_ids };
}
