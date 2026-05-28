import { describe, expect, it } from "vitest";

import worker from "../src";

describe("card JSON routing CORS", () => {
  it("GET card JSON through worker.fetch includes CORS for Pages dev origin", async () => {
    const db = {
      prepare: () => ({
        bind: () => ({ first: async () => null }),
      }),
    } as unknown as D1Database;

    const res = await worker.fetch(
      new Request(
        "https://humanity.llc/.well-known/hc/v1/cards/bmuC1dbHXHe9wjevNHVR4DKw",
        {
          headers: { Origin: "http://localhost:8788" },
        }
      ),
      { DB: db } as import("../src").Env
    );

    expect(res.status).toBe(404);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:8788"
    );
  });
});
