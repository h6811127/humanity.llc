import { describe, expect, it } from "vitest";

import {
  handleDeleteVouchAuditFlagDismiss,
  handlePostVouchAuditFlagDismiss,
} from "../src/resolver/vouch-audit-flags";

const TOKEN = "test-operator-audit-token";
const URL = "https://humanity.llc/.well-known/hc/v1/operator/vouch-audit-flags/dismiss";

function emptyDb(): D1Database {
  return {
    prepare() {
      return {
        bind() {
          return {
            async run() {
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}

function post(body: unknown, token = TOKEN): Promise<Response> {
  return handlePostVouchAuditFlagDismiss(
    new Request(URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),
    emptyDb(),
    TOKEN
  );
}

describe("vouch audit dismiss validation", () => {
  it("rejects malformed JSON", async () => {
    const res = await handlePostVouchAuditFlagDismiss(
      new Request(URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: "{",
      }),
      emptyDb(),
      TOKEN
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "MALFORMED_REQUEST" });
  });

  it("requires flag_key", async () => {
    const res = await post({
      flag_key: "   ",
      flag_kind: "closed_loop_only",
      note: "reviewed",
    });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: "INVALID_FLAG_KEY" });
  });

  it("rejects unknown flag_kind", async () => {
    const res = await post({
      flag_key: "closed_loop_only|a|b",
      flag_kind: "not_a_kind",
      note: "reviewed",
    });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: "INVALID_FLAG_KIND" });
  });

  it("requires note length 1-500", async () => {
    const empty = await post({
      flag_key: "closed_loop_only|a|b",
      flag_kind: "closed_loop_only",
      note: "   ",
    });
    expect(empty.status).toBe(422);
    expect(await empty.json()).toMatchObject({ error: "INVALID_NOTE" });

    const tooLong = await post({
      flag_key: "closed_loop_only|a|b",
      flag_kind: "closed_loop_only",
      note: "x".repeat(501),
    });
    expect(tooLong.status).toBe(422);
    expect(await tooLong.json()).toMatchObject({ error: "INVALID_NOTE" });
  });

  it("rejects oversized dismissed_by and defaults when omitted", async () => {
    const oversized = await post({
      flag_key: "closed_loop_only|a|b",
      flag_kind: "closed_loop_only",
      note: "ok",
      dismissed_by: "y".repeat(121),
    });
    expect(oversized.status).toBe(422);
    expect(await oversized.json()).toMatchObject({ error: "INVALID_DISMISSED_BY" });

    const ok = await post({
      flag_key: "closed_loop_only|a|b",
      flag_kind: "closed_loop_only",
      note: "ok",
    });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({
      ok: true,
      dismissal: { dismissed_by: "operator" },
    });
  });

  it("requires flag_key on DELETE dismiss", async () => {
    const res = await handleDeleteVouchAuditFlagDismiss(
      new Request(URL, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ flag_key: "" }),
      }),
      emptyDb(),
      TOKEN
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: "INVALID_FLAG_KEY" });
  });
});
