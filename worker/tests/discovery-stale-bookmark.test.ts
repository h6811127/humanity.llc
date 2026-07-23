import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../site/js/hc-sign.mjs", () => ({
  resolverApiOrigin: () => "https://resolver.test",
}));

import { bootDiscoveryRegionPage } from "../../site/js/discovery-region-page.mjs";

class TestElement {
  hidden = false;
  textContent = "";
  innerHTML = "";
}

describe("discovery stale bookmarks", () => {
  beforeEach(() => {
    vi.stubGlobal("HTMLElement", TestElement);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps a delisted pin bookmark usable without showing a load error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          index_version: "v1",
          region: "cedar-rapids-iowa",
          pins: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ seasons: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const elements = new Map([
      ["discovery-region-loading", new TestElement()],
      ["discovery-region-error", Object.assign(new TestElement(), { hidden: true })],
      ["discovery-pin-detail", new TestElement()],
    ]);
    const root = {
      body: { dataset: {} },
      defaultView: {
        location: {
          pathname:
            "/discover/cedar-rapids-iowa/pin/pin_removed_after_rebuild/",
          search: "",
        },
      },
      getElementById: (id: string) => elements.get(id) ?? null,
    };
    vi.stubGlobal("document", root);

    const result = await bootDiscoveryRegionPage(
      /** @type {Document} */ (root as unknown as Document)
    );

    expect(result).toEqual({
      ok: true,
      region: "cedar-rapids-iowa",
      mode: "pin",
      pinId: "pin_removed_after_rebuild",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/data/discovery-cedar-rapids-iowa.json",
      { cache: "no-store" }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/data/city-game-seasons-index.json",
      { cache: "no-store" }
    );
    expect(elements.get("discovery-region-loading")?.hidden).toBe(true);
    expect(elements.get("discovery-region-error")?.hidden).toBe(true);
    expect(elements.get("discovery-pin-detail")).toMatchObject({
      hidden: false,
      innerHTML:
        '<p class="discovery-region-empty">This discovery pin is no longer listed.</p>',
    });
  });
});
