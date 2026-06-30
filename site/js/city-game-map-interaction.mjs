/**
 * M4 — type/state filters + list↔pin highlight on city state board.
 */
import {
  applyBoardFilterVisibility,
  clearBoardFilters,
  setDistrictFilter,
  setListLensFilter,
  setStateFilter,
  setTypeFilter,
  syncListLensUi,
} from "./city-game-map-filter-core.mjs";
import {
  buildMapBoardAbsoluteShareUrl,
  isMapPinInteractive,
  readMapBoardQueryState,
  readMapBoardShareStateFromRoot,
  mapBoardUrlHasActiveFilters,
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
 * @param {string | null | undefined} nodeId
 */
function syncSelectionPanel(boardRoot, nodeId) {
  const panel = boardRoot.querySelector("#city-game-map-selection-panel");
  if (!(panel instanceof HTMLElement)) return;

  const id = String(nodeId ?? "").trim();
  if (!id) {
    panel.hidden = true;
    return;
  }

  const row = boardRoot.querySelector(
    `.city-game-map-node-row[data-node-id="${CSS.escape(id)}"]`
  );
  if (!(row instanceof HTMLElement)) {
    panel.hidden = true;
    return;
  }

  const titleEl = panel.querySelector("#city-game-map-selection-title");
  const effectEl = panel.querySelector("[data-selection-effect]");
  const chipsEl = panel.querySelector("[data-selection-chips]");
  const scanEl = panel.querySelector("[data-selection-scan]");
  const mapsEl = panel.querySelector("[data-selection-maps]");
  const rowTitle = row.querySelector(".city-game-map-node-title");
  const rowEffect = row.querySelector("[data-node-effect]");
  const rowChips = row.querySelector("[data-node-chips]");
  const scanLink = row.querySelector(".city-game-map-scan-link");

  if (titleEl instanceof HTMLElement) {
    titleEl.textContent =
      (rowTitle instanceof HTMLElement ? rowTitle.textContent : "")?.trim() || id;
  }
  if (effectEl instanceof HTMLElement) {
    effectEl.textContent =
      (rowEffect instanceof HTMLElement ? rowEffect.textContent : "")?.trim() || "";
  }
  if (chipsEl instanceof HTMLElement) {
    if (rowChips instanceof HTMLElement && !rowChips.hidden && rowChips.innerHTML.trim()) {
      chipsEl.innerHTML = rowChips.innerHTML;
      chipsEl.hidden = false;
    } else {
      chipsEl.innerHTML = "";
      chipsEl.hidden = true;
    }
  }
  if (scanEl instanceof HTMLElement) {
    if (scanLink instanceof HTMLAnchorElement) {
      scanEl.innerHTML = scanLink.outerHTML;
    } else {
      const hint = row.querySelector(".city-game-map-row-cta, .city-game-map-live-hint");
      scanEl.innerHTML = hint
        ? `<span class="city-game-map-live-hint">${hint.textContent ?? ""}</span>`
        : "";
    }
  }
  if (mapsEl instanceof HTMLAnchorElement) {
    const mapsLink = row.querySelector(".city-game-map-maps-link");
    if (mapsLink instanceof HTMLAnchorElement) {
      mapsEl.href = mapsLink.href;
      mapsEl.hidden = false;
    } else {
      mapsEl.hidden = true;
    }
  }
  const discoveryEl = panel.querySelector("[data-selection-discovery]");
  if (discoveryEl instanceof HTMLAnchorElement) {
    const discoveryLink = row.querySelector(".city-game-map-discovery-link");
    if (discoveryLink instanceof HTMLAnchorElement) {
      discoveryEl.href = discoveryLink.href;
      discoveryEl.textContent = discoveryLink.textContent;
      discoveryEl.hidden = false;
    } else {
      discoveryEl.hidden = true;
    }
  }

  panel.hidden = false;
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string | null} nodeId
 */
function setHighlightNode(boardRoot, nodeId) {
  const networkLens = boardRoot.classList.contains("city-game-map-board--network-lens");
  if (nodeId) {
    boardRoot.dataset.highlightNodeId = nodeId;
  } else {
    delete boardRoot.dataset.highlightNodeId;
    delete boardRoot.dataset.highlightSource;
    clearRouteEdgeHighlight(boardRoot);
  }

  for (const el of boardRoot.querySelectorAll(
    ".city-game-map-pin--highlight, .city-game-map-node-row--highlight"
  )) {
    el.classList.remove("city-game-map-pin--highlight", "city-game-map-node-row--highlight");
  }

  for (const row of boardRoot.querySelectorAll(".city-game-map-node-row[data-node-id]")) {
    if (row instanceof HTMLElement) row.removeAttribute("aria-current");
  }

  if (!networkLens) {
    for (const pin of boardRoot.querySelectorAll(".city-game-map-pin[data-node-id]")) {
      const labelEl = pin.querySelector(".city-game-map-pin-label");
      if (labelEl instanceof SVGTextElement) {
        labelEl.setAttribute("visibility", "hidden");
      }
    }
  }

  syncSelectionFeedbackBar(boardRoot, nodeId ?? null);
  syncSelectionPanel(boardRoot, nodeId ?? null);
  applyBoardFilterVisibility(boardRoot);
  syncMapBoardUrl(boardRoot);

  if (!nodeId) return;

  for (const pin of boardRoot.querySelectorAll(
    `.city-game-map-pin[data-node-id="${CSS.escape(nodeId)}"]`
  )) {
    pin.classList.add("city-game-map-pin--highlight");
    if (!networkLens) {
      const labelEl = pin.querySelector(".city-game-map-pin-label");
      if (labelEl instanceof SVGTextElement) {
        labelEl.setAttribute("visibility", "visible");
      }
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
    pin.scrollIntoView({ block: "nearest", behavior: "smooth", inline: "nearest" });
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
 */
function syncMapBoardUrl(boardRoot) {
  if (typeof window === "undefined" || typeof history?.replaceState !== "function") return;
  const shareState = readMapBoardShareStateFromRoot(boardRoot);
  const nextPath = buildMapBoardAbsoluteShareUrl(
    window.location.pathname,
    shareState,
    ""
  );
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === nextPath) return;
  history.replaceState(null, "", nextPath);
}

/**
 * @param {HTMLElement} boardRoot
 */
async function copyMapBoardShareLink(boardRoot) {
  const shareState = readMapBoardShareStateFromRoot(boardRoot);
  const url = buildMapBoardAbsoluteShareUrl(
    window.location.pathname,
    shareState,
    window.location.origin
  );
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }
  } catch {
    /* fall through */
  }
  window.prompt("Copy board link:", url);
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
  scrollSelectionPanelIntoView(boardRoot);
}

/**
 * Start callout / primary CTA — focus suggested first stop (never toggle-off).
 * @param {HTMLElement} boardRoot
 * @param {string | null | undefined} nodeId
 */
function focusPrimaryMapNode(boardRoot, nodeId) {
  const id = String(
    nodeId ?? boardRoot.getAttribute("data-primary-node") ?? ""
  ).trim();
  if (!id) return;

  const pin = boardRoot.querySelector(
    `.city-game-map-pin[data-node-id="${CSS.escape(id)}"]`
  );
  if (pin && !isMapPinInteractive(pin)) return;

  clearRouteEdgeHighlight(boardRoot);
  setHighlightNode(boardRoot, id);
  boardRoot.dataset.highlightSource = "start";
  boardRoot.classList.add("city-game-map-board--sketch-expanded");
  scrollSketchToPin(boardRoot, id);
  scrollListRowIntoView(boardRoot, id);
  scrollSelectionPanelIntoView(boardRoot);
}

/**
 * Route strip / drawer row — focus origin pin and highlight sketch edge.
 * @param {HTMLElement} boardRoot
 * @param {string | null | undefined} fromId
 * @param {string | null | undefined} toId
 */
function focusRouteEdge(boardRoot, fromId, toId) {
  const from = String(fromId ?? "").trim();
  const to = String(toId ?? "").trim();
  if (!from) return;

  const pin = boardRoot.querySelector(
    `.city-game-map-pin[data-node-id="${CSS.escape(from)}"]`
  );
  if (pin && !isMapPinInteractive(pin)) return;

  setHighlightNode(boardRoot, from);
  boardRoot.dataset.highlightSource = "route";
  setRouteEdgeHighlight(boardRoot, from, to);
  boardRoot.classList.add("city-game-map-board--sketch-expanded");
  scrollSketchToPin(boardRoot, from);
  scrollListRowIntoView(boardRoot, from);
  scrollSelectionPanelIntoView(boardRoot);
}

/**
 * @param {HTMLElement} boardRoot
 */
function clearRouteEdgeHighlight(boardRoot) {
  for (const el of boardRoot.querySelectorAll(
    ".city-game-map-edge--highlight, .city-game-map-route-row--highlight"
  )) {
    el.classList.remove("city-game-map-edge--highlight", "city-game-map-route-row--highlight");
  }
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} fromId
 * @param {string} toId
 */
function setRouteEdgeHighlight(boardRoot, fromId, toId) {
  clearRouteEdgeHighlight(boardRoot);
  const from = String(fromId ?? "").trim();
  const to = String(toId ?? "").trim();
  if (!from || !to) return;
  const selector = `[data-edge-from="${CSS.escape(from)}"][data-edge-to="${CSS.escape(to)}"]`;
  for (const el of boardRoot.querySelectorAll(selector)) {
    el.classList.add(
      el.classList.contains("city-game-map-route-row") ? "city-game-map-route-row--highlight" : "city-game-map-edge--highlight"
    );
  }
}

/**
 * @param {HTMLElement} boardRoot
 */
function openMapNetworkDrawer(boardRoot) {
  const drawer = boardRoot.querySelector("#city-game-map-drawer");
  if (!(drawer instanceof HTMLDetailsElement)) return;
  drawer.open = true;
  drawer.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/**
 * @param {HTMLElement} boardRoot
 */
function scrollSelectionPanelIntoView(boardRoot) {
  const panel = boardRoot.querySelector("#city-game-map-selection-panel");
  if (!(panel instanceof HTMLElement) || panel.hidden) return;
  panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/**
 * @param {HTMLElement} boardRoot
 * @param {{ type?: string; state?: string; district?: string }} queryState
 */
function openMapFiltersPanelIfFiltered(boardRoot, queryState) {
  if (!mapBoardUrlHasActiveFilters(queryState)) return;
  const details = boardRoot.querySelector("#city-game-map-filters");
  if (details instanceof HTMLDetailsElement) details.open = true;
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
      syncMapBoardUrl(boardRoot);
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
      syncMapBoardUrl(boardRoot);
    });
  }

  const districtToolbar = boardRoot.querySelector(".city-game-map-district-filter");
  if (districtToolbar instanceof HTMLElement) {
    districtToolbar.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("[data-district-filter]");
      if (!(btn instanceof HTMLButtonElement)) return;
      const districtId = btn.dataset.districtFilter ?? "all";
      setDistrictFilter(boardRoot, districtId);
      refreshSelectionFeedbackBar(boardRoot);
      syncMapBoardUrl(boardRoot);
    });
  }

  const listLensToolbar = boardRoot.querySelector(".city-game-map-list-lens");
  if (listLensToolbar instanceof HTMLElement) {
    listLensToolbar.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("[data-list-lens]");
      if (!(btn instanceof HTMLButtonElement)) return;
      const lensId = btn.dataset.listLens === "all" ? "all" : "spine";
      setListLensFilter(boardRoot, lensId);
      refreshSelectionFeedbackBar(boardRoot);
      syncMapBoardUrl(boardRoot);
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
      syncMapBoardUrl(boardRoot);
      return;
    }

    if (target.closest("[data-copy-board-link]")) {
      void copyMapBoardShareLink(boardRoot);
      return;
    }

    const focusStart = target.closest("[data-focus-primary-node]");
    if (focusStart instanceof HTMLElement) {
      focusPrimaryMapNode(boardRoot, focusStart.dataset.focusPrimaryNode ?? "");
      return;
    }

    const routeFocus = target.closest("[data-focus-route-from]");
    if (routeFocus instanceof HTMLElement) {
      focusRouteEdge(
        boardRoot,
        routeFocus.dataset.focusRouteFrom ?? "",
        routeFocus.dataset.focusRouteTo ?? ""
      );
      return;
    }

    if (target.closest("[data-open-map-drawer]")) {
      openMapNetworkDrawer(boardRoot);
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
    if (
      target.closest(
        "[data-type-filter], [data-state-filter], [data-district-filter], [data-list-lens], [data-filter-clear]"
      )
    )
      return;

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
  syncListLensUi(boardRoot, boardRoot.dataset.activeListLens === "all" ? "all" : "spine");

  if (typeof window !== "undefined") {
    const queryState = readMapBoardQueryState(window.location.search);
    if (queryState.type !== "all") {
      setTypeFilter(boardRoot, queryState.type);
    }
    if (queryState.state !== "all") {
      setStateFilter(boardRoot, queryState.state);
    }
    if (queryState.district !== "all") {
      setDistrictFilter(boardRoot, queryState.district);
    }
    openMapFiltersPanelIfFiltered(boardRoot, queryState);
    if (queryState.node) {
      selectMapNode(boardRoot, queryState.node, {
        toggle: false,
        scrollList: true,
      });
    } else {
      syncMapBoardUrl(boardRoot);
    }
  }
}
