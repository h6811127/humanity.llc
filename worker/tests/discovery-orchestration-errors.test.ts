import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../site/js/hc-sign.mjs", () => ({
  resolverApiOrigin: () => "https://resolver.test",
}));

import { bootDiscoveryRegionPage } from "../../site/js/discovery-region-page.mjs";
import { bootDiscoveryRegionsHub } from "../../site/js/discovery-regions-hub.mjs";

class TestElement {
  hidden = false;
  textContent = "";
  innerHTML = "";
}

function makeElements(...ids: string[]) {
  const elements = new Map(ids.map((id) => [id, new TestElement()]));
  return {
    elements,
    getElementById: (id: string) => elements.get(id) ?? null,
  };
}

describe("discovery orchestration error states", () => {
  beforeEach(() => {
    vi.stubGlobal("HTMLElement", TestElement);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows a stable hub error when the seasons index is unavailable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);
    const root = makeElements(
      "discovery-regions-loading",
      "discovery-regions-error",
      "discovery-regions-list"
    );

    const result = await bootDiscoveryRegionsHub(root);

    expect(result).toEqual({ ok: false });
    expect(fetchMock).toHaveBeenCalledWith("/data/city-game-seasons-index.json", {
      cache: "no-store",
    });
    expect(root.elements.get("discovery-regions-loading")?.hidden).toBe(true);
    expect(root.elements.get("discovery-regions-error")).toMatchObject({
      hidden: false,
      textContent: "Discovery regions could not load.",
    });
    expect(root.elements.get("discovery-regions-list")?.innerHTML).toBe("");
  });

  it("shows a region error when its discovery pin index is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);
    const elements = makeElements(
      "discovery-region-loading",
      "discovery-region-error"
    );
    const root = {
      ...elements,
      body: { dataset: {} },
      defaultView: {
        location: {
          pathname: "/discover/missing-region/",
          search: "",
        },
      },
    };

    const result = await bootDiscoveryRegionPage(root);

    expect(result).toEqual({
      ok: false,
      region: "missing-region",
      mode: "browse",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/data/discovery-missing-region.json",
      { cache: "no-store" }
    );
    expect(elements.elements.get("discovery-region-loading")?.hidden).toBe(true);
    expect(elements.elements.get("discovery-region-error")).toMatchObject({
      hidden: false,
      textContent: "Discovery browse could not load for this region.",
    });
  });
});
