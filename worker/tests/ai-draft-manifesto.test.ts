import { describe, expect, it, vi } from "vitest";

import {
  AI_DRAFT_LIMIT_PER_HOUR,
  checkAiDraftRateLimit,
  hashIp,
} from "../src/db/rate-limit";
import { AI_DRAFT_LIMIT } from "../src/resolver/trust-copy";
import { handlePostAiDraftManifesto } from "../src/resolver/ai-draft-manifesto";
import { RateLimitBucketStore } from "./rate-limit-db-mock";

function rateLimitDb(): D1Database {
  const store = new RateLimitBucketStore();
  return { prepare: (sql: string) => store.prepare(sql) } as unknown as D1Database;
}

describe("ai draft manifesto", () => {
  it("returns deterministic draft when AI binding is absent", async () => {
    const db = rateLimitDb();
    const res = await handlePostAiDraftManifesto(
      new Request("https://humanity.llc/.well-known/hc/v1/ai/draft-manifesto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.60",
        },
        body: JSON.stringify({
          pilot_template: "status_plate",
          hint: "Tool library · open until 6 PM",
        }),
      }),
      { DB: db }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      source: string;
      draft: { object_label?: string; status_line?: string };
      limits: { ai_draft_warning: string };
    };
    expect(body.source).toBe("deterministic");
    expect(body.draft.object_label).toBeTruthy();
    expect(body.limits.ai_draft_warning).toBe(AI_DRAFT_LIMIT);
  });

  it("returns 422 for invalid pilot_template", async () => {
    const db = rateLimitDb();
    const res = await handlePostAiDraftManifesto(
      new Request("https://humanity.llc/.well-known/hc/v1/ai/draft-manifesto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pilot_template: "unknown" }),
      }),
      { DB: db }
    );
    expect(res.status).toBe(422);
  });

  it("returns 429 when hourly cap exceeded", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-27T15:00:00.000Z"));
    try {
      const db = rateLimitDb();
      const ip = "203.0.113.61";
      const ipHash = await hashIp(ip);
      const fixedNow = new Date("2026-05-27T15:00:00.000Z");

      for (let i = 0; i < AI_DRAFT_LIMIT_PER_HOUR; i += 1) {
        await checkAiDraftRateLimit(db, ipHash, fixedNow);
      }

      const res = await handlePostAiDraftManifesto(
        new Request("https://humanity.llc/.well-known/hc/v1/ai/draft-manifesto", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": ip,
          },
          body: JSON.stringify({ pilot_template: "general", hint: "Open late" }),
        }),
        { DB: db }
      );
      expect(res.status).toBe(429);
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses Workers AI when binding returns valid JSON", async () => {
    const db = rateLimitDb();
    const ai = {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({
          object_label: "Studio door",
          status_line: "Closed for holiday",
        }),
      }),
    };
    const res = await handlePostAiDraftManifesto(
      new Request("https://humanity.llc/.well-known/hc/v1/ai/draft-manifesto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.62",
        },
        body: JSON.stringify({ pilot_template: "status_plate", hint: "holiday" }),
      }),
      { DB: db, AI: ai as unknown as Ai }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { source: string; draft: { status_line?: string } };
    expect(body.source).toBe("workers_ai");
    expect(body.draft.status_line).toBe("Closed for holiday");
  });
});
