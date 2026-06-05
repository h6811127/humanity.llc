/**
 * M4 — district filter + Explore By + list↔pin highlight on city state board.
 */
import {
  applyBoardFilterVisibility,
  clearBoardFilters,
  setDistrictFilter,
  setExploreFilter,
} from "./city-game-map-filter-core.mjs";
import {
  isMapPinInteractive,
  resolveMapNodeHighlight,
  shouldScrollSketchForRowFocus,
} from "./city-game-map-interaction-core.mjs";

/**
 * @param {HTMLElement} boardRoot
 * @param {string | null} nodeId
 */
function setHighlightNode(boardRoot, nodeId) {
  if (nodeId) {
    boardRoot.dataset.highlightNodeId = nodeId;
  } else {
    delete boardRoot.dataset.highlightNodeId;
    delete boardRoot.dataset.highlightSource;
  }

  for (const el of boardRoot.querySelectorAll(
    ".city-game-map-pin--highlight, .city-game-map-node-row--highlight"
  )) {
    el.classList.remove("city-game-map-pin--highlight", "city-game-map-node-row--highlight");
  }

  for (const row of boardRoot.querySelectorAll(".city-game-map-node-row[data-node-id]")) {
    if (row instanceof HTMLElement) row.removeAttribute("aria-current");
  }

  if (!nodeId) return;

  const pin = boardRoot.querySelector(
    `.city-game-map-pin[data-node-id="${CSS.escape(nodeId)}"]`
  );
  if (pin) pin.classList.add("city-game-map-pin--highlight");

  const row = boardRoot.querySelector(
    `.city-game-map-node-row[data-node-id="${CSS.escape(nodeId)}"]`
  );
  if (row instanceof HTMLElement) {
    row.classList.add("city-game-map-node-row--highlight");
    row.setAttribute("aria-current", "true");
  }
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} nodeId
 */
function scrollListRowIntoView(boardRoot, nodeId) {
  const row = boardRoot.querySelector(
    `.city-game-map-node-row[data-node-id="${CSS.escape(nodeId)}"]`
  );
  if (!(row instanceof HTMLElement)) return;

  const panel =
    boardRoot.querySelector(".city-game-map-list-scroll") ??
    boardRoot.querySelector(".city-game-map-list-panel");
  if (panel instanceof HTMLElement && panel.scrollHeight > panel.clientHeight + 1) {
    const rowRect = row.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const rowOffset = panel.scrollTop + (rowRect.top - panelRect.top);
    const rowEnd = rowOffset + row.offsetHeight;
    const viewTop = panel.scrollTop;
    const viewBottom = viewTop + panel.clientHeight;
    if (rowOffset < viewTop || rowEnd > viewBottom) {
      panel.scrollTo({
        top: Math.max(0, rowOffset - 12),
        behavior: "smooth",
      });
      return;
    }
  }

  row.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} nodeId
 */
