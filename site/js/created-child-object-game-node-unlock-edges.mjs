/**
 * Phase E — unlock_edges browser editor on /created/ Manage.
 */

import { readChildObjectRows } from "./child-object-store-core.mjs";
import {
  readSeasonPublishDraft,
  writeSeasonPublishDraft,
} from "./city-game-rules-publish-core.mjs";
import { resolveSeasonTemplateRows } from "./city-game-season-template-core.mjs";
import {
  buildSeasonMetadataDraftExport,
  normalizeUnlockEdgeDraftRow,
  normalizeUnlockEdgesDraft,
  resolveUnlockEdgeNodeOptions,
  resolveUnlockEdgesForEditor,
  suggestedSeasonMetadataDraftFilename,
  validateUnlockEdgesDraft,
} from "./created-child-object-game-node-unlock-edges-core.mjs";
import {
  buildScanGraphRelationshipEdgesFromUnlockDraft,
  liveRelationshipEdgeStatus,
} from "./created-relationship-edge-publish-core.mjs";
import {
  fetchRelationshipEdges,
  publishRelationshipEdgesFromUnlockDraft,
} from "./created-relationship-edge-publish.mjs";

/**
 * @param {BlobPart} contents
 * @param {string} filename
 * @param {string} mime
 */
function downloadTextFile(contents, filename, mime) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * @param {{
 *   profileId: string;
 *   showError: (msg: string) => void;
 *   seasonSelect: HTMLSelectElement | null;
 *   getSeasonIndexRow: (seasonId: string) => Record<string, unknown> | null | undefined;
 *   getSigningKeys?: () => { privateKeyBase58: string; publicKeyBase58: string } | null;
 *   onDraftChange?: () => void;
 * }} ctx
 */
