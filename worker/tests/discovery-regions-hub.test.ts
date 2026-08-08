import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bootDiscoveryRegionsHub } from "../../site/js/discovery-regions-hub.mjs";

function makeEl(initial: Record<string, unknown> = {}) {
  return Object.assign(new HTMLElement(), {
    hidden: false,
    textContent: "",
    innerHTML: "",
    ...initial,
  });
}

function makeRoot() {
  const loading = makeEl({ hidden: false });
  const errorRoot = makeEl({ hidden: true, textContent: "" });
  const listRoot = makeEl({ innerHTML: "" });
  return {
    root: {
      getElementById(id: string) {
        if (id === "discovery-regions-loading") return loading;
        if (id === "discovery-regions-error") return errorRoot;
        if (id === "discovery-regions-list") return listRoot;
        return null;
      },
    },
    loading,
    errorRoot,
    listRoot,
  };
}

describe("bootDiscoveryRegionsHub", () => {
  beforeEach(() => {
    // @ts-expect-error test polyfill
    globalThis.HTMLElement = class HTMLElement {};
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    // @ts-expect-error restore
    delete globalThis.HTMLElement;
  });

  it("renders listed region cards and hides loading", async () => {
    const seasonsIndex = {
      seasons: [
        {
          season_id: "cr_season_01_wake",
          title: "Wake the city · Signal War",
          city: "Cedar Rapids, Iowa",
          public_listing: {
            listed: true,
            title: "Wake the city",
            summary: "Public network board",
            region: "Cedar Rapids, Iowa",
            category: "city_games",
          },
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify(seasonsIndex), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    const { root, loading, errorRoot, listRoot } = makeRoot();

    const result = await bootDiscoveryRegionsHub(root as unknown as Document);
    expect(result).toEqual({ ok: true, count: 1 });
    expect(loading.hidden).toBe(true);
    expect(errorRoot.hidden).toBe(true);
    expect(listRoot.innerHTML).toContain("/discover/cedar-rapids-iowa/");
    expect(listRoot.innerHTML).toContain("Wake the city");
  });

  it("shows error copy when seasons index fetch fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("missing", { status: 404 }))
    );
    const { root, loading, errorRoot, listRoot } = makeRoot();

    const result = await bootDiscoveryRegionsHub(root as unknown as Document);
    expect(result).toEqual({ ok: false });
    expect(loading.hidden).toBe(true);
    expect(errorRoot.hidden).toBe(false);
    expect(errorRoot.textContent).toBe("Discovery regions could not load.");
    expect(listRoot.innerHTML).toBe("");
    warn.mockRestore();
  });
});
