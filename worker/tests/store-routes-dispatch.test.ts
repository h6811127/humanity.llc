import { describe, expect, it } from "vitest";

import worker from "../src";
import { TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID } from "../src/store/store-catalog";

describe("store catalog routes (Worker dispatcher)", () => {
  it("GET /v1/store/rows is wired", async () => {
    const res = await worker.fetch(
      new Request("https://humanity.llc/v1/store/rows", { method: "GET" }),
      {},
      {} as ExecutionContext
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: unknown[] };
    expect(body.rows.length).toBeGreaterThan(0);
  });

  it("GET /v1/store/products/{id} returns published Glitch hoodie", async () => {
    const res = await worker.fetch(
      new Request(
        `https://humanity.llc/v1/store/products/${TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID}`,
        { method: "GET" }
      ),
      {},
      {} as ExecutionContext
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { product_id: string; title: string };
    expect(body.product_id).toBe(TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID);
    expect(body.title).toContain("Glitch");
  });

  it("GET /v1/store/products/{id} 404 for unknown id", async () => {
    const res = await worker.fetch(
      new Request("https://humanity.llc/v1/store/products/draft_row_wear_1", {
        method: "GET",
      }),
      {},
      {} as ExecutionContext
    );
    expect(res.status).toBe(404);
  });
});
