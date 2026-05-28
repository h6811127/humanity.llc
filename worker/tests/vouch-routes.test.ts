import { describe, expect, it } from "vitest";

import worker from "../src";

describe("vouch API routing", () => {
  it("dispatches POST /.well-known/hc/v1/verification/vouches to the vouch handler", async () => {
    const res = await worker.fetch(
      new Request("https://humanity.llc/.well-known/hc/v1/verification/vouches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { DB: undefined },
      {} as ExecutionContext
    );

    expect(res.status).toBe(503);
    expect((await res.json()) as { error: string }).toMatchObject({
      error: "database_unconfigured",
    });
  });
});
