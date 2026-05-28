import { describe, expect, it } from "vitest";

import { readOrderStatusQuery, orderStatusHeadline } from "../../site/js/shop-order-status-core.mjs";

describe("shop-order-status-core", () => {
  it("reads artifact_intent_id from URL", () => {
    expect(
      readOrderStatusQuery(new URL("https://humanity.llc/shop/thanks/?artifact_intent_id=ai_Hc9mP2nQ4rT6vW8yZ1"))
    ).toEqual({ artifact_intent_id: "ai_Hc9mP2nQ4rT6vW8yZ1" });
  });

  it("reads shopify order id from order alias param", () => {
    expect(readOrderStatusQuery(new URL("https://humanity.llc/shop/thanks/?order=450789469"))).toEqual(
      { shopify_order_id: "450789469" }
    );
  });

  it("maps commerce status to headline", () => {
    expect(orderStatusHeadline("processing")).toMatch(/in progress/i);
    expect(orderStatusHeadline("held_for_review")).toMatch(/reviewing/i);
  });
});
