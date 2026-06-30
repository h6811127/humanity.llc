/**
 * Boot `/discover/{region}/` browse + `/discover/{region}/pin/{pin_id}` detail.
 * Browse row taps use `?pin=` on the region shell; path URLs stay for shares.
 * @see docs/DISCOVERY_PROJECTION.md · WS-DISCOVER-P1-3
 */
import {
  buildDiscoveryPinRowModel,
  buildSeasonNodeScanIndex,
  filterDiscoveryPinsByQuery,
  renderDiscoveryPinDetail,
  renderDiscoveryPinObjectChooser,
  renderDiscoveryPinRows,
  resolveScanUrlForPin,
  sortDiscoveryPinsByLabel,
  DISCOVERY_NEAR_ME_BUTTON_LABEL,
} from "./discovery-region-browse-core.mjs";
import {
  buildDiscoveryBrowseQueryPath,
  DISCOVERY_NETWORK_FILTER_ALL,
  filterDiscoveryPinsByNetwork,
  parseDiscoveryNetworkQuery,
  renderDiscoveryNetworkFilterChips,
  resolveDiscoveryNetworkBoardHref,
  resolveDiscoveryNetworkOptionsForRegion,
} from "./discovery-network-filter-core.mjs";
import {
  discoveryPinIndexUrl,
  discoveryRegionBrowsePath,
  discoverySeasonJsonUrlForRegion,
  parseDiscoveryBrowseQuery,
  parseDiscoveryPathname,
} from "./discovery-region-path-core.mjs";
import { sortDiscoveryPinsByNearMe } from "./discovery-near-me-core.mjs";
import {
  buildSnapshotNodeIndex,
  fetchDiscoverySeasonSnapshot,
  renderDiscoveryPinSnapshotSection,
  resolveDiscoveryPinRowStateHeadline,
  resolveSnapshotRowForDiscoveryPin,
} from "./discovery-pin-snapshot-core.mjs";
import { resolverApiOrigin } from "./hc-sign.mjs";
import { seasonBoardPath } from "./city-game-season-path-shared.mjs";
import { resolveDiscoveryPinScanTargets } from "./discovery-primary-object-core.mjs";

/** @typedef {import("./discovery-pin-projection-core.mjs").DiscoveryPin} DiscoveryPin */
/** @typedef {import("./discovery-pin-projection-core.mjs").DiscoveryPinIndex} DiscoveryPinIndex */

/**
 * @returns {Promise<{ latitude: number; longitude: number; accuracy?: number | null }>}
 */
function requestDiscoveryClientCoords() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
    );
  });
}

/**
 * @param {string} region
 */
async function loadDiscoveryRegionData(region) {
  const pinIndexUrl = discoveryPinIndexUrl(region);
  if (!pinIndexUrl) throw new Error("Invalid discovery region");

  const pinRes = await fetch(pinIndexUrl, { cache: "no-store" });
  if (!pinRes.ok) throw new Error(`pin index ${pinRes.status}`);
  /** @type {DiscoveryPinIndex} */
  const pinIndex = await pinRes.json();

  /** @type {Record<string, unknown> | null} */
  let seasonsIndex = null;
  let seasonJsonUrl =
    document.body?.dataset?.discoverySeasonJson?.trim() || null;

  try {
    const indexRes = await fetch("/data/city-game-seasons-index.json", {
      cache: "no-store",
    });
    if (indexRes.ok) {
      seasonsIndex = await indexRes.json();
      if (!seasonJsonUrl) {
        seasonJsonUrl = discoverySeasonJsonUrlForRegion(region, seasonsIndex);
      }
    }
  } catch {
    seasonsIndex = null;
  }

  /** @type {Record<string, unknown> | null} */
  let season = null;
  if (seasonJsonUrl) {
    const seasonRes = await fetch(seasonJsonUrl, { cache: "no-store" });
    if (seasonRes.ok) season = await seasonRes.json();
  }

  return { pinIndex, season, seasonJsonUrl, seasonsIndex };
}

/**
 * @param {DiscoveryPin[]} pins
 * @param {string} region
 * @param {ReturnType<typeof buildSeasonNodeScanIndex>} scanIndex
 * @param {Map<string, number>} [distancesByPinId]
 */