export function initCreatedGameNodeUnlockEdges(ctx) {
  const details = document.getElementById("child-object-game-node-unlock-edges");
  const summaryEl = document.getElementById("child-object-game-node-unlock-edges-summary");
  const tableWrap = document.getElementById("child-object-game-node-unlock-edges-table-wrap");
  const issuesEl = document.getElementById("child-object-game-node-unlock-edges-issues");
  const statusEl = document.getElementById("child-object-game-node-unlock-edges-status");
  const liveEl = document.getElementById("child-object-game-node-unlock-edges-live");
  const addBtn = document.getElementById("child-object-game-node-unlock-edges-add");
  const downloadBtn = document.getElementById("child-object-game-node-unlock-edges-download");
  const publishBtn = document.getElementById("child-object-game-node-unlock-edges-publish");

  if (!details) return null;

  /** @type {Record<string, unknown> | null} */
  let seasonBody = null;
  /** @type {Array<{ node_id: string; label: string; registered: boolean }>} */
  let nodeOptions = [];
  /** @type {Array<{ from: string; to: string; label?: string }>} */
  let edgeRows = [];

  async function loadSeasonBody(seasonId) {
    const indexRow = ctx.getSeasonIndexRow(seasonId);
    const jsonUrl = typeof indexRow?.json_url === "string" ? indexRow.json_url : "";
    if (!jsonUrl) {
      seasonBody = null;
      return;
    }
    try {
      const res = await fetch(jsonUrl, { credentials: "omit" });
      seasonBody = res.ok ? await res.json() : null;
    } catch {
      seasonBody = null;
    }
  }

  function readEdgesFromDom() {
    if (!tableWrap) return [];
    return [...tableWrap.querySelectorAll("tr[data-edge-index]")].map((tr) => {
      const fromSelect = tr.querySelector('select[name="unlock-from"]');
      const toSelect = tr.querySelector('select[name="unlock-to"]');
      const labelInput = tr.querySelector('input[name="unlock-label"]');
      return normalizeUnlockEdgeDraftRow({
        from: fromSelect instanceof HTMLSelectElement ? fromSelect.value : "",
        to: toSelect instanceof HTMLSelectElement ? toSelect.value : "",
        label: labelInput instanceof HTMLInputElement ? labelInput.value : "",
      });
    }).filter(Boolean);
  }

  function persistEdges(seasonId, edges) {
    if (!seasonId) return;
    const existing = readSeasonPublishDraft(localStorage, ctx.profileId, seasonId) ?? {};
    writeSeasonPublishDraft(localStorage, ctx.profileId, seasonId, {
      ...existing,
      unlock_edges: edges,
    });
    ctx.onDraftChange?.();
  }

  function renderLiveScanGraphStatus(seasonId, edges) {
    if (!liveEl) return;
    liveEl.replaceChildren();
    if (!seasonId || !edges.length) {
      liveEl.hidden = true;
      return;
    }
    const templateRows = resolveSeasonTemplateRows(seasonBody, seasonId);
    const built = buildScanGraphRelationshipEdgesFromUnlockDraft({
      season: seasonBody ?? {},
      profileId: ctx.profileId,
      seasonId,
      templateRows,
      unlockEdges: edges,
    });
    if (!built.edges.length) {
      liveEl.hidden = true;
      return;
    }
    const heading = document.createElement("p");
    heading.className = "form-hint created-game-node-unlock-edges-live-heading";
    heading.textContent = "Scan graph on Live";
    const ul = document.createElement("ul");
    ul.className = "created-game-node-unlock-edges-live-list";
    for (const row of built.edges) {
      const li = document.createElement("li");
      const status = liveRelationshipEdgeStatus(liveEdgeRows, row.edge_id);
      li.textContent = `${row.edge_id} · ${row.kind} · ${status}`;
      if (status === "active") li.className = "is-ready";
      if (status === "missing") li.className = "is-pending";
      ul.append(li);
    }
    liveEl.append(heading, ul);
    liveEl.hidden = false;
  }

  /** @type {Array<{ edge_id: string; status?: string }>} */
  let liveEdgeRows = [];

  async function loadLiveEdges() {
    try {
      liveEdgeRows = await fetchRelationshipEdges(ctx.profileId);
    } catch {
      liveEdgeRows = [];
    }
  }

  function updatePublishState(edges) {
    if (!(publishBtn instanceof HTMLButtonElement)) return;
    const keys = ctx.getSigningKeys?.() ?? null;
    const seasonId =
      ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "";
    const templateRows = resolveSeasonTemplateRows(seasonBody, seasonId);
    const validation = validateUnlockEdgesDraft(templateRows, edges);
    publishBtn.disabled = !keys || !seasonId || !edges.length || !validation.ok;
  }

  function renderIssues(templateRows, edges) {
    if (!issuesEl) return;
    issuesEl.replaceChildren();
    const validation = validateUnlockEdgesDraft(templateRows, edges);
    if (!edges.length) {
      const li = document.createElement("li");
      li.textContent =
        "Add at least one unlock edge after registering nodes, or keep the template spine in season JSON.";
      issuesEl.append(li);
      updatePublishState(edges);
      return;
    }
    if (validation.ok) {
      const li = document.createElement("li");
      li.className = "is-ready";
      li.textContent = "Unlock graph validates against registered template nodes.";
      issuesEl.append(li);
      return;
    }
    for (const issue of validation.issues) {
      const li = document.createElement("li");
      li.textContent = issue;
      issuesEl.append(li);
    }
    updatePublishState(edges);
  }

  function populateNodeSelect(select, selected) {
    if (!(select instanceof HTMLSelectElement)) return;
    select.replaceChildren();
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = nodeOptions.length ? "Choose node" : "Register nodes first";
    select.append(blank);
    for (const opt of nodeOptions) {
      const el = document.createElement("option");
      el.value = opt.node_id;
      el.textContent = `${opt.node_id} · ${opt.label}`;
      select.append(el);
    }
    if (selected) select.value = selected;
  }

  function renderEdgeTable(edges) {
    if (!tableWrap) return;
    edgeRows = edges;

    if (!nodeOptions.length) {
      tableWrap.replaceChildren();
      if (summaryEl) {
        summaryEl.textContent =
          "Register template nodes on Live first — unlock edges bind registered node_id values.";
      }
      if (addBtn instanceof HTMLButtonElement) addBtn.disabled = true;
      if (downloadBtn instanceof HTMLButtonElement) downloadBtn.disabled = true;
      return;
    }

    const table = document.createElement("table");
    table.className = "created-game-node-unlock-edges-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th scope="col">From</th>
          <th scope="col">To</th>
          <th scope="col">Label (optional)</th>
          <th scope="col"></th>
        </tr>
      </thead>`;
    const tbody = document.createElement("tbody");

    edges.forEach((edge, index) => {
      const tr = document.createElement("tr");
      tr.dataset.edgeIndex = String(index);

      const fromCell = document.createElement("td");
      const fromSelect = document.createElement("select");
      fromSelect.className = "form-input";
      fromSelect.name = "unlock-from";
      populateNodeSelect(fromSelect, edge.from);
      fromCell.append(fromSelect);

      const toCell = document.createElement("td");
      const toSelect = document.createElement("select");
      toSelect.className = "form-input";
      toSelect.name = "unlock-to";
      populateNodeSelect(toSelect, edge.to);
      toCell.append(toSelect);

      const labelCell = document.createElement("td");
      const labelInput = document.createElement("input");
      labelInput.className = "form-input";
      labelInput.name = "unlock-label";
      labelInput.maxLength = 120;
      labelInput.placeholder = "River lantern opens old town arch";
      labelInput.value = edge.label ?? "";
      labelCell.append(labelInput);

      const removeCell = document.createElement("td");
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn-text child-object-unlock-edge-remove";
      removeBtn.textContent = "Remove";
      removeCell.append(removeBtn);

      tr.append(fromCell, toCell, labelCell, removeCell);
      tbody.append(tr);
    });

    table.append(tbody);
    tableWrap.replaceChildren(table);

    const seasonId =
      ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "";
    const templateRows = resolveSeasonTemplateRows(seasonBody, seasonId);
    renderIssues(templateRows, edges);
    renderLiveScanGraphStatus(seasonId, edges);

    if (addBtn instanceof HTMLButtonElement) addBtn.disabled = nodeOptions.length < 2;
    if (downloadBtn instanceof HTMLButtonElement) {
      downloadBtn.disabled = !seasonId || edges.length === 0;
    }
  }

  function onEdgeFieldChange() {
    const seasonId =
      ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "";
    const edges = normalizeUnlockEdgesDraft(readEdgesFromDom());
    persistEdges(seasonId, edges);
    const templateRows = resolveSeasonTemplateRows(seasonBody, seasonId);
    renderIssues(templateRows, edges);
    if (downloadBtn instanceof HTMLButtonElement) {
      downloadBtn.disabled = !seasonId || edges.length === 0;
    }
  }

  async function refresh() {
    const seasonId =
      ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "";
    if (!seasonId) {
      nodeOptions = [];
      renderEdgeTable([]);
      if (summaryEl) {
        summaryEl.textContent = "Choose a season to edit route unlock edges for the network graph.";
      }
      return;
    }

    await loadSeasonBody(seasonId);
    await loadLiveEdges();
    const registered = readChildObjectRows(localStorage, ctx.profileId);
    const templateRows = resolveSeasonTemplateRows(seasonBody, seasonId);
    nodeOptions = resolveUnlockEdgeNodeOptions(registered, templateRows);

    const stored = readSeasonPublishDraft(localStorage, ctx.profileId, seasonId);
    const edges = resolveUnlockEdgesForEditor(seasonBody, seasonId, stored?.unlock_edges);

    if (summaryEl) {
      summaryEl.textContent =
        nodeOptions.length >= 2
          ? `${nodeOptions.length} registered nodes · ${edges.length} unlock edge${edges.length === 1 ? "" : "s"} in draft.`
          : `${nodeOptions.length} registered node${nodeOptions.length === 1 ? "" : "s"} — register more before wiring unlock edges.`;
    }

    renderEdgeTable(edges);
  }

  tableWrap?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (
      target.matches('select[name="unlock-from"]') ||
      target.matches('select[name="unlock-to"]') ||
      target.matches('input[name="unlock-label"]')
    ) {
      onEdgeFieldChange();
    }
  });

  tableWrap?.addEventListener("input", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === "unlock-label") {
      onEdgeFieldChange();
    }
  });

  tableWrap?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains("child-object-unlock-edge-remove")) return;

    const seasonId =
      ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "";
    const row = target.closest("tr[data-edge-index]");
    const index = row ? Number(row.dataset.edgeIndex) : -1;
    const edges = normalizeUnlockEdgesDraft(readEdgesFromDom());
    if (index >= 0) edges.splice(index, 1);
    persistEdges(seasonId, edges);
    renderEdgeTable(edges);
  });

  addBtn?.addEventListener("click", () => {
    const seasonId =
      ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "";
    if (nodeOptions.length < 2) return;
    const edges = normalizeUnlockEdgesDraft(readEdgesFromDom());
    const last = edges[edges.length - 1];
    const from = last?.to ?? nodeOptions[0].node_id;
    const to =
      nodeOptions.find((opt) => opt.node_id !== from)?.node_id ?? nodeOptions[1].node_id;
    edges.push({ from, to, label: "" });
    persistEdges(seasonId, edges);
    renderEdgeTable(edges);
  });

  downloadBtn?.addEventListener("click", () => {
    const seasonId =
      ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "";
    if (!seasonBody || !seasonId) return;
    const draft = readSeasonPublishDraft(localStorage, ctx.profileId, seasonId);
    const exportBody = buildSeasonMetadataDraftExport(seasonBody, draft, ctx.profileId);
    const filename = suggestedSeasonMetadataDraftFilename(seasonId);
    downloadTextFile(
      `${JSON.stringify(exportBody, null, 2)}\n`,
      filename,
      "application/json;charset=utf-8"
    );
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = `Downloaded ${filename} — merge unlock_edges into committed season JSON before deploy.`;
    }
  });

  publishBtn?.addEventListener("click", async () => {
    const seasonId =
      ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "";
    const keys = ctx.getSigningKeys?.() ?? null;
    if (!seasonId || !keys) {
      ctx.showError("Unlock your card keys on Live before publishing scan graph edges.");
      return;
    }
    const edges = normalizeUnlockEdgesDraft(readEdgesFromDom());
    const templateRows = resolveSeasonTemplateRows(seasonBody, seasonId);
    const validation = validateUnlockEdgesDraft(templateRows, edges);
    if (!validation.ok) {
      ctx.showError(validation.issues[0] ?? "Fix unlock edge validation first.");
      return;
    }
    if (publishBtn instanceof HTMLButtonElement) publishBtn.disabled = true;
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = "Publishing signed scan graph edges…";
    }
    try {
      const result = await publishRelationshipEdgesFromUnlockDraft({
        profileId: ctx.profileId,
        seasonId,
        season: seasonBody ?? {},
        templateRows,
        unlockEdges: edges,
        privateKeyBase58: keys.privateKeyBase58,
        publicKeyBase58: keys.publicKeyBase58,
      });
      await loadLiveEdges();
      renderLiveScanGraphStatus(seasonId, edges);
      if (statusEl) {
        statusEl.hidden = false;
        const parts = [];
        if (result.published.length) {
          parts.push(
            `Published ${result.published.length} edge${result.published.length === 1 ? "" : "s"} to Live scan graph.`
          );
        }
        if (result.skipped.length) {
          parts.push(
            `Skipped ${result.skipped.length} already active.`
          );
        }
        if (result.issues.length) {
          parts.push(result.issues.join(" "));
        }
        statusEl.textContent =
          parts.join(" ") || "No edges published — check validation and registered nodes.";
      }
      if (result.issues.length) {
        ctx.showError(result.issues[0]);
      }
      ctx.onDraftChange?.();
    } catch (err) {
      ctx.showError(err instanceof Error ? err.message : String(err));
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Publish failed.";
      }
    } finally {
      updatePublishState(edges);
    }
  });

  ctx.seasonSelect?.addEventListener("change", () => {
    void refresh();
  });

  details.addEventListener("toggle", () => {
    if (details.open) void refresh();
  });

  return { refresh };
}
