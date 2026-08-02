import { afterEach, describe, expect, it, vi } from "vitest";

import { LANDING_DEFAULT_DISCOVERY_REGION } from "../../site/js/landing-places-core.mjs";
import {
  resolveLandingPlacesRegionSelection,
  syncLandingRegionQueryParam,
} from "../../site/js/landing-places.mjs";

type LocState = {
  pathname: string;
  search: string;
  hash: string;
};

function installWindowHistory(initial: LocState) {
  const state = { ...initial };
  const origin = "https://humanity.llc";
  const location = {
    get href() {
      return `${origin}${state.pathname}${state.search}${state.hash}`;
    },
    get pathname() {
      return state.pathname;
    },
    get search() {
      return state.search;
    },
    get hash() {
      return state.hash;
    },
  };
  const replaceState = vi.fn((_data: unknown, _unused: string, next: string) => {
    const url = new URL(next, origin);
    state.pathname = url.pathname;
    state.search = url.search;
    state.hash = url.hash;
  });
  const history = { replaceState };
  vi.stubGlobal("window", { location, history });
  vi.stubGlobal("history", history);
  return { replaceState, state };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("syncLandingRegionQueryParam", () => {
  it("sets ?region= for a non-default region without dropping other query params or hash", () => {
    const { replaceState } = installWindowHistory({
      pathname: "/",
      search: "?utm_source=field&near=1",
      hash: "#landing-places",
    });

    syncLandingRegionQueryParam("example-city");

    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState.mock.calls[0]?.[2]).toBe(
      "/?utm_source=field&near=1&region=example-city#landing-places"
    );
  });

  it("removes ?region= when selecting the default region while preserving siblings", () => {
    const { replaceState } = installWindowHistory({
      pathname: "/",
      search: "?region=example-city&utm_source=field",
      hash: "",
    });

    syncLandingRegionQueryParam(LANDING_DEFAULT_DISCOVERY_REGION);

    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState.mock.calls[0]?.[2]).toBe("/?utm_source=field");
  });

  it("clears blank region values the same way as the default", () => {
    const { replaceState } = installWindowHistory({
      pathname: "/",
      search: "?region=example-city&ref=poster",
      hash: "",
    });

    syncLandingRegionQueryParam("   ");

    expect(replaceState).toHaveBeenCalledWith(null, "", "/?ref=poster");
  });

  it("no-ops when the URL already matches the target region", () => {
    const { replaceState } = installWindowHistory({
      pathname: "/",
      search: "?region=example-city&utm_source=field",
      hash: "#landing-places",
    });

    syncLandingRegionQueryParam("example-city");

    expect(replaceState).not.toHaveBeenCalled();
  });

  it("no-ops without a browser history API", () => {
    expect(() => syncLandingRegionQueryParam("example-city")).not.toThrow();
  });
});

describe("resolveLandingPlacesRegionSelection", () => {
  const options = [
    {
      region_slug: "cedar-rapids-iowa",
      label: "Cedar Rapids",
      city: "Cedar Rapids, Iowa",
      season_id: "cr_season_01_wake",
      browse_href: "/discover/cedar-rapids-iowa/",
    },
    {
      region_slug: "example-city",
      label: "Example City",
      city: "Example City",
      season_id: "example_season_01",
      browse_href: "/discover/example-city/",
    },
  ];

  it("prefers the query region over stored preference", () => {
    const storage = {
      getItem: () => "cedar-rapids-iowa",
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as Storage;

    expect(
      resolveLandingPlacesRegionSelection(
        options,
        "?region=example-city&utm_source=field",
        storage
      )
    ).toBe("example-city");
  });
});
