import {
  appendChildObjectRow,
  readChildObjectRows,
  updateChildObjectRow,
} from "./child-object-store-core.mjs";
import { refreshChildObjectsFromNetwork } from "./child-object-reconcile.mjs";
import {
  CHILD_OBJECT_STATUS_DISABLED,
  CHILD_OBJECT_TYPE_GAME_NODE,
  GAME_NODE_ROLE_OPTIONS,
  fetchSeasonConfigHints,
  isActiveGameNodeRow,
  parseGameNodeChildFields,
  resolveGameNodeSeasonId,
} from "./created-child-object-game-node-core.mjs";
import { stewardPresentationExtras } from "./steward-active-room-core.mjs";
import {
  appendChildObjectListRoomBadge,
  syncChildObjectSectionChrome,
} from "./created-child-object-section-ui.mjs";
import {
  shouldShowChildObjectGameNodePanel,
} from "./steward-child-object-list-policy-core.mjs";
import { shouldShowGameNodeSetupRowInDefaultUi } from "./steward-presentation-policy-core.mjs";
import {
  postChildObjectRevoke,
  signChildObjectRevoke,
  signGameNodeChildObjectCreate,
} from "./child-object-update.mjs";
import {
  issueChildObjectScanLink,
  registerChildObjectAndIssueScanLink,
} from "./child-object-register-issue.mjs";
import {
  assertChildObjectBackupGateAllowsCreate,
  syncChildObjectBackupGateUi,
} from "./child-object-backup-gate.mjs";
import { applyStewardScanLinkElement } from "./pwa-scan-handoff-core.mjs";
import { buildStewardScanPreviewHrefFromWindow } from "./pwa-scan-handoff.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";
import {
  annotateTemplateRegistrationState,
  bulkRegisterProgressLabel,
  mergeBulkEditorRows,
  parseBulkTemplateLabel,
  pendingBulkTemplateRows,
  resolveSeasonTemplateRows,
  summarizeBulkTemplateRows,
} from "./created-child-object-game-node-bulk-core.mjs";
import { initCreatedGameNodeRulesPublish } from "./created-child-object-game-node-rules.mjs";
import {
  initCreatedGameNodeSetupGuide,
} from "./created-child-object-game-node-setup.mjs";
import {
  clearRememberedGameSeasonIdForProfile,
  readRememberedGameSeasonId,
  rememberGameSeasonIdForProfile,
} from "./create-organizer-season-core.mjs";
import { SEASON_WHEN_ID_INPUT_ID } from "./created-season-when-panel-core.mjs";

/**
 * @param {string} profileId
 * @param {ReturnType<typeof readChildObjectRows>} rows
 */
function renderGameNodeList(profileId, rows) {
  const listEl = document.getElementById("child-object-game-node-list");
  if (!listEl) return;
  const nodes = rows.filter(isActiveGameNodeRow);
  if (!nodes.length) {
    listEl.hidden = true;
    listEl.replaceChildren();
    return;
  }
  listEl.hidden = false;
  listEl.replaceChildren(
    ...nodes.map((row) => {
      const li = document.createElement("li");
      li.className = "list-row child-object-game-node-row";
      li.dataset.objectId = row.object_id;

      const content = document.createElement("span");
      content.className = "list-content";
      const title = document.createElement("span");
      title.className = "list-title";
      title.textContent = row.public_label;
      const sub = document.createElement("span");
      sub.className = "list-sub";
      sub.textContent = row.public_state;
      content.append(title, sub);
      appendChildObjectListRoomBadge(li, "game_node");
      li.append(content);

      const scanWrap = document.createElement("div");
      scanWrap.className = "child-object-plate-scan";
      const scanStatus = document.createElement("p");
      scanStatus.className = "form-hint child-object-plate-scan-status";
      scanStatus.hidden = true;
      scanStatus.setAttribute("role", "status");
      if (typeof row.scan_url === "string" && row.scan_url) {
        const link = document.createElement("a");
        link.className = "btn-text";
        link.href = buildStewardScanPreviewHrefFromWindow(row.scan_url);
        applyStewardScanLinkElement(link, readStandaloneModeFromWindow(window));
        link.textContent = "Open scan page";
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "btn-secondary child-object-plate-copy-scan";
        copyBtn.dataset.scanUrl = row.scan_url;
        copyBtn.textContent = "Copy scan link";
        scanWrap.append(link, copyBtn);
      } else {
        const issueBtn = document.createElement("button");
        issueBtn.type = "button";
        issueBtn.className = "btn-secondary child-object-game-node-issue-qr";
        issueBtn.dataset.objectId = row.object_id;
        issueBtn.textContent = "Issue scan link";
        scanWrap.append(issueBtn);
      }
      scanWrap.append(scanStatus);

      const disableBtn = document.createElement("button");
      disableBtn.type = "button";
      disableBtn.className = "btn-text child-object-game-node-disable";
      disableBtn.dataset.objectId = row.object_id;
      disableBtn.textContent = "Disable this node";

      li.append(scanWrap, disableBtn);
      return li;
    })
  );
}

