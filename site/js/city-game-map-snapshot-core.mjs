/**
 * Apply season snapshot JSON to the city board DOM (M2 live chips).
 * @see docs/CITY_GAME_MAP_DASHBOARD.md
 */
import {
  escapeMapHtml,
  formatHookLine,
  formatProgressLine,
} from "./city-game-map-board-core.mjs";

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
    return `<span class="city-game-map-live-hint">Scan on arrival</span>`;
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

  for (const row of boardRoot.querySelectorAll(".city-game-map-node-row[data-node-id]")) {
    const nodeId = row.getAttribute("data-node-id");
    if (!nodeId) continue;
    const live = row.querySelector(".city-game-map-node-live");
    if (!(live instanceof HTMLElement)) continue;
    const snap = nodeSnapshot(nodeById, nodeId);
    if (!snap) {
      live.innerHTML = `<span class="city-game-map-live-hint">Scan on arrival</span>`;
      row.classList.remove("city-game-map-node-row--live");
      continue;
    }
    live.innerHTML = buildNodeChipsHtml(snap.chips);
    row.classList.add("city-game-map-node-row--live");
    if (snap.scan_url) {
      const link = document.createElement("a");
      link.className = "city-game-map-scan-link";
      link.href = snap.scan_url;
      link.textContent = "Open live scan";
      live.appendChild(link);
    }
    if (snap.map_mode === "care_pause" || snap.lifecycle === "paused") {
      row.classList.add("city-game-map-node-row--maintenance");
    } else {
      row.classList.remove("city-game-map-node-row--maintenance");
    }
    if (snap.lifecycle === "revoked") {
      row.classList.add("city-game-map-node-row--revoked");
    } else {
      row.classList.remove("city-game-map-node-row--revoked");
    }
  }

  const edges = Array.isArray(snapshot.unlock_edges) ? snapshot.unlock_edges : [];
  for (const edge of edges) {
    if (!edge?.from || !edge?.to) continue;
    const selector = `[data-edge-from="${edge.from}"][data-edge-to="${edge.to}"]`;
    for (const el of boardRoot.querySelectorAll(selector)) {
      el.classList.toggle("city-game-map-edge--satisfied", Boolean(edge.satisfied));
    }
  }

  for (const pin of boardRoot.querySelectorAll(".city-game-map-pin[data-node-id]")) {
    const nodeId = pin.getAttribute("data-node-id");
    const snap = nodeId ? nodeSnapshot(nodeById, nodeId) : null;
    const fogHidden = isSchematicPinFogged(nodeId, snap);
    // Fog is visual-only — schematic pins stay hittable for M4 list↔map navigation.
    pin.classList.toggle("city-game-map-pin--fog-hidden", fogHidden);
    pin.classList.toggle("city-game-map-pin--live", Boolean(snap?.chips?.length));
    pin.classList.toggle("city-game-map-pin--maintenance", snap?.map_mode === "care_pause");
  }

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

  applyLobbyProgressFromSnapshot(boardRoot, snapshot);
  applyFinaleFromSnapshot(boardRoot, snapshot);
  applySignalWarFromSnapshot(boardRoot, snapshot);

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
