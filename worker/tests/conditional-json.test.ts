import { describe, expect, it } from "vitest";

import {
  ifNoneMatchSatisfied,
  jsonResponseWithWeakEtag,
  weakEtagFromSerializedJson,
} from "../src/http/conditional-json";

describe("conditional-json (Phase 9)", () => {
  it("weakEtagFromSerializedJson is stable for the same payload", async () => {
    const payload = '{"scan":{"kind":"active"}}';
    const a = await weakEtagFromSerializedJson(payload);
    const b = await weakEtagFromSerializedJson(payload);
    expect(a).toBe(b);
    expect(a.startsWith('W/"')).toBe(true);
  });

  it("ifNoneMatchSatisfied matches weak and strong tags", () => {
    const etag = 'W/"abc123"';
    const req = new Request("https://humanity.llc/x", {
      headers: { "If-None-Match": etag },
    });
    expect(ifNoneMatchSatisfied(req, etag)).toBe(true);
    expect(
      ifNoneMatchSatisfied(
        new Request("https://humanity.llc/x", {
          headers: { "If-None-Match": '"abc123"' },
        }),
        etag
      )
    ).toBe(true);
  });

  it("jsonResponseWithWeakEtag returns 304 when If-None-Match matches", async () => {
    const request = new Request("https://humanity.llc/.well-known/hc/v1/cards/x/status");
    const body = { version: "1.0", scan: { kind: "active" } };
    const first = await jsonResponseWithWeakEtag(request, body, 200, {
      "Cache-Control": "public, max-age=60",
    });
    const etag = first.headers.get("ETag");
    expect(etag).toBeTruthy();
    expect(first.status).toBe(200);

    const secondReq = new Request(request.url, {
      headers: { "If-None-Match": etag! },
    });
    const second = await jsonResponseWithWeakEtag(secondReq, body, 200, {
      "Cache-Control": "public, max-age=60",
    });
    expect(second.status).toBe(304);
    expect(second.headers.get("ETag")).toBe(etag);
    expect(second.headers.get("Cache-Control")).toBe("public, max-age=60");
  });
});