function scrollSketchToPin(boardRoot, nodeId) {
  const advanced = boardRoot.querySelector("#city-game-map-advanced");
  if (advanced instanceof HTMLDetailsElement) advanced.open = true;

  const sketch = boardRoot.querySelector("#district-sketch");
  if (sketch instanceof HTMLDetailsElement) sketch.open = true;

  const pin = boardRoot.querySelector(
    `.city-game-map-pin[data-node-id="${CSS.escape(nodeId)}"]`
  );
  if (pin instanceof SVGGElement && isMapPinInteractive(pin)) {
    pin.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return;
  }
  if (sketch instanceof HTMLElement) {
    sketch.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string | null | undefined} nodeId
 * @param {{ scrollList?: boolean, scrollSketch?: boolean, toggle?: boolean }} [opts]
 */
function selectMapNode(boardRoot, nodeId, opts = {}) {
  const id = String(nodeId ?? "").trim();
  if (!id) {
    setHighlightNode(boardRoot, null);
    return;
  }

  const pin = boardRoot.querySelector(
    `.city-game-map-pin[data-node-id="${CSS.escape(id)}"]`
  );
  if (pin && !isMapPinInteractive(pin)) return;

  const toggle = opts.toggle !== false;
  const nextId = toggle
    ? resolveMapNodeHighlight(boardRoot.dataset.highlightNodeId, id)
    : id;
  setHighlightNode(boardRoot, nextId);
  if (!nextId) return;

  boardRoot.dataset.highlightSource = "row";

  if (opts.scrollList) scrollListRowIntoView(boardRoot, nextId);
  if (opts.scrollSketch) scrollSketchToPin(boardRoot, nextId);
}

/**
 * Pin click: select + scroll list; second click on same pin clears (never toggle-off on first click).
 * @param {HTMLElement} boardRoot
 * @param {string} nodeId
 */
function selectMapPin(boardRoot, nodeId) {
  const id = String(nodeId ?? "").trim();
  if (!id) return;

  const pin = boardRoot.querySelector(
    `.city-game-map-pin[data-node-id="${CSS.escape(id)}"]`
  );
  if (pin && !isMapPinInteractive(pin)) return;

  if (
    boardRoot.dataset.highlightNodeId === id &&
    boardRoot.dataset.highlightSource === "pin"
  ) {
    setHighlightNode(boardRoot, null);
    return;
  }

  setHighlightNode(boardRoot, id);
  boardRoot.dataset.highlightSource = "pin";
  scrollListRowIntoView(boardRoot, id);
}

/**
 * @param {HTMLElement} boardRoot
 * @param {Record<string, unknown>} season
 */
export function bootCityGameMapInteraction(boardRoot, season) {
  if (!boardRoot || !season) return;

  const scrollSketchOnRow =
    typeof window !== "undefined" &&
    shouldScrollSketchForRowFocus((query) => window.matchMedia(query).matches);

  const districtToolbar = boardRoot.querySelector(".city-game-map-filter");
  if (districtToolbar instanceof HTMLElement) {
    districtToolbar.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("[data-district-filter]");
      if (!(btn instanceof HTMLButtonElement)) return;
      const district = btn.dataset.districtFilter ?? "all";
      setDistrictFilter(boardRoot, district);
    });
  }

  const exploreToolbar = boardRoot.querySelector(".city-game-map-explore-filter");
  if (exploreToolbar instanceof HTMLElement) {
    exploreToolbar.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("[data-explore-filter]");
      if (!(btn instanceof HTMLButtonElement)) return;
      const explore = btn.dataset.exploreFilter ?? "all";
      setExploreFilter(boardRoot, explore);
    });
  }

  boardRoot.addEventListener(
    "mousedown",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".city-game-map-pin")) event.preventDefault();
    },
    true
  );

  boardRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest("[data-filter-clear]")) {
      clearBoardFilters(boardRoot);
      return;
    }

    const pin = target.closest(".city-game-map-pin");
    if (pin instanceof SVGGElement) {
      const nodeId = pin.getAttribute("data-node-id");
      if (nodeId) selectMapPin(boardRoot, nodeId);
      return;
    }

    if (target.closest("a[href]")) return;
    if (target.closest("[data-district-filter], [data-explore-filter], [data-filter-clear]")) return;

    const row = target.closest(".city-game-map-node-row");
    if (row instanceof HTMLElement && row.dataset.nodeId) {
      selectMapNode(boardRoot, row.dataset.nodeId, {
        scrollSketch: scrollSketchOnRow,
        toggle: false,
      });
    }
  });

  boardRoot.addEventListener(
    "focusin",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("a[href]")) return;
      const row = target.closest(".city-game-map-node-row");
      if (row instanceof HTMLElement && row.dataset.nodeId) {
        selectMapNode(boardRoot, row.dataset.nodeId, {
          scrollSketch: scrollSketchOnRow,
          toggle: false,
        });
      }
    },
    true
  );

  applyBoardFilterVisibility(boardRoot);
}