function renderBrowseRows(pins, region, scanIndex, snapshotIndex, distancesByPinId, activeNetworkId) {
  const scanContext = { activeNetworkId, snapshotIndex };
  const rows = pins.map((pin) =>
    buildDiscoveryPinRowModel(pin, {
      region,
      distanceMeters: distancesByPinId?.get(pin.pin_id) ?? null,
      scanUrl: resolveScanUrlForPin(pin, scanIndex, scanContext),
      stateHeadline: resolveDiscoveryPinRowStateHeadline(pin, snapshotIndex),
      detailHref: buildDiscoveryBrowseQueryPath(region, {
        network: activeNetworkId,
        pin: pin.pin_id,
      }),
    })
  );
  return renderDiscoveryPinRows(rows);
}

/**
 * @param {HTMLElement} mount
 * @param {string} region
 * @param {string} pinId
 * @param {DiscoveryPinIndex} pinIndex
 * @param {Record<string, unknown> | null} season
 * @param {ReturnType<typeof buildSeasonNodeScanIndex>} scanIndex
 * @param {ReturnType<typeof buildSnapshotNodeIndex>} snapshotIndex
 */
function renderPinDetailInto(mount, region, pinId, pinIndex, season, scanIndex, snapshotIndex, context = {}) {
  const pin = (pinIndex.pins ?? []).find((row) => row.pin_id === pinId);
  if (!pin) {
    mount.hidden = false;
    mount.innerHTML = `<p class="discovery-region-empty">This discovery pin is no longer listed.</p>`;
    return null;
  }

  const activeNetworkId = context.activeNetworkId ?? null;
  const scanContext = { activeNetworkId, snapshotIndex };
  const targets = resolveDiscoveryPinScanTargets(pin, scanIndex, scanContext);
  const scanUrl =
    targets.primaryScanUrl ??
    resolveScanUrlForPin(pin, scanIndex, scanContext);
  const networkOptions = context.networkOptions ?? [];
  const boardHref =
    resolveDiscoveryNetworkBoardHref(networkOptions, activeNetworkId) ??
    (String(season?.rules_path ?? "").trim()
      ? seasonBoardPath(String(season.rules_path))
      : null);
  const snap = resolveSnapshotRowForDiscoveryPin(pin, snapshotIndex);

  mount.hidden = false;
  mount.innerHTML = renderDiscoveryPinDetail(pin, {
    region,
    scanUrl,
    requiresObjectChoice: targets.requiresChooser,
    browseHref: buildDiscoveryBrowseQueryPath(region, {
      network: activeNetworkId,
    }),
    boardHref,
    snapshotSectionHtml: renderDiscoveryPinSnapshotSection(pin, snap),
    objectChooserHtml: renderDiscoveryPinObjectChooser(
      targets.entries,
      targets.primaryObjectId
    ),
  });

  const title = document.querySelector("title");
  if (title) {
    title.textContent = `${pin.display_label} · ${region.replace(/-/g, " ")} · humanity.llc`;
  }
  return pin;
}

/**
 * @param {HTMLElement | null} mount
 * @param {string | null | undefined} pinId
 */
function clearPinDetailMount(mount, pinId) {
  if (!(mount instanceof HTMLElement)) return;
  if (pinId) return;
  mount.hidden = true;
  mount.innerHTML = "";
}

/**
 * @param {string} region
 * @param {DiscoveryPinIndex} pinIndex
 * @param {Record<string, unknown> | null} season
 * @param {string | null} [initialPinId]
 * @param {ReturnType<typeof buildSnapshotNodeIndex>} snapshotIndex
 */
