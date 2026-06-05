/**
 * M4 — district filter + list↔pin highlight on city state board.
 */
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
 * @param {string} districtId
 */
function applyDistrictFilterVisibility(boardRoot, districtId) {
  const active = districtId === "all" ? null : districtId;
  for (const block of boardRoot.querySelectorAll(".city-game-map-district[data-district]")) {
    const match = !active || block.getAttribute("data-district") === active;
    if (block instanceof HTMLElement) block.hidden = !match;
  }
  for (const pin of boardRoot.querySelectorAll(".city-game-map-pin[data-district]")) {
    const match = !active || pin.getAttribute("data-district") === active;
    if (pin instanceof SVGElement) pin.hidden = !match;
  }
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} districtId
 */
function setDistrictFilter(boardRoot, districtId) {
  boardRoot.dataset.activeDistrict = districtId;
  applyDistrictFilterVisibility(boardRoot, districtId);
  const toolbar = boardRoot.querySelector(".city-game-map-filter");
  if (!toolbar) return;
  for (const btn of toolbar.querySelectorAll("[data-district-filter]")) {
    if (!(btn instanceof HTMLButtonElement)) continue;
    const active = btn.dataset.districtFilter === districtId;
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    btn.classList.toggle("city-game-map-filter-btn--active", active);
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
  if (row instanceof HTMLElement) {
    row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} nodeId
 */
function scrollSketchToPin(boardRoot, nodeId) {
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

  if (opts.scrollList) scrollListRowIntoView(boardRoot, nextId);
  if (opts.scrollSketch) scrollSketchToPin(boardRoot, nextId);
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

  const toolbar = boardRoot.querySelector(".city-game-map-filter");
  if (toolbar instanceof HTMLElement) {
    toolbar.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("[data-district-filter]");
      if (!(btn instanceof HTMLButtonElement)) return;
      const district = btn.dataset.districtFilter ?? "all";
      setDistrictFilter(boardRoot, district);
    });
  }

  boardRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const pin = target.closest(".city-game-map-pin");
    if (pin instanceof SVGGElement) {
      const nodeId = pin.getAttribute("data-node-id");
      if (nodeId) selectMapNode(boardRoot, nodeId, { scrollList: true });
      return;
    }

    if (target.closest("a[href]")) return;

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

  applyDistrictFilterVisibility(boardRoot, boardRoot.dataset.activeDistrict ?? "all");
}
