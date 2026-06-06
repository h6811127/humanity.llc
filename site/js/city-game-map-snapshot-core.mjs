/**
 * Apply season snapshot JSON to the city board DOM (M2 live chips).
 * @see docs/CITY_GAME_MAP_DASHBOARD.md
 */
import { applyBoardFilterVisibility } from "./city-game-map-filter-core.mjs";
import {
  COOPERATIVE_BOARD_ROLES,
  escapeMapHtml,
  formatHookLine,
  formatMysteryNodeCopy,
  formatNodeConsequenceLine,
  formatProgressLine,
  formatStaticWorldStatusLine,
  MAP_ROW_SCAN_HINT,
  resolveRowScanCta,
  seasonRumoredNodeIds,
} from "./city-game-map-board-core.mjs";
import { deriveNodeBoardStates } from "./city-game-map-state-filter-core.mjs";

export const CITY_GAME_SNAPSHOT_POLL_MS = 90_000;
export const CITY_GAME_SNAPSHOT_STALE_MS = CITY_GAME_SNAPSHOT_POLL_MS * 2;

/**
 * @param {string} seasonId
 * @param {string} origin
 */
export function seasonSnapshotUrl(seasonId, origin) {
  return new URL(
    `/.well-known/hc/v1/seasons/${encodeURIComponent(seasonId)}/snapshot`,
    origin
  ).href;
}

/**
 * @param {{ kind?: string; label?: string; value?: string }[]} chips
 */
export function buildNodeChipsHtml(chips) {
  if (!Array.isArray(chips) || !chips.length) {
    return `<span class="city-game-map-live-hint">${escapeMapHtml(MAP_ROW_SCAN_HINT)}</span>`;
  }
  const items = chips
    .map((chip) => {
      const kind = escapeMapHtml(chip.kind ?? "state");
      const label = escapeMapHtml(chip.label ?? "State");
      const value = escapeMapHtml(chip.value ?? "");
      return `<li class="city-game-map-chip" data-chip-kind="${kind}">
  <span class="city-game-map-chip-label">${label}</span>
  <span class="city-game-map-chip-value">${value}</span>
</li>`;
    })
    .join("");
  return `<ul class="city-game-map-node-chips" aria-label="Live object state">${items}</ul>`;
}

/**
 * @param {Record<string, { node_id?: string; chips?: unknown[]; scan_url?: string | null; map_mode?: string; lifecycle?: string }>} nodeById
 * @param {string} nodeId
 */
function nodeSnapshot(nodeById, nodeId) {
  return nodeById[nodeId] ?? null;
}

/**
 * @param {{ node_id?: string; open?: boolean; fragments?: { claimed?: number; required?: number; complete?: boolean } } | null | undefined} finale
 * @param {string} [wakeTitle]
 */
export function formatFinaleFootnote(finale, wakeTitle = "Wake the city") {
  if (!finale || typeof finale !== "object") return null;
  const title = String(wakeTitle ?? "Wake the city").trim() || "Wake the city";
  const fragments = finale.fragments ?? {};
  const claimed = fragments.claimed ?? 0;
  const required = fragments.required ?? 3;
  let line = `${title}: ${claimed} / ${required} fragments`;
  if (fragments.complete) line += " — complete";
  else if (finale.open) line += " — finale live";
  return line;
}

/**
 * @param {Record<string, unknown>} snapshot
 * @param {string} [worldDefault]
 */
export function formatWorldStatusLineFromSnapshot(snapshot, worldDefault = "Relays unclaimed · Finale dormant") {
  const swLines = signalWarSummaryLines(snapshot);
  if (swLines.length) return swLines.join(" · ");

  const finale = /** @type {{ open?: boolean; fragments?: { complete?: boolean } } | null | undefined} */ (
    snapshot?.finale
  );
  let finalePart = "Finale dormant";
  if (finale?.fragments?.complete) finalePart = "Finale complete";
  else if (finale?.open) finalePart = "Finale live";

  const nodes = Array.isArray(snapshot?.nodes) ? snapshot.nodes : [];
  const relayRows = nodes.filter((row) => row?.role === "relay_gate");
  if (relayRows.length) {
    const claimed = relayRows.filter((row) =>
      Array.isArray(row?.chips)
        ? row.chips.some((chip) => /held|claimed|network/i.test(String(chip?.value ?? "")))
        : false
    ).length;
    if (claimed > 0 && claimed < relayRows.length) {
      return `Relays contested · ${finalePart}`;
    }
    if (claimed >= relayRows.length && relayRows.length > 0) {
      return `Relays claimed · ${finalePart}`;
    }
  }

  return worldDefault.includes("Finale") ? worldDefault : `Relays unclaimed · ${finalePart}`;
}