function bootDiscoveryBrowsePage(region, pinIndex, season, initialPinId, snapshotIndex, seasonsIndex) {
  const resultsRoot = document.getElementById("discovery-pin-results");
  const detailRoot = document.getElementById("discovery-pin-detail");
  const searchInput = document.getElementById("discovery-pin-search");
  const nearMeBtn = document.getElementById("discovery-near-me-btn");
  const nearMeStatus = document.getElementById("discovery-near-me-status");
  const countRoot = document.getElementById("discovery-pin-count");
  const networkFilterRoot = document.getElementById("discovery-network-filter");
  const boardLinkRoot = document.getElementById("discovery-network-board-link");
  if (!(resultsRoot instanceof HTMLElement)) return;

  const scanIndex = season ? buildSeasonNodeScanIndex(season) : buildSeasonNodeScanIndex({});
  const basePins = sortDiscoveryPinsByLabel(Array.isArray(pinIndex.pins) ? pinIndex.pins : []);
  const networkOptions = resolveDiscoveryNetworkOptionsForRegion(
    region,
    seasonsIndex ?? {},
    basePins
  );
  /** @type {{ latitude: number; longitude: number } | null} */
  let clientCoords = null;
  const view = resultsRoot.ownerDocument?.defaultView;

  const readNetworkFromUrl = () => {
    if (!view?.location) return null;
    return parseDiscoveryNetworkQuery(view.location.search);
  };

  const readPinIdFromUrl = () => {
    if (!view?.location) return null;
    return parseDiscoveryBrowseQuery(view.location.search);
  };

  const syncBrowseUrl = () => {
    if (typeof history?.replaceState !== "function" || !view?.location) return;
    const nextPath = buildDiscoveryBrowseQueryPath(region, {
      network: readNetworkFromUrl(),
      pin: readPinIdFromUrl(),
    });
    const current = `${view.location.pathname}${view.location.search}`;
    if (nextPath && current !== nextPath) {
      history.replaceState(null, "", nextPath);
    }
  };

  const syncNetworkFilterUi = (activeNetworkId) => {
    if (!(networkFilterRoot instanceof HTMLElement)) return;
    if (!networkOptions.length) {
      networkFilterRoot.hidden = true;
      networkFilterRoot.innerHTML = "";
      return;
    }
    networkFilterRoot.hidden = false;
    networkFilterRoot.innerHTML = renderDiscoveryNetworkFilterChips(
      networkOptions,
      activeNetworkId
    );
  };

  const syncBoardCrosslink = (activeNetworkId) => {
    if (!(boardLinkRoot instanceof HTMLElement)) return;
    const boardHref = resolveDiscoveryNetworkBoardHref(networkOptions, activeNetworkId);
    if (!boardHref) {
      boardLinkRoot.hidden = true;
      boardLinkRoot.innerHTML = "";
      return;
    }
    boardLinkRoot.hidden = false;
    boardLinkRoot.innerHTML = `<a href="${boardHref}">Open network board</a>`;
  };

  const syncBrowseTitle = () => {
    const title = document.querySelector("title");
    if (title && !readPinIdFromUrl()) {
      title.textContent = `Browse places · ${region.replace(/-/g, " ")} · humanity.llc`;
    }
  };

  const syncCount = (visibleCount) => {
    if (!(countRoot instanceof HTMLElement)) return;
    countRoot.textContent = `${visibleCount} place${visibleCount === 1 ? "" : "s"}`;
  };

  const renderDetail = (pinId) => {
    const activePinId = String(pinId ?? "").trim();
    if (!(detailRoot instanceof HTMLElement)) return;
    if (!activePinId) {
      clearPinDetailMount(detailRoot, null);
      syncBrowseTitle();
      return;
    }
    renderPinDetailInto(
      detailRoot,
      region,
      activePinId,
      pinIndex,
      season,
      scanIndex,
      snapshotIndex,
      {
        activeNetworkId: readNetworkFromUrl(),
        networkOptions,
      }
    );
  };

  const render = () => {
    const query = searchInput instanceof HTMLInputElement ? searchInput.value : "";
    const activeNetworkId = readNetworkFromUrl();
    syncNetworkFilterUi(activeNetworkId);
    syncBoardCrosslink(activeNetworkId);

    let pins = filterDiscoveryPinsByQuery(basePins, query);
    pins = filterDiscoveryPinsByNetwork(pins, activeNetworkId);
    /** @type {Map<string, number>} */
    let distancesByPinId = new Map();
    if (clientCoords) {
      const sorted = sortDiscoveryPinsByNearMe(pins, clientCoords);
      pins = sorted.pins;
      distancesByPinId = sorted.distancesByPinId;
    }
    resultsRoot.innerHTML = renderBrowseRows(
      pins,
      region,
      scanIndex,
      snapshotIndex,
      distancesByPinId,
      activeNetworkId
    );
    syncCount(pins.length);
    renderDetail(readPinIdFromUrl() ?? initialPinId);
    syncBrowseUrl();
  };

  render();

  if (networkFilterRoot instanceof HTMLElement) {
    networkFilterRoot.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("[data-network-filter]");
      if (!(btn instanceof HTMLButtonElement)) return;
      const networkId = btn.dataset.networkFilter ?? DISCOVERY_NETWORK_FILTER_ALL;
      if (!view?.location) return;
      const params = new URLSearchParams(view.location.search);
      if (networkId === DISCOVERY_NETWORK_FILTER_ALL) params.delete("network");
      else params.set("network", networkId);
      const qs = params.toString();
      const next = qs ? `${view.location.pathname}?${qs}` : view.location.pathname;
      history.replaceState(null, "", next);
      render();
    });
  }

  if (searchInput instanceof HTMLInputElement) {
    searchInput.addEventListener("input", render);
  }

  if (nearMeBtn instanceof HTMLButtonElement) {
    nearMeBtn.addEventListener("click", async () => {
      nearMeBtn.disabled = true;
      if (nearMeStatus instanceof HTMLElement) {
        nearMeStatus.textContent = "Requesting location on your device…";
      }
      try {
        clientCoords = await requestDiscoveryClientCoords();
        nearMeBtn.classList.add("discovery-near-me-btn--active");
        nearMeBtn.setAttribute("aria-pressed", "true");
        if (nearMeStatus instanceof HTMLElement) {
          nearMeStatus.textContent = "Sorted nearest first on this device.";
        }
        render();
      } catch {
        if (nearMeStatus instanceof HTMLElement) {
          nearMeStatus.textContent =
            "Location unavailable — showing alphabetical order. Enable location in browser settings to sort near me.";
        }
      } finally {
        nearMeBtn.disabled = false;
      }
    });
    nearMeBtn.textContent = DISCOVERY_NEAR_ME_BUTTON_LABEL;
  }

  view?.addEventListener("popstate", () => {
    render();
    syncBrowseTitle();
  });
}