/**
 * @param {HTMLSelectElement | null} districtSelect
 * @param {string[]} districts
 */
function populateDistrictSelect(districtSelect, districts) {
  if (!districtSelect) return;
  districtSelect.replaceChildren();
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = districts.length ? "Choose district (optional)" : "District slug (optional)";
  districtSelect.append(blank);
  for (const district of districts) {
    const opt = document.createElement("option");
    opt.value = district;
    opt.textContent = district;
    districtSelect.append(opt);
  }
}

/**
 * @param {{
 *   profileId: string;
 *   getSession: () => Record<string, unknown> | null;
 *   showError: (msg: string) => void;
 *   getSigningKeys: () => { privateKeyBase58: string; publicKeyBase58: string } | null;
 * }} ctx
 */
export function initCreatedGameNode(ctx) {
  const panel = document.getElementById("child-object-add-game-node");
  const form = document.getElementById("child-object-game-node-form");
  const statusEl = document.getElementById("child-object-game-node-status");
  const listEl = document.getElementById("child-object-game-node-list");
  const seasonSelect = document.getElementById("child-object-game-node-season");
  const districtSelect = document.getElementById("child-object-game-node-district");
  const roleSelect = document.getElementById("child-object-game-node-role");
  const bulkWrap = document.getElementById("child-object-game-node-bulk-table-wrap");
  const bulkSummary = document.getElementById("child-object-game-node-bulk-summary");
  const bulkStatus = document.getElementById("child-object-game-node-bulk-status");
  const bulkSubmit = document.getElementById("child-object-game-node-bulk-submit");
  const bulkDetails = document.getElementById("child-object-game-node-bulk");
  if (!panel || !form || !(roleSelect instanceof HTMLSelectElement)) return null;

  /** @type {Array<{ node_id: string; label: string; role: string; district: string | null; object_id: string; registered?: boolean; selected?: boolean; public_state: string; object_streams: unknown[]; game_meta: Record<string, unknown> }>} */
  let templateRows = [];

  if (!roleSelect.options.length) {
    for (const opt of GAME_NODE_ROLE_OPTIONS) {
      const el = document.createElement("option");
      el.value = opt.value;
      el.textContent = opt.label;
      roleSelect.append(el);
    }
  }

  /** @type {Map<string, { json_url?: string }>} */
  const seasonById = new Map();
  let seasonIndexLoadToken = 0;

  /**
   * @param {string} seasonId
   */
  function syncWhenPanelInput(seasonId) {
    const input = document.getElementById(SEASON_WHEN_ID_INPUT_ID);
    if (input instanceof HTMLInputElement) input.value = seasonId;
  }

  /**
   * @param {unknown} seasonIdRaw
   */
  function rememberSelectedSeasonId(seasonIdRaw) {
    const seasonId = typeof seasonIdRaw === "string" ? seasonIdRaw.trim() : "";
    if (!seasonId) {
      clearRememberedGameSeasonIdForProfile(ctx.profileId);
      syncWhenPanelInput("");
      return "";
    }
    const parsed = resolveGameNodeSeasonId(seasonId, "");
    rememberGameSeasonIdForProfile(ctx.profileId, parsed);
    syncWhenPanelInput(parsed);
    return parsed;
  }

  function currentGameNodeSeasonId() {
    return resolveGameNodeSeasonId(
      seasonSelect instanceof HTMLSelectElement ? seasonSelect.value : "",
      readRememberedGameSeasonId(ctx.profileId)
    );
  }

  /**
   * @param {string} seasonId
   */
  function ensureSeasonSelectOption(seasonId) {
    if (!(seasonSelect instanceof HTMLSelectElement) || !seasonId) return;
    if (!seasonById.has(seasonId)) {
      seasonById.set(seasonId, { season_id: seasonId });
    }
    if ([...seasonSelect.options].some((opt) => opt.value === seasonId)) return;
    const opt = document.createElement("option");
    opt.value = seasonId;
    opt.textContent = `Your season · ${seasonId}`;
    seasonSelect.append(opt);
  }

  async function loadSeasonIndex() {
    if (!(seasonSelect instanceof HTMLSelectElement)) return;
    const loadToken = ++seasonIndexLoadToken;
    try {
      const res = await fetch("/data/city-game-seasons-index.json", { credentials: "omit" });
      if (!res.ok) return;
      const body = await res.json();
      const seasons = Array.isArray(body.seasons) ? body.seasons : [];
      if (loadToken !== seasonIndexLoadToken) return;
      const selectedBeforeRebuild = seasonSelect.value.trim();
      seasonSelect.replaceChildren();
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Choose season";
      seasonSelect.append(placeholder);
      for (const row of seasons) {
        if (!row || typeof row !== "object") continue;
        const seasonId = typeof row.season_id === "string" ? row.season_id : "";
        if (!seasonId) continue;
        seasonById.set(seasonId, row);
        const opt = document.createElement("option");
        opt.value = seasonId;
        const city = typeof row.city === "string" ? row.city : seasonId;
        opt.textContent = `${city} · ${seasonId}`;
        seasonSelect.append(opt);
      }
      const seasonId = selectedBeforeRebuild || readRememberedGameSeasonId(ctx.profileId);
      if (seasonId) {
        ensureSeasonSelectOption(seasonId);
        seasonSelect.value = seasonId;
        rememberSelectedSeasonId(seasonId);
        await refreshDistrictsForSeason(seasonId);
      }
    } catch {
      /* index optional offline */
    }
  }

  async function refreshDistrictsForSeason(seasonId) {
    const row = seasonById.get(seasonId);
    const jsonUrl = typeof row?.json_url === "string" ? row.json_url : "";
    const hints = await fetchSeasonConfigHints(jsonUrl);
    populateDistrictSelect(
      districtSelect instanceof HTMLSelectElement ? districtSelect : null,
      hints?.districts ?? []
    );
  }

  /**
   * @param {string} seasonIdRaw
   */
  async function selectSeasonId(seasonIdRaw) {
    const seasonId = String(seasonIdRaw ?? "").trim();
    if (!(seasonSelect instanceof HTMLSelectElement)) return;
    if (seasonId) {
      ensureSeasonSelectOption(seasonId);
      seasonSelect.value = seasonId;
    } else {
      seasonSelect.value = "";
    }
    rememberSelectedSeasonId(seasonId);
    await refreshDistrictsForSeason(seasonId);
    await refreshBulkPanel(readChildObjectRows(localStorage, ctx.profileId));
    rulesPublishCtl?.refresh?.();
    setupGuideCtl?.refresh?.();
  }

  seasonSelect?.addEventListener("change", () => {
    if (!(seasonSelect instanceof HTMLSelectElement)) return;
    const seasonId = rememberSelectedSeasonId(seasonSelect.value);
    void refreshDistrictsForSeason(seasonId);
    void refreshBulkPanel(readChildObjectRows(localStorage, ctx.profileId));
    rulesPublishCtl?.refresh?.();
    setupGuideCtl?.refresh?.();
  });

  function readBulkEditorRowsFromDom() {
    if (!bulkWrap) return [];
    return [...bulkWrap.querySelectorAll("tr[data-node-id]")].map((tr) => {
      const nodeId = tr.dataset.nodeId ?? "";
      const labelInput = tr.querySelector('input[name="bulk-label"]');
      const check = tr.querySelector('input[name="bulk-select"]');
      return {
        node_id: nodeId,
        label: labelInput instanceof HTMLInputElement ? labelInput.value : "",
        selected: check instanceof HTMLInputElement ? check.checked : true,
      };
    });
  }

  function renderBulkTemplateTable(rows) {
    if (!bulkWrap) return;
    if (!rows.length) {
      bulkWrap.replaceChildren();
      if (bulkSummary) bulkSummary.textContent = "Choose a season to load the starter registry.";
      if (bulkSubmit instanceof HTMLButtonElement) bulkSubmit.disabled = true;
      return;
    }

    const summary = summarizeBulkTemplateRows(rows);
    if (bulkSummary) {
      bulkSummary.textContent =
        summary.pending > 0
          ? `${summary.registered} / ${summary.total} registered · ${summary.pending} ready to import`
          : `${summary.registered} / ${summary.total} registered on this card`;
    }

    const table = document.createElement("table");
    table.className = "created-game-node-bulk-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th scope="col">Import</th>
          <th scope="col">Node</th>
          <th scope="col">Role</th>
          <th scope="col">District</th>
          <th scope="col">Place name</th>
        </tr>
      </thead>`;
    const tbody = document.createElement("tbody");

    for (const row of rows) {
      const tr = document.createElement("tr");
      tr.dataset.nodeId = row.node_id;
      if (row.registered) tr.classList.add("is-registered");

      const selectCell = document.createElement("td");
      const check = document.createElement("input");
      check.type = "checkbox";
      check.name = "bulk-select";
      check.checked = !row.registered && row.selected !== false;
      check.disabled = !!row.registered;
      selectCell.append(check);

      const nodeCell = document.createElement("td");
      nodeCell.textContent = row.node_id;

      const roleCell = document.createElement("td");
      roleCell.textContent = row.role;

      const districtCell = document.createElement("td");
      districtCell.textContent = row.district ?? "None";

      const labelCell = document.createElement("td");
      const labelInput = document.createElement("input");
      labelInput.className = "form-input";
      labelInput.name = "bulk-label";
      labelInput.maxLength = 120;
      labelInput.value = row.label;
      labelInput.disabled = !!row.registered;
      labelCell.append(labelInput);

      tr.append(selectCell, nodeCell, roleCell, districtCell, labelCell);
      tbody.append(tr);
    }

    table.append(tbody);
    bulkWrap.replaceChildren(table);

    const pending = pendingBulkTemplateRows(rows).length;
    if (bulkSubmit instanceof HTMLButtonElement) {
      bulkSubmit.disabled = pending === 0;
      bulkSubmit.textContent =
        pending > 0 ? `Register selected nodes (${pending})` : "All template nodes registered";
    }
  }

  async function refreshBulkPanel(registeredRows) {
    if (!(seasonSelect instanceof HTMLSelectElement)) return;
    const seasonId = seasonSelect.value.trim();
    if (!seasonId) {
      templateRows = [];
      renderBulkTemplateTable([]);
      return;
    }

    const indexRow = seasonById.get(seasonId);
    const jsonUrl = typeof indexRow?.json_url === "string" ? indexRow.json_url : "";
    let seasonBody = null;
    if (jsonUrl) {
      try {
        const res = await fetch(jsonUrl, { credentials: "omit" });
        if (res.ok) seasonBody = await res.json();
      } catch {
        seasonBody = null;
      }
    }

    const baseRows = resolveSeasonTemplateRows(seasonBody, seasonId);
    const annotated = annotateTemplateRegistrationState(baseRows, registeredRows);
    const editor = readBulkEditorRowsFromDom();
    templateRows = editor.length ? mergeBulkEditorRows(annotated, editor) : annotated;
    renderBulkTemplateTable(templateRows);

    syncChildObjectBackupGateUi({
      profileId: ctx.profileId,
      getSession: ctx.getSession,
      noticeId: "child-object-game-node-bulk-backup-gate",
      submitId: "child-object-game-node-bulk-submit",
      context: "game_season",
    });
  }

  async function refreshList() {
    await refreshChildObjectsFromNetwork(localStorage, ctx.profileId);
    const rows = readChildObjectRows(localStorage, ctx.profileId);
    renderGameNodeList(ctx.profileId, rows);
    await refreshBulkPanel(rows);
    syncChildObjectBackupGateUi({
      profileId: ctx.profileId,
      getSession: ctx.getSession,
      noticeId: "child-object-game-node-backup-gate",
      submitId: "child-object-game-node-submit",
      context: "game_season",
    });
  }

  function refreshVisibility() {
    const session = ctx.getSession();
    const extras = stewardPresentationExtras(ctx.profileId);
    const rows = readChildObjectRows(localStorage, ctx.profileId);
    const activeCount = rows.filter(isActiveGameNodeRow).length;
    const showSetup = shouldShowGameNodeSetupRowInDefaultUi(session, extras);
    syncChildObjectSectionChrome(
      panel,
      "game_node",
      session,
      activeCount,
      extras
    );
    const showPanel = shouldShowChildObjectGameNodePanel(session, activeCount, extras);
    panel.hidden = !showPanel;
    const setupEl = document.getElementById("child-object-game-node-setup");
    if (setupEl instanceof HTMLElement) setupEl.hidden = !showSetup;
    if (showPanel) {
      void loadSeasonIndex().then(() => refreshList());
    } else {
      syncChildObjectBackupGateUi({
        profileId: ctx.profileId,
        getSession: ctx.getSession,
        noticeId: "child-object-game-node-backup-gate",
        submitId: "child-object-game-node-submit",
        context: "game_season",
      });
    }
  }

  refreshVisibility();

  const rulesPublishCtl = initCreatedGameNodeRulesPublish({
    profileId: ctx.profileId,
    getSession: ctx.getSession,
    showError: ctx.showError,
    seasonSelect: seasonSelect instanceof HTMLSelectElement ? seasonSelect : null,
    getSeasonIndexRow: (seasonId) => seasonById.get(seasonId),
  });

  const setupGuideCtl = initCreatedGameNodeSetupGuide({
    profileId: ctx.profileId,
    getSession: ctx.getSession,
    showError: ctx.showError,
    seasonSelect: seasonSelect instanceof HTMLSelectElement ? seasonSelect : null,
    getSeasonIndexRow: (seasonId) => seasonById.get(seasonId),
  });

  listEl?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.classList.contains("child-object-plate-copy-scan")) {
      const url = target.dataset.scanUrl;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        const status = target
          .closest(".child-object-plate-scan")
          ?.querySelector(".child-object-plate-scan-status");
        if (status instanceof HTMLElement) {
          status.hidden = false;
          status.textContent = "Scan link copied.";
        }
      } catch {
        ctx.showError("Could not copy scan link.");
      }
      return;
    }

    if (target.classList.contains("child-object-game-node-issue-qr")) {
      const objectId = target.dataset.objectId;
      const keys = ctx.getSigningKeys();
      if (!objectId || !keys) return;
      target.disabled = true;
      const scanStatus = target
        .closest(".child-object-plate-scan")
        ?.querySelector(".child-object-plate-scan-status");
      if (scanStatus instanceof HTMLElement) {
        scanStatus.hidden = false;
        scanStatus.textContent = "Issuing scan link…";
      }
      try {
        const { scanUrl, qrId } = await issueChildObjectScanLink({
          profileId: ctx.profileId,
          objectId,
          privateKeyBase58: keys.privateKeyBase58,
          publicKeyBase58: keys.publicKeyBase58,
        });
        updateChildObjectRow(localStorage, ctx.profileId, objectId, {
          qr_id: qrId,
          scan_url: scanUrl,
        });
        refreshList();
        if (scanStatus instanceof HTMLElement) {
          scanStatus.textContent = "Scan link ready. Print or share on the sticker.";
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (scanStatus instanceof HTMLElement) scanStatus.textContent = message;
        ctx.showError(message);
      } finally {
        target.disabled = false;
      }
      return;
    }

    if (!target.classList.contains("child-object-game-node-disable")) return;
    const objectId = target.dataset.objectId;
    const keys = ctx.getSigningKeys();
    if (!objectId || !keys) return;
    if (
      !window.confirm(
        "Disable this game node on the network? Scanners will see the object as unavailable."
      )
    ) {
      return;
    }
    const stored = readChildObjectRows(localStorage, ctx.profileId).find(
      (row) => row.object_id === objectId
    );
    if (!stored || typeof stored.created_at !== "string") {
      ctx.showError("Missing child object record on this device.");
      return;
    }
    target.disabled = true;
    try {
      const signed = await signChildObjectRevoke({
        objectId,
        parentProfileId: ctx.profileId,
        objectType: CHILD_OBJECT_TYPE_GAME_NODE,
        publicLabel: stored.public_label,
        publicState: stored.public_state,
        createdAt: stored.created_at,
        privateKeyBase58: keys.privateKeyBase58,
        publicKeyBase58: keys.publicKeyBase58,
        status: CHILD_OBJECT_STATUS_DISABLED,
      });
      await postChildObjectRevoke(ctx.profileId, objectId, signed);
      updateChildObjectRow(localStorage, ctx.profileId, objectId, {
        status: CHILD_OBJECT_STATUS_DISABLED,
      });
      refreshList();
    } catch (err) {
      ctx.showError(err instanceof Error ? err.message : String(err));
    } finally {
      target.disabled = false;
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const keys = ctx.getSigningKeys();
    if (!keys) {
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Unlock owner or recovery key before adding a game node.";
      }
      return;
    }

    const labelInput = document.getElementById("child-object-game-node-label");
    const submitBtn = document.getElementById("child-object-game-node-submit");
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = "Signing, registering node, and issuing scan link…";
    }

    try {
      assertChildObjectBackupGateAllowsCreate({
        profileId: ctx.profileId,
        getSession: ctx.getSession,
      });
      const { publicLabel, nodeRole, district, seasonId } = parseGameNodeChildFields(
        labelInput instanceof HTMLInputElement ? labelInput.value : "",
        roleSelect.value,
        districtSelect instanceof HTMLSelectElement ? districtSelect.value : "",
        currentGameNodeSeasonId()
      );
      const signedCreate = await signGameNodeChildObjectCreate({
        profileId: ctx.profileId,
        seasonId,
        publicLabel,
        nodeRole,
        district,
        privateKeyBase58: keys.privateKeyBase58,
        publicKeyBase58: keys.publicKeyBase58,
      });
      const result = await registerChildObjectAndIssueScanLink({
        profileId: ctx.profileId,
        objectType: CHILD_OBJECT_TYPE_GAME_NODE,
        publicLabel,
        publicState: signedCreate.public_state,
        privateKeyBase58: keys.privateKeyBase58,
        publicKeyBase58: keys.publicKeyBase58,
        signedCreate,
      });
      appendChildObjectRow(localStorage, ctx.profileId, {
        object_id: result.objectId,
        object_type: CHILD_OBJECT_TYPE_GAME_NODE,
        public_label: publicLabel,
        public_state: result.publicState,
        created_at: result.createdAt,
        ...(result.scanUrl && result.qrId
          ? { qr_id: result.qrId, scan_url: result.scanUrl }
          : {}),
      });
      if (labelInput instanceof HTMLInputElement) labelInput.value = "";
      refreshList();
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = result.scanUrl
          ? "Game node registered and scan link ready. Print or share on the sticker."
          : "Game node registered on the network. Issue scan link below when ready.";
      }
      if (result.issueFailed && result.issueError) {
        ctx.showError(result.issueError);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = message;
      }
      ctx.showError(message);
    } finally {
      if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
    }
  });

  bulkSubmit?.addEventListener("click", async () => {
    const keys = ctx.getSigningKeys();
    if (!(seasonSelect instanceof HTMLSelectElement) || !keys) {
      if (bulkStatus) {
        bulkStatus.hidden = false;
        bulkStatus.textContent = "Unlock owner or recovery key before bulk import.";
      }
      return;
    }

    let seasonId = "";
    try {
      seasonId = currentGameNodeSeasonId();
    } catch {
      ctx.showError("Choose a season first.");
      return;
    }

    const editorRows = readBulkEditorRowsFromDom();
    const merged = mergeBulkEditorRows(templateRows, editorRows);
    const toRegister = pendingBulkTemplateRows(merged);

    if (!toRegister.length) return;

    if (bulkSubmit instanceof HTMLButtonElement) bulkSubmit.disabled = true;
    if (bulkStatus) {
      bulkStatus.hidden = false;
      bulkStatus.textContent = bulkRegisterProgressLabel(0, toRegister.length);
    }

    let done = 0;
    let failedAt = null;

    for (const row of toRegister) {
      try {
        assertChildObjectBackupGateAllowsCreate({
          profileId: ctx.profileId,
          getSession: ctx.getSession,
          adding: 1,
        });
        const publicLabel = parseBulkTemplateLabel(row.label, row.node_id);
        const signedCreate = await signGameNodeChildObjectCreate({
          profileId: ctx.profileId,
          seasonId,
          publicLabel,
          nodeRole: row.role,
          district: row.district,
          objectId: row.object_id,
          templateRow: row,
          privateKeyBase58: keys.privateKeyBase58,
          publicKeyBase58: keys.publicKeyBase58,
        });
        const result = await registerChildObjectAndIssueScanLink({
          profileId: ctx.profileId,
          objectType: CHILD_OBJECT_TYPE_GAME_NODE,
          publicLabel,
          publicState: signedCreate.public_state,
          privateKeyBase58: keys.privateKeyBase58,
          publicKeyBase58: keys.publicKeyBase58,
          signedCreate,
        });
        appendChildObjectRow(localStorage, ctx.profileId, {
          object_id: result.objectId,
          object_type: CHILD_OBJECT_TYPE_GAME_NODE,
          public_label: publicLabel,
          public_state: result.publicState,
          created_at: result.createdAt,
          ...(result.scanUrl && result.qrId
            ? { qr_id: result.qrId, scan_url: result.scanUrl }
            : {}),
        });
        done += 1;
        if (bulkStatus) {
          bulkStatus.textContent = bulkRegisterProgressLabel(done, toRegister.length);
        }
      } catch (err) {
        failedAt = row.node_id;
        const message = err instanceof Error ? err.message : String(err);
        if (bulkStatus) {
          bulkStatus.textContent = `Stopped at ${row.node_id}: ${message}`;
        }
        ctx.showError(message);
        break;
      }
    }

    await refreshList();

    if (!failedAt && bulkStatus) {
      bulkStatus.textContent =
        done === toRegister.length
          ? `Registered ${done} node${done === 1 ? "" : "s"} with scan links.`
          : `Registered ${done} of ${toRegister.length} nodes.`;
    }

    if (bulkSubmit instanceof HTMLButtonElement && bulkDetails?.open) {
      bulkSubmit.disabled = pendingBulkTemplateRows(templateRows).length === 0;
    }
  });

  return {
    refresh: () => {
      refreshVisibility();
      rulesPublishCtl?.refresh?.();
      setupGuideCtl?.refresh?.();
    },
    selectSeasonId,
  };
}
