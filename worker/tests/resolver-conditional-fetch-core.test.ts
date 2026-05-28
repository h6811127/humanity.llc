import { describe, expect, it, vi, afterEach } from "vitest";

import {
  fetchResolverJson,
  readResolverEtag,
  resolverEtagStorageKey,
  writeResolverEtag,
} from "../../site/js/resolver-conditional-fetch-core.mjs";

describe("resolver-conditional-fetch-core", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores etag and sends If-None-Match on repeat GET", async () => {
    const store = new Map();
    const etagStore = {
      get: (key) => store.get(key) ?? null,
      set: (key, value) => {
        store.set(key, value);
      },
    };
    const url = "https://humanity.llc/.well-known/hc/v1/cards/p/status?q=qr_x";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ETag: 'W/"etag-one"', "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 304, headers: { ETag: 'W/"etag-one"' } }));

    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchResolverJson(url, {}, etagStore);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ ok: true });
    expect(readResolverEtag(etagStore, url)).toBe('W/"etag-one"');

    const second = await fetchResolverJson(url, {}, etagStore);
    expect(second.notModified).toBe(true);
    expect(second.status).toBe(304);
    expect(fetchMock.mock.calls[1][1].headers.get("If-None-Match")).toBe('W/"etag-one"');
  });

  it("resolverEtagStorageKey is namespaced", () => {
    expect(resolverEtagStorageKey("https://x")).toContain("hc_resolver_etag:");
    writeResolverEtag(
      {
        get: () => null,
        set: (key, value) => {
          expect(key).toBe(resolverEtagStorageKey("https://x"));
          expect(value).toBe("e");
        },
      },
      "https://x",
      "e"
    );
  });
});
