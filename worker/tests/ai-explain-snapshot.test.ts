import { describe, expect, it, vi } from "vitest";

import {
  AI_EXPLAIN_LIMIT_PER_HOUR,
  checkAiExplainRateLimit,
  hashIp,
} from "../src/db/rate-limit";
import { handlePostAiExplainSnapshot } from "../src/resolver/ai-explain-snapshot";
import { RateLimitBucketStore } from "./rate-limit-db-mock";

function rateLimitDb(): D1Database {
  const store = new RateLimitBucketStore();
  return { prepare: (sql: string) => store.prepare(sql) } as unknown as D1Database;
}

const validBody = {
  public_snapshot: {
    text: "Studio door · Open until 9 PM · Special hours: Thursday closes at 6 PM",
    fields: [
      { key: "object", value: "Studio door" },
      { key: "status", value: "Open until 9 PM" },
      { key: "Special hours", value: "Thursday closes at 6 PM" },
    ],
  },
};

describe("ai explain snapshot", () => {
  it("returns deterministic summary for a valid snapshot", async () => {
    const db = rateLimitDb();
    const res = await handlePostAiExplainSnapshot(
      new Request("https://humanity.llc/.well-known/hc/v1/ai/explain-snapshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.50",
        },
        body: JSON.stringify(validBody),
      }),
      { DB: db }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      summary: string;
      source: string;
      disclaimer: string;
      limits: { ai_explain_warning: string };
    };
    // Deterministic-only: source never varies and no model output enters the response.
    expect(body.source).toBe("deterministic");
    expect(body.summary).toBe(
      "This object is Studio door. Current status: Open until 9 PM. Special hours: Thursday closes at 6 PM."
    );
    expect(body.limits.ai_explain_warning).toContain("Plain-language summary");
    expect(body.disclaimer).toContain("not signed network state");
  });

  it("returns 422 for invalid snapshot", async () => {
    const db = rateLimitDb();
    const res = await handlePostAiExplainSnapshot(
      new Request("https://humanity.llc/.well-known/hc/v1/ai/explain-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_snapshot: { text: "x", fields: [] } }),
      }),
      { DB: db }
    );
    expect(res.status).toBe(422);
  });

  it("returns 429 when hourly cap exceeded", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-27T14:00:00.000Z"));
    try {
      const db = rateLimitDb();
      const ip = "203.0.113.51";
      const ipHash = await hashIp(ip);
      const fixedNow = new Date("2026-05-27T14:00:00.000Z");

      for (let i = 0; i < AI_EXPLAIN_LIMIT_PER_HOUR; i += 1) {
        const rate = await checkAiExplainRateLimit(db, ipHash, fixedNow);
        expect(rate.allowed).toBe(true);
      }

      const res = await handlePostAiExplainSnapshot(
        new Request("https://humanity.llc/.well-known/hc/v1/ai/explain-snapshot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": ip,
          },
          body: JSON.stringify(validBody),
        }),
        { DB: db }
      );
      expect(res.status).toBe(429);
      const body = (await res.json()) as { message: string };
      expect(body.message).toContain("plain-language");
      expect(body.message).not.toContain("AI explain");
    } finally {
      vi.useRealTimers();
    }
  });
});