/**
 * @param {string} region
 * @param {string} pinId
 * @param {DiscoveryPinIndex} pinIndex
 * @param {Record<string, unknown> | null} season
 * @param {ReturnType<typeof buildSnapshotNodeIndex>} snapshotIndex
 */
function bootDiscoveryPinPage(region, pinId, pinIndex, season, snapshotIndex, seasonsIndex) {
  const mount = document.getElementById("discovery-pin-detail");
  if (!(mount instanceof HTMLElement)) return;

  const scanIndex = season ? buildSeasonNodeScanIndex(season) : buildSeasonNodeScanIndex({});
  const basePins = Array.isArray(pinIndex.pins) ? pinIndex.pins : [];
  const networkOptions = resolveDiscoveryNetworkOptionsForRegion(
    region,
    seasonsIndex ?? {},
    basePins
  );
  const activeNetworkId =
    typeof window !== "undefined"
      ? parseDiscoveryNetworkQuery(window.location.search)
      : null;

  renderPinDetailInto(mount, region, pinId, pinIndex, season, scanIndex, snapshotIndex, {
    activeNetworkId,
    networkOptions,
  });
}

/**
 * @param {Document} [root]
 */
export async function bootDiscoveryRegionPage(root = document) {
  const bodyRegion = root.body?.dataset?.discoveryRegion?.trim();
  const location = root.defaultView?.location;
  const parsed =
    parseDiscoveryPathname(location?.pathname ?? "") ??
    (bodyRegion ? { mode: "browse", region: bodyRegion } : null);

  if (!parsed) return { ok: false };

  const region = parsed.region;
  const loading = root.getElementById("discovery-region-loading");
  const errorRoot = root.getElementById("discovery-region-error");
  const browsePinId =
    parsed.mode === "browse" ? parseDiscoveryBrowseQuery(location?.search ?? "") : null;

  try {
    const { pinIndex, season, seasonsIndex } = await loadDiscoveryRegionData(region);
    if (loading instanceof HTMLElement) loading.hidden = true;

    let snapshot = null;
    const seasonId = String(season?.season_id ?? "").trim();
    if (seasonId) {
      snapshot = await fetchDiscoverySeasonSnapshot(seasonId, resolverApiOrigin());
    }
    const snapshotIndex = buildSnapshotNodeIndex(snapshot);

    if (parsed.mode === "pin") {
      bootDiscoveryPinPage(region, parsed.pinId, pinIndex, season, snapshotIndex, seasonsIndex);
    } else {
      bootDiscoveryBrowsePage(
        region,
        pinIndex,
        season,
        browsePinId,
        snapshotIndex,
        seasonsIndex
      );
    }
    return { ok: true, region, mode: parsed.mode, pinId: browsePinId ?? parsed.pinId ?? null };
  } catch (err) {
    console.warn("[discovery-region-page]", err);
    if (loading instanceof HTMLElement) loading.hidden = true;
    if (errorRoot instanceof HTMLElement) {
      errorRoot.hidden = false;
      errorRoot.textContent = "Discovery browse could not load for this region.";
    }
    return { ok: false, region, mode: parsed.mode };
  }
}

if (typeof document !== "undefined") {
  bootDiscoveryRegionPage().catch((err) => {
    console.warn("[discovery-region-page]", err);
  });
}
