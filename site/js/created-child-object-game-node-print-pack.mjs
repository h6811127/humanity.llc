/**
 * Phase E — print / install pack UI on /created/ Manage.
 */

import { readChildObjectRows } from "./child-object-store-core.mjs";
import {
  assessInstallPackReady,
  buildInstallChecklistText,
  buildInstallPackCsv,
  installPackCsvFilename,
  installPackQrFilename,
  installPackSummaryCopy,
  resolveInstallPackRows,
} from "./created-child-object-game-node-print-pack-core.mjs";

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
 * }} ctx
 */
export function initCreatedGameNodePrintPack(ctx) {
  const details = document.getElementById("child-object-game-node-print-pack");
  const summaryEl = document.getElementById("child-object-game-node-print-pack-summary");
  const tableWrap = document.getElementById("child-object-game-node-print-pack-table-wrap");
  const statusEl = document.getElementById("child-object-game-node-print-pack-status");
  const csvBtn = document.getElementById("child-object-game-node-print-pack-download-csv");
  const checklistBtn = document.getElementById("child-object-game-node-print-pack-copy-checklist");
  const downloadAllBtn = document.getElementById("child-object-game-node-print-pack-download-all-qr");

  if (!details) return null;

  /** @type {Record<string, unknown> | null} */
  let seasonBody = null;
  /** @type {ReturnType<typeof resolveInstallPackRows>} */
  let packRows = [];
  /** @type {ReturnType<typeof assessInstallPackReady>} */
  let assessment = { ready: false, issues: [], withQr: 0, total: 0, missingQr: [] };

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

  function seasonContext(seasonId) {
    const indexRow = ctx.getSeasonIndexRow(seasonId);
    return {
      seasonId,
      seasonTitle: typeof indexRow?.title === "string" ? indexRow.title : seasonId,
      city: typeof indexRow?.city === "string" ? indexRow.city : "",
      profileId: ctx.profileId,
    };
  }

  function renderTable(rows) {
    if (!tableWrap) return;
    if (!rows.length) {
      tableWrap.replaceChildren();
      return;
    }

    const table = document.createElement("table");
    table.className = "created-game-node-print-pack-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th scope="col">Node</th>
          <th scope="col">Place</th>
          <th scope="col">District</th>
          <th scope="col">QR</th>
          <th scope="col">Export</th>
        </tr>
      </thead>`;
    const tbody = document.createElement("tbody");

    for (const row of rows) {
      const tr = document.createElement("tr");
      if (!row.qr_issued) tr.classList.add("is-missing-qr");

      const nodeCell = document.createElement("td");
      nodeCell.textContent = row.node_id;

      const labelCell = document.createElement("td");
      labelCell.textContent = row.label;

      const districtCell = document.createElement("td");
      districtCell.textContent = row.district || "—";

      const qrCell = document.createElement("td");
      qrCell.textContent = row.qr_issued ? "Ready" : "Issue scan link";

      const exportCell = document.createElement("td");
      exportCell.className = "created-game-node-print-pack-actions";
      if (row.scan_url) {
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "btn-text child-object-print-pack-copy-scan";
        copyBtn.dataset.scanUrl = row.scan_url;
        copyBtn.textContent = "Copy link";
        const pngBtn = document.createElement("button");
        pngBtn.type = "button";
        pngBtn.className = "btn-text child-object-print-pack-download-qr";
        pngBtn.dataset.scanUrl = row.scan_url;
        pngBtn.dataset.nodeId = row.node_id;
        pngBtn.textContent = "PNG";
        exportCell.append(copyBtn, pngBtn);
      } else {
        exportCell.textContent = "—";
      }

      tr.append(nodeCell, labelCell, districtCell, qrCell, exportCell);
      tbody.append(tr);
    }

    table.append(tbody);
    tableWrap.replaceChildren(table);
  }

  function setButtonsEnabled() {
    const enabled = assessment.ready;
    if (csvBtn instanceof HTMLButtonElement) csvBtn.disabled = !enabled;
    if (checklistBtn instanceof HTMLButtonElement) checklistBtn.disabled = !enabled;
    if (downloadAllBtn instanceof HTMLButtonElement) {
      downloadAllBtn.disabled = assessment.withQr === 0;
    }
  }

  async function refresh() {
    const seasonId =
      ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "";
    if (!seasonId) {
      packRows = [];
      assessment = assessInstallPackReady(packRows);
      if (summaryEl) {
        summaryEl.textContent = "Choose a season on Live (Game node) to export install materials.";
      }
      renderTable([]);
      setButtonsEnabled();
      return;
    }

    await loadSeasonBody(seasonId);
    const registered = readChildObjectRows(localStorage, ctx.profileId);
    packRows = resolveInstallPackRows(seasonBody, seasonId, registered);
    assessment = assessInstallPackReady(packRows);

    if (summaryEl) summaryEl.textContent = installPackSummaryCopy(assessment);
    renderTable(packRows);
    setButtonsEnabled();

    if (statusEl && assessment.issues.length && assessment.withQr > 0) {
      statusEl.hidden = false;
      statusEl.textContent = assessment.issues.join(" ");
    } else if (statusEl) {
      statusEl.hidden = true;
      statusEl.textContent = "";
    }
  }

  tableWrap?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.classList.contains("child-object-print-pack-copy-scan")) {
      const url = target.dataset.scanUrl;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.textContent = "Scan link copied.";
        }
      } catch {
        ctx.showError("Could not copy scan link.");
      }
      return;
    }

    if (target.classList.contains("child-object-print-pack-download-qr")) {
      const url = target.dataset.scanUrl;
      const nodeId = target.dataset.nodeId ?? "node";
      const seasonId =
        ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "season";
      if (!url) return;
      target.disabled = true;
      try {
        const { downloadQrPng } = await import("./qr-render.mjs");
        await downloadQrPng(url, installPackQrFilename(seasonId, nodeId));
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.textContent = `Downloaded QR for ${nodeId}.`;
        }
      } catch (err) {
        ctx.showError(err instanceof Error ? err.message : String(err));
      } finally {
        target.disabled = false;
      }
    }
  });

  csvBtn?.addEventListener("click", () => {
    const seasonId =
      ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "season";
    if (!assessment.ready) return;
    downloadTextFile(
      buildInstallPackCsv(packRows),
      installPackCsvFilename(seasonId),
      "text/csv;charset=utf-8"
    );
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = "Install pack CSV downloaded.";
    }
  });

  checklistBtn?.addEventListener("click", async () => {
    const seasonId =
      ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "season";
    if (!assessment.ready) return;
    const text = buildInstallChecklistText(seasonContext(seasonId), packRows);
    try {
      await navigator.clipboard.writeText(text);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Install checklist copied — paste into your runbook or notes.";
      }
    } catch {
      downloadTextFile(text, `humanity-${seasonId}-install-checklist.md`, "text/markdown;charset=utf-8");
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Install checklist downloaded.";
      }
    }
  });

  downloadAllBtn?.addEventListener("click", async () => {
    const seasonId =
      ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "season";
    const withQr = packRows.filter((row) => row.qr_issued);
    if (!withQr.length) return;
    if (!(downloadAllBtn instanceof HTMLButtonElement)) return;

    downloadAllBtn.disabled = true;
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = `Downloading ${withQr.length} QR PNG${withQr.length === 1 ? "" : "s"}…`;
    }

    try {
      const { downloadQrPng } = await import("./qr-render.mjs");
      for (const [index, row] of withQr.entries()) {
        await downloadQrPng(row.scan_url, installPackQrFilename(seasonId, row.node_id));
        if (statusEl) {
          statusEl.textContent = `Downloaded ${index + 1} / ${withQr.length} QR PNGs…`;
        }
        if (index < withQr.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      }
      if (statusEl) {
        statusEl.textContent = `Downloaded ${withQr.length} QR PNG${withQr.length === 1 ? "" : "s"}.`;
      }
    } catch (err) {
      ctx.showError(err instanceof Error ? err.message : String(err));
    } finally {
      downloadAllBtn.disabled = assessment.withQr === 0;
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
