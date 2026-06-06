/**
 * M4 — type/state filters + list↔pin highlight on city state board.
 */
import {
  applyBoardFilterVisibility,
  clearBoardFilters,
  setStateFilter,
  setTypeFilter,
} from "./city-game-map-filter-core.mjs";
import {
  isMapPinInteractive,
  readMapBoardNodeQueryParam,
  resolveMapNodeHighlight,
  resolvePrimarySketchFigure,
  resolveSelectionBarCopy,
  resolveSketchPin,
} from "./city-game-map-interaction-core.mjs";

/**
 * @param {HTMLElement} boardRoot
 * @param {string | null | undefined} nodeId
 */
function syncSelectionFeedbackBar(boardRoot, nodeId) {
  const bar = boardRoot.querySelector("[data-selection-bar]");
  if (!(bar instanceof HTMLElement)) return;

  const id = String(nodeId ?? "").trim();
  if (!id) {
    bar.hidden = true;
    delete bar.dataset.selectionNodeId;
    boardRoot.classList.remove("city-game-map-board--place-selected");
    return;
  }

  const row = boardRoot.querySelector(
    `.city-game-map-node-row[data-node-id="${CSS.escape(id)}"]`
  );
  if (!(row instanceof HTMLElement)) {
    bar.hidden = true;
    delete bar.dataset.selectionNodeId;
    boardRoot.classList.remove("city-game-map-board--place-selected");
    return;
  }

  const titleEl = bar.querySelector("[data-selection-title]");
  const metaEl = bar.querySelector("[data-selection-meta]");
  const titleRow = row.querySelector(".city-game-map-node-title");
  const metaRow = row.querySelector(".city-game-map-node-meta");
  const copy = resolveSelectionBarCopy(
    titleRow instanceof HTMLElement ? titleRow.textContent : "",
    metaRow instanceof HTMLElement ? metaRow.textContent : ""
  );

  if (titleEl instanceof HTMLElement) titleEl.textContent = copy.title;
  if (metaEl instanceof HTMLElement) {
    if (copy.meta) {
      metaEl.textContent = copy.meta;
      metaEl.hidden = false;
    } else {
      metaEl.textContent = "";
      metaEl.hidden = true;
    }
  }

  bar.dataset.selectionNodeId = id;
  bar.hidden = false;
  boardRoot.classList.add("city-game-map-board--place-selected");
}

/**
 * @param {HTMLElement} boardRoot
 */
function refreshSelectionFeedbackBar(boardRoot) {
  syncSelectionFeedbackBar(boardRoot, boardRoot.dataset.highlightNodeId ?? null);
}

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

  for (const pin of boardRoot.querySelectorAll(".city-game-map-pin[data-node-id]")) {
    const labelEl = pin.querySelector(".city-game-map-pin-label");
    if (labelEl instanceof SVGTextElement) {
      labelEl.setAttribute("visibility", "hidden");
    }
  }

  syncSelectionFeedbackBar(boardRoot, nodeId ?? null);

  if (!nodeId) return;

  for (const pin of boardRoot.querySelectorAll(
    `.city-game-map-pin[data-node-id="${CSS.escape(nodeId)}"]`
  )) {
    pin.classList.add("city-game-map-pin--highlight");
    const labelEl = pin.querySelector(".city-game-map-pin-label");
    if (labelEl instanceof SVGTextElement) {
      labelEl.setAttribute("visibility", "visible");
    }
  }

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
  row.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} nodeId
 */
function scrollSketchToPin(boardRoot, nodeId) {
  const sketch = resolvePrimarySketchFigure(boardRoot);
  if (sketch instanceof HTMLElement) {
    sketch.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  const pin = resolveSketchPin(boardRoot, nodeId);
  if (!(pin instanceof SVGGElement) || !isMapPinInteractive(pin)) return;

  const revealPin = () => {
    pin.scrollIntoView({ block: "center", behavior: "smooth", inline: "nearest" });
  };

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      requestAnimationFrame(revealPin);
    });
    return;
  }

  revealPin();
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string | null | undefined} nodeId
 * @param {{ scrollList?: boolean, toggle?: boolean }} [opts]
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

  const typeToolbar = boardRoot.querySelector(".city-game-map-type-filter");
  if (typeToolbar instanceof HTMLElement) {
    typeToolbar.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("[data-type-filter]");
      if (!(btn instanceof HTMLButtonElement)) return;
      const typeId = btn.dataset.typeFilter ?? "all";
      setTypeFilter(boardRoot, typeId);
      refreshSelectionFeedbackBar(boardRoot);
    });
  }

  const stateToolbar = boardRoot.querySelector(".city-game-map-state-filter");
  if (stateToolbar instanceof HTMLElement) {
    stateToolbar.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("[data-state-filter]");
      if (!(btn instanceof HTMLButtonElement)) return;
      const stateId = btn.dataset.stateFilter ?? "all";
      setStateFilter(boardRoot, stateId);
      refreshSelectionFeedbackBar(boardRoot);
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
      refreshSelectionFeedbackBar(boardRoot);
      return;
    }

    if (target.closest("[data-show-on-sketch]")) {
      const nodeId = boardRoot.dataset.highlightNodeId;
      if (nodeId) scrollSketchToPin(boardRoot, nodeId);
      return;
    }

    const pin = target.closest(".city-game-map-pin");
    if (pin instanceof SVGGElement) {
      const nodeId = pin.getAttribute("data-node-id");
      if (nodeId) selectMapPin(boardRoot, nodeId);
      return;
    }

    if (target.closest("a[href]")) return;
    if (target.closest("[data-type-filter], [data-state-filter], [data-filter-clear]")) return;

    const row = target.closest(".city-game-map-node-row");
    if (row instanceof HTMLElement && row.dataset.nodeId) {
      selectMapNode(boardRoot, row.dataset.nodeId, {
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
          toggle: false,
        });
      }
    },
    true
  );

  applyBoardFilterVisibility(boardRoot);

  if (typeof window !== "undefined") {
    const nodeFromQuery = readMapBoardNodeQueryParam(window.location.search);
    if (nodeFromQuery) {
      selectMapNode(boardRoot, nodeFromQuery, {
        toggle: false,
        scrollList: true,
      });
    }
  }
}
