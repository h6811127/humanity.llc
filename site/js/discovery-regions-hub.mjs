/**
 * Boot `/discover/` region hub — listed discovery regions from seasons index.
 * @see docs/DISCOVERY_PROJECTION.md · WS-DISCOVER-P3-1
 */
import {
  buildDiscoveryRegionsFromSeasonsIndex,
  renderDiscoveryRegionsHubCards,
} from "./discovery-regions-index-core.mjs";

export async function bootDiscoveryRegionsHub(root = document) {
  const loading = root.getElementById("discovery-regions-loading");
  const errorRoot = root.getElementById("discovery-regions-error");
  const listRoot = root.getElementById("discovery-regions-list");

  try {
    const res = await fetch("/data/city-game-seasons-index.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`seasons index ${res.status}`);
    const seasonsIndex = await res.json();
    const regions = buildDiscoveryRegionsFromSeasonsIndex(seasonsIndex);

    if (loading instanceof HTMLElement) loading.hidden = true;
    if (listRoot instanceof HTMLElement) {
      listRoot.innerHTML = renderDiscoveryRegionsHubCards(regions);
    }
    return { ok: true, count: regions.length };
  } catch (err) {
    console.warn("[discovery-regions-hub]", err);
    if (loading instanceof HTMLElement) loading.hidden = true;
    if (errorRoot instanceof HTMLElement) {
      errorRoot.hidden = false;
      errorRoot.textContent = "Discovery regions could not load.";
    }
    return { ok: false };
  }
}

if (typeof document !== "undefined") {
  bootDiscoveryRegionsHub().catch((err) => {
    console.warn("[discovery-regions-hub]", err);
  });
}