/**
 * @param {string} nodeId
 * @param {string | null | undefined} role
 * @param {{ chips?: Array<{ kind?: string; value?: string }> } | null | undefined} snap
 * @param {Record<string, unknown>} season
 */
export function formatNodeEffectFromSnapshot(nodeId, role, snap, season) {
  if (!snap || !Array.isArray(snap.chips) || !snap.chips.length) {
    return formatNodeConsequenceLine(nodeId, role, season);
  }
  const primary =
    snap.chips.find((chip) => chip?.kind === "state") ??
    snap.chips.find((chip) => chip?.kind === "collective") ??
    snap.chips[0];
  const value = typeof primary?.value === "string" ? primary.value.trim() : "";
  const base = formatNodeConsequenceLine(nodeId, role, season);
  if (!value) return base;
  const unlockTail = base.includes(" · ") ? base.slice(base.indexOf(" · ") + 3) : "";
  if (unlockTail && !value.toLowerCase().includes(unlockTail.slice(0, 8).toLowerCase())) {
    return `${value} · ${unlockTail}`;
  }
  return value;
}

/**
 * @param {HTMLElement} row
 * @param {string} role
 * @param {Record<string, unknown>} season
 */
export function applyMysteryRowPresentation(row, nodeId, role, season) {
  if (!(row instanceof HTMLElement)) return;
  const mystery = formatMysteryNodeCopy(nodeId, role, season);
  const titleEl = row.querySelector(".city-game-map-node-title");
  const effectEl = row.querySelector("[data-node-effect]");
  if (titleEl) titleEl.textContent = mystery.title;
  if (effectEl) effectEl.textContent = mystery.consequence;
  row.classList.add("city-game-map-node-row--clue");
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} mapVisibility
 */
function rumoredNodeSet(boardRoot, mapVisibility) {
  const rumoredRaw =
    boardRoot instanceof HTMLElement && boardRoot.dataset.rumoredNodes
      ? boardRoot.dataset.rumoredNodes
      : "";
  const fromBoard = new Set(
    rumoredRaw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
  if (fromBoard.size) return fromBoard;
  if (mapVisibility === "public") return new Set();
  return seasonRumoredNodeIds({});
}

/**
 * @param {string | null | undefined} nodeId
 * @param {string | null | undefined} role
 * @param {string} mapVisibility
 * @param {Set<string>} rumored
 */
function shouldOmitFogRow(nodeId, role, mapVisibility, rumored) {
  if (mapVisibility === "public") return false;
  const id = String(nodeId ?? "").trim();
  const roleId = String(role ?? "").trim();
  if (!id || !roleId) return false;
  if (COOPERATIVE_BOARD_ROLES.has(roleId)) return false;
  if (roleId === "relay_gate") {
    return mapVisibility === "signal_war" && !rumored.has(id);
  }
  if (mapVisibility === "rumor_only") {
    return !rumored.has(id);
  }
  return true;
}

/**
 * @param {HTMLElement} boardRoot
 * @param {Record<string, unknown>} snapshot
 */
export function applyMissionSummaryFromSnapshot(boardRoot, snapshot) {
  const mission = boardRoot.querySelector("#city-game-map-mission");
  const progressEl = boardRoot.querySelector("#city-game-map-mission-progress");
  const worldEl = boardRoot.querySelector("#city-game-map-mission-world");
  const lobbyProgress = boardRoot.querySelector("#city-game-map-progress");

  const lobby = boardRoot.querySelector(".city-game-map-lobby");
  const dataset =
    lobby && typeof lobby === "object" && "dataset" in lobby
      ? /** @type {{ progressSuffix?: string }} */ (lobby.dataset)
      : {};
  const copy = { progress_suffix: dataset.progressSuffix };
  const finale = /** @type {Record<string, unknown>} */ (snapshot.finale);
  const progress = formatProgressLine(finale, copy);

  if (progressEl && "textContent" in progressEl) progressEl.textContent = progress;
  if (lobbyProgress && "textContent" in lobbyProgress) lobbyProgress.textContent = progress;

  const worldDefault =
    mission instanceof HTMLElement && mission.dataset.worldDefault?.trim()
      ? mission.dataset.worldDefault.trim()
      : formatStaticWorldStatusLine({}, { world_status_default: "Relays unclaimed · Finale dormant" });
  if (worldEl && "textContent" in worldEl) {
    worldEl.textContent = formatWorldStatusLineFromSnapshot(snapshot, worldDefault);
  }
}

/**
 * @param {HTMLElement} boardRoot
 * @param {Record<string, unknown>} snapshot
 */
export function applyLobbyProgressFromSnapshot(boardRoot, snapshot) {
  const lobby = boardRoot.querySelector(".city-game-map-lobby");
  const progressEl = boardRoot.querySelector("#city-game-map-progress");
  const hookEl = boardRoot.querySelector("#city-game-map-hook");
  if (!lobby || typeof lobby !== "object" || !("dataset" in lobby)) return;

  const dataset = /** @type {{ hook?: string; hookStirring?: string; hookAwake?: string; progressSuffix?: string }} */ (
    lobby.dataset
  );
  const copy = {
    hook: dataset.hook,
    hook_stirring: dataset.hookStirring,
    hook_awake: dataset.hookAwake,
    progress_suffix: dataset.progressSuffix,
  };
  const finale = /** @type {Record<string, unknown>} */ (snapshot.finale);

  if (progressEl && typeof progressEl === "object" && "textContent" in progressEl) {
    progressEl.textContent = formatProgressLine(finale, copy);
  }
  if (hookEl && typeof hookEl === "object" && "textContent" in hookEl) {
    hookEl.textContent = formatHookLine(finale, copy);
  }
}

/**
 * @param {HTMLElement} boardRoot
 * @param {Record<string, unknown>} snapshot
 */
export function applyFinaleFromSnapshot(boardRoot, snapshot) {
  const footnote = boardRoot.querySelector("#city-game-map-finale-footnote");
  if (!(footnote instanceof HTMLElement)) return;
  const wakeTitle = footnote.dataset.wakeTitle?.trim() || "Wake the city";
  const line = formatFinaleFootnote(
    /** @type {Record<string, unknown>} */ (snapshot.finale),
    wakeTitle
  );
  if (line) footnote.textContent = line;
}

/**
 * @param {{ chips?: Array<{ kind?: string; value?: string }> } | null | undefined} snap
 */
export function formatSpotlightCountFromSnap(snap) {
  if (!snap || !Array.isArray(snap.chips) || !snap.chips.length) return null;
  const collective = snap.chips.find((chip) => chip?.kind === "collective");
  const chip = collective ?? snap.chips[0];
  const value = typeof chip?.value === "string" ? chip.value.trim() : "";
  return value || null;
}

/**
 * @param {string | null | undefined} value
 */
export function formatLaunchCollectiveLine(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (match) return `${match[1]} of ${match[2]} together`;
  return trimmed;
}

/**
 * @param {string | null | undefined} value
 * @param {string} [countLabel]
 * @deprecated Prefer formatLaunchCollectiveLine for launch spotlight counts.
 */
export function formatSpotlightCountLine(value, countLabel = "") {
  const collective = formatLaunchCollectiveLine(value);
  if (collective) return collective;
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;
  const label = countLabel?.trim();
  return label ? `${label} · ${trimmed}` : trimmed;
}

/**
 * @param {HTMLElement} boardRoot
 * @param {Record<string, unknown>} snapshot
 */
export function applySpotlightFromSnapshot(boardRoot, snapshot) {
  const spotlight = boardRoot.querySelector("#city-game-map-spotlight");
  const countEl = boardRoot.querySelector("#city-game-map-spotlight-count");
  const liveEl = boardRoot.querySelector("#city-game-map-spotlight-live");
  if (
    !spotlight ||
    typeof spotlight !== "object" ||
    !("dataset" in spotlight) ||
    !countEl ||
    typeof countEl !== "object" ||
    !("textContent" in countEl)
  ) {
    return;
  }

  const spotlightDataset = /** @type {{ nodeId?: string; countPlaceholder?: string; scanHint?: string; scanLinkLabel?: string }} */ (
    spotlight.dataset
  );
  const placeholder = spotlightDataset.countPlaceholder?.trim() || "Live count opens when play starts.";
  const scanHint = spotlightDataset.scanHint?.trim() || "Find the River Lantern";
  const nodeId = spotlightDataset.nodeId?.trim();
  if (!nodeId) return;

  const nodes = Array.isArray(snapshot.nodes) ? snapshot.nodes : [];
  const nodeById = Object.fromEntries(
    nodes.filter((row) => row?.node_id).map((row) => [row.node_id, row])
  );
  const snap = nodeById[nodeId] ?? null;
  const count = formatSpotlightCountFromSnap(snap);

  countEl.textContent = count ?? placeholder;

  if (liveEl && typeof liveEl === "object" && "innerHTML" in liveEl) {
    if (snap?.scan_url) {
      liveEl.innerHTML = `<a class="city-game-map-scan-link" href="${escapeMapHtml(String(snap.scan_url))}">Open live scan</a>`;
    } else {
      liveEl.innerHTML = `<span class="city-game-map-spotlight-hint">${escapeMapHtml(scanHint)}</span>`;
    }
  }

  if (typeof spotlight.classList?.toggle === "function") {
    spotlight.classList.toggle("city-game-map-spotlight--live", Boolean(count));
    spotlight.classList.toggle(
      "city-game-map-spotlight--maintenance",
      snap?.map_mode === "care_pause" || snap?.lifecycle === "paused"
    );
    spotlight.classList.toggle("city-game-map-spotlight--revoked", snap?.lifecycle === "revoked");
  }
}

/**
 * @param {HTMLElement} boardRoot
 * @param {Record<string, unknown>} snapshot
 */
export function applySnapshotToMapBoard(boardRoot, snapshot) {
  if (!boardRoot || !snapshot || typeof snapshot !== "object") {
    return { ok: false, reason: "missing_snapshot" };
  }

  const nodes = Array.isArray(snapshot.nodes) ? snapshot.nodes : [];
  const nodeById = Object.fromEntries(
    nodes.filter((row) => row?.node_id).map((row) => [row.node_id, row])
  );
  const seasonCtx = {
    unlock_edges: Array.isArray(snapshot.unlock_edges) ? snapshot.unlock_edges : [],
    nodes,
  };
  const mapVisibility =
    typeof snapshot.map_visibility === "string" ? snapshot.map_visibility.trim() : "public";
  const rumored = rumoredNodeSet(boardRoot, mapVisibility);

  for (const row of boardRoot.querySelectorAll(".city-game-map-node-row[data-node-id]")) {
    const nodeId = row.getAttribute("data-node-id");
    if (!nodeId) continue;
    const live = row.querySelector(".city-game-map-node-live");
    if (!(live instanceof HTMLElement)) continue;
    const snap = nodeSnapshot(nodeById, nodeId);
    const role = row.getAttribute("data-role");
    const ctaLabel = resolveRowScanCta(role);
    const effectEl = row.querySelector("[data-node-effect]");

    if (mapVisibility === "public" || snap) {
      if (row instanceof HTMLElement) {
        row.hidden = false;
        row.classList.remove("city-game-map-node-row--fog-omitted");
      }
    }

    if (!snap && mapVisibility !== "public") {
      if (shouldOmitFogRow(nodeId, role, mapVisibility, rumored)) {
        if (row instanceof HTMLElement) {
          row.hidden = true;
          row.classList.add("city-game-map-node-row--fog-omitted");
        }
        row.setAttribute("data-board-visibility", "hidden");
        row.setAttribute("data-board-states", "locked");
        row.classList.remove("city-game-map-node-row--live");
        row.classList.remove("city-game-map-node-row--maintenance");
        row.classList.remove("city-game-map-node-row--revoked");
        continue;
      }
      if (role === "relay_gate" || rumored.has(nodeId)) {
        row.setAttribute("data-board-visibility", "hidden");
        row.setAttribute("data-board-states", "locked");
        applyMysteryRowPresentation(row, nodeId, role, seasonCtx);
        live.innerHTML = `<span class="city-game-map-live-hint city-game-map-row-cta">${escapeMapHtml(ctaLabel)}</span>`;
        row.classList.remove("city-game-map-node-row--live");
        row.classList.remove("city-game-map-node-row--maintenance");
        row.classList.remove("city-game-map-node-row--revoked");
        continue;
      }
      if (COOPERATIVE_BOARD_ROLES.has(String(role ?? ""))) {
        row.setAttribute("data-board-visibility", "public");
        row.setAttribute(
          "data-board-states",
          deriveNodeBoardStates(null, role).join(" ")
        );
        if (effectEl instanceof HTMLElement) {
          effectEl.textContent = formatNodeConsequenceLine(nodeId, role, seasonCtx);
        }
        live.innerHTML = `<span class="city-game-map-live-hint city-game-map-row-cta">${escapeMapHtml(ctaLabel)}</span>`;
        row.classList.remove("city-game-map-node-row--live");
        row.classList.remove("city-game-map-node-row--maintenance");
        row.classList.remove("city-game-map-node-row--revoked");
        continue;
      }
      row.setAttribute("data-board-visibility", "hidden");
      row.setAttribute("data-board-states", "locked");
      if (row instanceof HTMLElement) {
        row.hidden = true;
        row.classList.add("city-game-map-node-row--fog-omitted");
      }
      row.classList.remove("city-game-map-node-row--live");
      row.classList.remove("city-game-map-node-row--maintenance");
      row.classList.remove("city-game-map-node-row--revoked");
      continue;
    }

    row.classList.remove("city-game-map-node-row--hidden");
    row.classList.remove("city-game-map-node-row--clue");
    row.setAttribute("data-board-visibility", "public");
    const boardStates = deriveNodeBoardStates(snap, role);
    row.setAttribute("data-board-states", boardStates.join(" "));

    const titleEl = row.querySelector(".city-game-map-node-title");
    if (titleEl instanceof HTMLElement && snap?.label) {
      titleEl.textContent = String(snap.label);
    }

    if (effectEl instanceof HTMLElement) {
      effectEl.textContent = formatNodeEffectFromSnapshot(nodeId, role, snap, seasonCtx);
    }

    if (snap?.scan_url) {
      live.innerHTML = `<a class="city-game-map-scan-link city-game-map-row-cta" href="${escapeMapHtml(String(snap.scan_url))}">${escapeMapHtml(ctaLabel)}</a>`;
    } else {
      live.innerHTML = `<span class="city-game-map-live-hint city-game-map-row-cta">${escapeMapHtml(ctaLabel)}</span>`;
    }
    row.classList.add("city-game-map-node-row--live");
    if (snap?.map_mode === "care_pause" || snap?.lifecycle === "paused") {
      row.classList.add("city-game-map-node-row--maintenance");
    } else {
      row.classList.remove("city-game-map-node-row--maintenance");
    }
    if (snap?.lifecycle === "revoked") {
      row.classList.add("city-game-map-node-row--revoked");
    } else {
      row.classList.remove("city-game-map-node-row--revoked");
    }
  }

  const edges = Array.isArray(snapshot.unlock_edges) ? snapshot.unlock_edges : [];
  const primaryNode = boardRoot.dataset.primaryNode?.trim() ?? "";
  for (const edge of edges) {
    if (!edge?.from || !edge?.to) continue;
    const selector = `[data-edge-from="${edge.from}"][data-edge-to="${edge.to}"]`;
    const satisfied = Boolean(edge.satisfied);
    const isNext = !satisfied && primaryNode && edge.from === primaryNode;
    for (const el of boardRoot.querySelectorAll(selector)) {
      el.classList.toggle("city-game-map-edge--satisfied", satisfied);
      if (el instanceof HTMLElement) {
        el.classList.toggle("city-game-map-route-row--unlocked", satisfied);
        el.classList.toggle("city-game-map-route-row--next", isNext);
        el.dataset.routeLocked = satisfied || isNext ? "false" : "true";
        const stateEl = el.querySelector(".city-game-map-route-state");
        if (stateEl instanceof HTMLElement) {
          stateEl.textContent = satisfied ? "Open" : isNext ? "Next" : "Locked";
        }
      }
    }
  }

  for (const pin of boardRoot.querySelectorAll(".city-game-map-pin[data-node-id]")) {
    const nodeId = pin.getAttribute("data-node-id");
    const snap = nodeId ? nodeSnapshot(nodeById, nodeId) : null;
    const fogHidden = isSchematicPinFogged(nodeId, snap);
    const role = pin.getAttribute("data-role");
    // Fog is visual-only — schematic pins stay hittable for M4 list↔map navigation.
    pin.classList.toggle("city-game-map-pin--fog-hidden", fogHidden);
    pin.classList.toggle("city-game-map-pin--live", Boolean(snap?.chips?.length));
    pin.classList.toggle("city-game-map-pin--maintenance", snap?.map_mode === "care_pause");
    if (fogHidden || (!snap && mapVisibility !== "public")) {
      pin.setAttribute("data-board-visibility", "hidden");
      pin.setAttribute("data-board-states", "locked");
    } else {
      pin.setAttribute("data-board-visibility", "public");
      pin.setAttribute("data-board-states", deriveNodeBoardStates(snap, role).join(" "));
    }
    const labelEl = pin.querySelector(".city-game-map-pin-label");
    if (labelEl instanceof SVGTextElement) {
      labelEl.setAttribute("visibility", "hidden");
    }
  }

  applyBoardFilterVisibility(boardRoot);

  const sync = boardRoot.querySelector("#city-game-map-sync");
  if (sync instanceof HTMLElement && typeof snapshot.generated_at === "string") {
    sync.dataset.generatedAt = snapshot.generated_at;
    sync.textContent = formatSyncLabel(snapshot.generated_at);
    sync.classList.remove("city-game-map-sync--stale");
  }

  const figcaption = boardRoot.querySelector(".city-game-map-figcaption");
  if (figcaption instanceof HTMLElement && nodes.length) {
    figcaption.textContent = "District sketch — not a street map.";
  }

  applyMissionSummaryFromSnapshot(boardRoot, snapshot);
  applyLobbyProgressFromSnapshot(boardRoot, snapshot);
  applyFinaleFromSnapshot(boardRoot, snapshot);
  applySignalWarFromSnapshot(boardRoot, snapshot);
  applySpotlightFromSnapshot(boardRoot, snapshot);

  return { ok: true, nodeCount: nodes.length };
}

/**
 * Snapshot fog is visual-only — schematic pins stay hittable for M4 navigation.
 * @param {string | null | undefined} nodeId
 * @param {Record<string, unknown> | null | undefined} snap
 */
export function isSchematicPinFogged(nodeId, snap) {
  return Boolean(nodeId && !snap);
}

/**
 * @param {Record<string, unknown>} snapshot
 */
export function signalWarSummaryLines(snapshot) {
  const signalWar =
    snapshot?.signal_war && typeof snapshot.signal_war === "object"
      ? /** @type {Record<string, unknown>} */ (snapshot.signal_war)
      : null;
  if (!Array.isArray(signalWar?.summary_lines)) return [];
  return signalWar.summary_lines.map((line) => String(line).trim()).filter(Boolean);
}

/**
 * @param {HTMLElement} boardRoot
 * @param {Record<string, unknown>} snapshot
 */
export function applySignalWarFromSnapshot(boardRoot, snapshot) {
  const section = boardRoot.querySelector("#city-game-map-signal-war");
  const list = boardRoot.querySelector("#city-game-map-signal-war-lines");
  if (!(section instanceof HTMLElement) || !(list instanceof HTMLUListElement)) return;

  const lines = signalWarSummaryLines(snapshot);

  list.replaceChildren();
  if (!lines.length) {
    section.hidden = true;
    return;
  }

  for (const line of lines) {
    const li = document.createElement("li");
    li.textContent = line;
    list.appendChild(li);
  }
  section.hidden = false;
}

/**
 * @param {HTMLElement} syncEl
 */
export function markSnapshotStale(syncEl) {
  if (!(syncEl instanceof HTMLElement)) return;
  syncEl.classList.add("city-game-map-sync--stale");
  syncEl.textContent = "Couldn’t refresh. Scan a sticker for live state.";
}

/**
 * @param {string} iso
 */
export function formatSyncLabel(iso) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "Live board";
  const when = new Date(ms);
  const time = when.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `Updated · ${time}`;
}

/**
 * @param {HTMLElement | null | undefined} list
 * @param {string[]} headlines
 */
export function renderTickerHeadlines(list, headlines) {
  if (!(list instanceof HTMLUListElement)) return;
  list.replaceChildren();
  const lines = Array.isArray(headlines) ? headlines.filter(Boolean) : [];
  if (!lines.length) {
    const li = document.createElement("li");
    li.textContent = "Quiet so far.";
    list.appendChild(li);
    return;
  }
  for (const line of lines) {
    const li = document.createElement("li");
    li.textContent = String(line);
    list.appendChild(li);
  }
  list.dataset.loaded = "1";
}
