/**
 * Hydrate /docket/{id}/steward/ shell (WS-DOCKET-C + DG-v0 + QR-v0 + C-v3).
 */
import { docketCaseIdFromPath } from "./docket-case-page.mjs";
import {
  docketCaseDataPath,
  renderDocketStewardShellHtml,
  validateDocketCase,
  validateDocketPhotoLicenseChecklist,
} from "./docket-case-core.mjs";
import {
  DOCKET_EDIT_DUAL_GATE_THRESHOLD,
  DOCKET_EDIT_PROPOSAL_FIELD_PATHS,
  docketEditProposalMeetsDualGate,
  normalizeDocketEditApprovals,
  readDocketEditProposalsFromStorage,
  writeDocketEditProposalsToStorage,
} from "./docket-edit-proposal-core.mjs";
import {
  approveDocketEditProposalSigned,
  applyDocketEditProposalSigned,
  createDocketEditProposalSigned,
  docketEditSignaturesMeetDualGate,
  normalizeDocketEditSignatures,
} from "./docket-edit-proposal-sign-browser.mjs";
import {
  buildDocketMergePack,
  docketMergePackFilename,
  validateDocketMergePack,
} from "./docket-edit-proposal-merge-core.mjs";
import {
  fetchDocketEditProposalsFromStore,
  putDocketEditProposalsToStore,
} from "./docket-edit-proposal-store-core.mjs";
import { resolverApiOrigin } from "./hc-sign.mjs";
import {
  DOCKET_CASEFILE_FIXTURE_PROFILE_ID,
  DOCKET_CASEFILE_FIXTURE_QR_ID,
  readDocketQrUpgradePreviewFromStorage,
  renderDocketQrUpgradeHtml,
  upgradePublicDocketCaseLiveObjectToChildQr,
  writeDocketQrUpgradePreviewToStorage,
} from "./docket-live-object-bind-core.mjs";
import {
  buildDocketDiscoveryOptInLiveObject,
  readDocketDiscoveryOptInPreview,
  renderDocketDiscoveryOptInHtml,
  validateDocketDiscoveryOptInFields,
  writeDocketDiscoveryOptInPreview,
} from "./docket-discovery-opt-in-core.mjs";
import {
  DOCKET_PHOTO_CHECKLIST_PATH,
  docketPhotoChecklistRowForCase,
  renderDocketPhotoStewardHtml,
} from "./docket-photo-core.mjs";
import {
  DOCKET_PHOTO_LICENSE_PACKS_PATH,
  docketPhotoLicensePackForSubject,
  renderDocketPhotoLicensePackStewardHtml,
  validateDocketPhotoLicensePacks,
} from "./docket-photo-license-pack-core.mjs";

/**
 * @param {HTMLElement} rootEl
 * @param {string} caseId
 */
export async function hydrateDocketStewardPage(rootEl, caseId) {
  const path = docketCaseDataPath(caseId);
  if (!path) throw new Error("missing case id");
  const res = await fetch(path, { credentials: "omit" });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  const raw = await res.json();
  const result = validateDocketCase(raw);
  if (!result.ok) throw new Error(result.errors.join("; "));
  rootEl.innerHTML = renderDocketStewardShellHtml(result.case);
  mountDocketQrUpgradePanel(rootEl, result.case);
  mountDocketDiscoveryOptInPanel(rootEl, result.case);
  await mountDocketPhotosPanel(rootEl, result.case);
  mountDocketEditProposalsPanel(rootEl, result.case);
  return result.case;
}

/**
 * @param {HTMLElement} shellRoot
 * @param {Record<string, unknown>} fullCase
 */
export async function mountDocketPhotosPanel(shellRoot, fullCase) {
  const mount = shellRoot.querySelector("#docket-photos-root");
  if (!(mount instanceof HTMLElement)) return;
  const caseId = String(fullCase.id ?? "");
  const casePhotoRef =
    typeof fullCase.photo_ref === "string" ? fullCase.photo_ref : null;
  let checklistRow = null;
  try {
    const res = await fetch(DOCKET_PHOTO_CHECKLIST_PATH, { credentials: "omit" });
    if (res.ok) {
      const raw = await res.json();
      const validated = validateDocketPhotoLicenseChecklist(raw);
      if (validated.ok) {
        checklistRow = docketPhotoChecklistRowForCase(validated.doc, caseId);
      }
    }
  } catch {
    checklistRow = null;
  }
  mount.innerHTML = renderDocketPhotoStewardHtml(
    checklistRow,
    caseId,
    casePhotoRef
  );

  let pack = null;
  try {
    const packRes = await fetch(DOCKET_PHOTO_LICENSE_PACKS_PATH, {
      credentials: "omit",
    });
    if (packRes.ok) {
      const packRaw = await packRes.json();
      const packValidated = validateDocketPhotoLicensePacks(packRaw);
      if (packValidated.ok) {
        pack = docketPhotoLicensePackForSubject(packValidated.doc, caseId);
      }
    }
  } catch {
    pack = null;
  }
  const packSlot = mount.querySelector("#docket-photo-license-pack-slot");
  if (packSlot instanceof HTMLElement) {
    packSlot.innerHTML = renderDocketPhotoLicensePackStewardHtml(pack, caseId);
  }
}

/**
 * Session-local QR upgrade preview (QR-v0). Does not rewrite published case JSON.
 * @param {HTMLElement} shellRoot
 * @param {Record<string, unknown>} fullCase
 */
export function mountDocketQrUpgradePanel(shellRoot, fullCase) {
  const mount = shellRoot.querySelector("#docket-qr-upgrade-root");
  if (!(mount instanceof HTMLElement)) return;

  const caseId = String(fullCase.id ?? "");
  const published =
    fullCase.live_object && typeof fullCase.live_object === "object"
      ? /** @type {Record<string, unknown>} */ (fullCase.live_object)
      : {};
  let preview = readDocketQrUpgradePreviewFromStorage(sessionStorage, caseId);

  /**
   * @param {string} message
   * @param {boolean} [isError]
   */
  function setStatus(message, isError = false) {
    const statusEl = mount.querySelector("#docket-qr-status");
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.hidden = false;
    statusEl.textContent = message;
    statusEl.dataset.error = isError ? "1" : "0";
  }

  function render() {
    const checklist = renderDocketQrUpgradeHtml(published, caseId);
    const active = preview ?? null;
    const previewBlock = active
      ? `<pre class="docket-qr-upgrade-preview form-hint">${escapeText(
          JSON.stringify(active, null, 2)
        )}</pre>
  <button type="button" class="btn-secondary" id="docket-qr-clear">Clear session preview</button>`
      : `<p class="form-hint">No session preview yet — enter profile + QR ids from issue-qr.</p>`;

    mount.innerHTML = `${checklist}
<details class="docket-qr-upgrade-form" open>
  <summary>Preview child-object scan path</summary>
  <form class="compact-form" id="docket-qr-upgrade-form">
    <label class="form-label" for="docket-qr-profile">Profile id</label>
    <input class="form-input" id="docket-qr-profile" name="profile_id" required maxlength="64" placeholder="${escapeAttr(DOCKET_CASEFILE_FIXTURE_PROFILE_ID)}" />
    <label class="form-label" for="docket-qr-id">QR id</label>
    <input class="form-input" id="docket-qr-id" name="qr_id" required maxlength="64" placeholder="${escapeAttr(DOCKET_CASEFILE_FIXTURE_QR_ID)}" />
    <button type="submit" class="btn-secondary">Save session preview</button>
  </form>
</details>
${previewBlock}
<p class="form-hint" id="docket-qr-status" role="status" hidden></p>`;

    if (active && typeof active.scan_path === "string") {
      const parsed = parseChildQrScanPath(active.scan_path);
      const profileEl = mount.querySelector("#docket-qr-profile");
      const qrEl = mount.querySelector("#docket-qr-id");
      if (parsed && profileEl instanceof HTMLInputElement) profileEl.value = parsed.profileId;
      if (parsed && qrEl instanceof HTMLInputElement) qrEl.value = parsed.qrId;
    }

    const form = mount.querySelector("#docket-qr-upgrade-form");
    if (form instanceof HTMLFormElement) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(form);
        try {
          const upgraded = upgradePublicDocketCaseLiveObjectToChildQr(caseId, {
            profileId: String(fd.get("profile_id") ?? ""),
            qrId: String(fd.get("qr_id") ?? ""),
          });
          writeDocketQrUpgradePreviewToStorage(sessionStorage, caseId, upgraded);
          preview = upgraded;
          render();
          setStatus("Session preview saved. Published case JSON unchanged.");
        } catch (err) {
          setStatus(err instanceof Error ? err.message : String(err), true);
        }
      });
    }

    const clearBtn = mount.querySelector("#docket-qr-clear");
    if (clearBtn instanceof HTMLButtonElement) {
      clearBtn.addEventListener("click", () => {
        writeDocketQrUpgradePreviewToStorage(sessionStorage, caseId, null);
        preview = null;
        render();
        setStatus("Session preview cleared.");
      });
    }
  }

  render();
}

/**
 * Session-local C-v3 discovery opt-in preview. Does not rewrite published case JSON.
 * Starter-four stay discovery_opt_in: false in published data.
 * @param {HTMLElement} shellRoot
 * @param {Record<string, unknown>} fullCase
 */
export function mountDocketDiscoveryOptInPanel(shellRoot, fullCase) {
  const mount = shellRoot.querySelector("#docket-discovery-opt-in-root");
  if (!(mount instanceof HTMLElement)) return;

  const caseId = String(fullCase.id ?? "");
  const stewards = Array.isArray(fullCase.stewards) ? fullCase.stewards : [];
  const published =
    fullCase.live_object && typeof fullCase.live_object === "object"
      ? /** @type {Record<string, unknown>} */ (fullCase.live_object)
      : {};
  let preview = readDocketDiscoveryOptInPreview(sessionStorage, caseId);

  /**
   * @param {string} message
   * @param {boolean} [isError]
   */
  function setStatus(message, isError = false) {
    const statusEl = mount.querySelector("#docket-cv3-status");
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.hidden = false;
    statusEl.textContent = message;
    statusEl.dataset.error = isError ? "1" : "0";
  }

  function render() {
    const checklist = renderDocketDiscoveryOptInHtml(published, caseId);
    const active = preview ?? null;
    const stewardChecks = stewards
      .map((row) => {
        const s = /** @type {Record<string, unknown>} */ (row);
        const id = String(s.id ?? "");
        const label = String(s.display_name ?? id);
        return `<label class="docket-cv3-approval"><input type="checkbox" name="approval" value="${escapeAttr(id)}" /> ${escapeText(label)} (<code>${escapeText(id)}</code>)</label>`;
      })
      .join("");

    const previewBlock = active
      ? `<pre class="docket-discovery-opt-in-preview form-hint">${escapeText(
          JSON.stringify(active, null, 2)
        )}</pre>
  <button type="button" class="btn-secondary" id="docket-cv3-clear">Clear session preview</button>`
      : `<p class="form-hint">No session preview yet — child QR + two steward approvals + listed reason.</p>`;

    mount.innerHTML = `${checklist}
<details class="docket-discovery-opt-in-form" open>
  <summary>Preview discovery_opt_in: true</summary>
  <form class="compact-form" id="docket-cv3-form">
    <label class="form-label" for="docket-cv3-profile">Profile id</label>
    <input class="form-input" id="docket-cv3-profile" name="profile_id" required maxlength="64" placeholder="${escapeAttr(DOCKET_CASEFILE_FIXTURE_PROFILE_ID)}" />
    <label class="form-label" for="docket-cv3-qr">QR id</label>
    <input class="form-input" id="docket-cv3-qr" name="qr_id" required maxlength="64" placeholder="${escapeAttr(DOCKET_CASEFILE_FIXTURE_QR_ID)}" />
    <label class="form-label" for="docket-cv3-reason">Listed reason</label>
    <input class="form-input" id="docket-cv3-reason" name="listed_reason" required maxlength="240" placeholder="Chapter teach-in pin at library board" />
    <label class="form-label" for="docket-cv3-region">Region id (optional)</label>
    <input class="form-input" id="docket-cv3-region" name="region_id" maxlength="80" placeholder="cedar-rapids-iowa" />
    <p class="form-label">Approvals (≥2 stewards)</p>
    <div class="docket-cv3-approvals">${stewardChecks || `<p class="form-hint">No stewards on this case.</p>`}</div>
    <button type="submit" class="btn-secondary">Save session preview</button>
  </form>
</details>
${previewBlock}
<p class="form-hint" id="docket-cv3-status" role="status" hidden></p>`;

    if (active) {
      const parsed =
        typeof active.scan_path === "string"
          ? parseChildQrScanPath(active.scan_path)
          : null;
      const profileEl = mount.querySelector("#docket-cv3-profile");
      const qrEl = mount.querySelector("#docket-cv3-qr");
      const reasonEl = mount.querySelector("#docket-cv3-reason");
      const regionEl = mount.querySelector("#docket-cv3-region");
      const disc =
        active.discovery && typeof active.discovery === "object"
          ? /** @type {Record<string, unknown>} */ (active.discovery)
          : {};
      if (parsed && profileEl instanceof HTMLInputElement) profileEl.value = parsed.profileId;
      if (parsed && qrEl instanceof HTMLInputElement) qrEl.value = parsed.qrId;
      if (reasonEl instanceof HTMLInputElement) {
        reasonEl.value = String(disc.listed_reason ?? "");
      }
      if (regionEl instanceof HTMLInputElement) {
        regionEl.value = String(disc.region_id ?? "");
      }
      const approved = new Set(normalizeDocketEditApprovals(disc.approvals));
      for (const input of mount.querySelectorAll('input[name="approval"]')) {
        if (input instanceof HTMLInputElement && approved.has(input.value)) {
          input.checked = true;
        }
      }
    }

    const form = mount.querySelector("#docket-cv3-form");
    if (form instanceof HTMLFormElement) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const fd = new FormData(form);
        const approvals = fd
          .getAll("approval")
          .map((v) => String(v))
          .filter(Boolean);
        try {
          const built = buildDocketDiscoveryOptInLiveObject({
            caseId,
            profileId: String(fd.get("profile_id") ?? ""),
            qrId: String(fd.get("qr_id") ?? ""),
            listedReason: String(fd.get("listed_reason") ?? ""),
            approvals,
            regionId: String(fd.get("region_id") ?? "").trim() || null,
          });
          const errors = [];
          validateDocketDiscoveryOptInFields(built, stewards, errors, {
            requireStewardMembership: true,
          });
          if (errors.length) throw new Error(errors.join("; "));
          writeDocketDiscoveryOptInPreview(sessionStorage, caseId, built);
          preview = built;
          render();
          setStatus(
            "Session preview saved. Published starter-four JSON stays discovery_opt_in: false."
          );
        } catch (err) {
          setStatus(err instanceof Error ? err.message : String(err), true);
        }
      });
    }

    const clearBtn = mount.querySelector("#docket-cv3-clear");
    if (clearBtn instanceof HTMLButtonElement) {
      clearBtn.addEventListener("click", () => {
        writeDocketDiscoveryOptInPreview(sessionStorage, caseId, null);
        preview = null;
        render();
        setStatus("Session preview cleared.");
      });
    }
  }

  render();
}

/**
 * @param {string} scanPath
 * @returns {{ profileId: string; qrId: string } | null}
 */
function parseChildQrScanPath(scanPath) {
  const scan = String(scanPath ?? "").trim();
  if (!scan.startsWith("/c/")) return null;
  const q = scan.indexOf("?q=");
  if (q < 0) return null;
  const profileId = decodeURIComponent(scan.slice(3, q).trim());
  const qrId = decodeURIComponent(scan.slice(q + 3).trim());
  if (!profileId || !qrId) return null;
  return { profileId, qrId };
}

/**
 * @param {HTMLElement} shellRoot
 * @param {Record<string, unknown>} fullCase
 */
export function mountDocketEditProposalsPanel(shellRoot, fullCase) {
  const mount = shellRoot.querySelector("#docket-edit-proposals-root");
  if (!(mount instanceof HTMLElement)) return;

  const caseId = String(fullCase.id ?? "");
  const stewards = Array.isArray(fullCase.stewards) ? fullCase.stewards : [];
  const fixtureProposals = Array.isArray(fullCase.edit_proposals)
    ? fullCase.edit_proposals
    : [];
  let proposals = readDocketEditProposalsFromStorage(
    sessionStorage,
    caseId,
    fixtureProposals
  );
  /** @type {string[]} */
  let appliedLog = [];
  /** @type {string} */
  let storeHint = "Loading Worker store…";

  function persistLocal() {
    writeDocketEditProposalsToStorage(sessionStorage, caseId, proposals);
  }

  /**
   * @param {boolean} [quiet]
   */
  async function persistWorker(quiet = false) {
    try {
      await putDocketEditProposalsToStore(
        resolverApiOrigin(),
        caseId,
        proposals
      );
      storeHint = "Synced to Worker store (DG-store-v0).";
      if (!quiet) return storeHint;
    } catch (err) {
      storeHint = `Worker store sync failed — session cache kept. ${
        err instanceof Error ? err.message : String(err)
      }`;
      if (!quiet) throw err;
    }
    return storeHint;
  }

  function persist() {
    persistLocal();
    void persistWorker(true).then(() => {
      const hint = mount.querySelector("#docket-dg-store-hint");
      if (hint instanceof HTMLElement) hint.textContent = storeHint;
    });
  }

  void (async () => {
    try {
      const remote = await fetchDocketEditProposalsFromStore(
        resolverApiOrigin(),
        caseId
      );
      if (!remote.empty && remote.proposals.length) {
        proposals = remote.proposals;
        persistLocal();
        storeHint = `Loaded ${remote.proposals.length} proposal(s) from Worker store.`;
      } else {
        storeHint =
          "Worker store empty — using session/fixture; save will PUT to Worker.";
        if (proposals.length) {
          await persistWorker(true);
        }
      }
    } catch (err) {
      storeHint = `Worker store unavailable — session-only. ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
    render();
  })();

  function render() {
    const stewardOptions = stewards
      .map((row) => {
        const s = /** @type {Record<string, unknown>} */ (row);
        const id = String(s.id ?? "");
        const label = String(s.display_name ?? id);
        return `<option value="${escapeAttr(id)}">${escapeText(label)} (${escapeText(id)})</option>`;
      })
      .join("");

    const rows = proposals
      .map((raw, index) => {
        const p = /** @type {Record<string, unknown>} */ (raw);
        const id = String(p.id ?? `prop-${index}`);
        const status = String(p.status ?? "pending");
        const approvals = normalizeDocketEditApprovals(p.approvals);
        const signatures = normalizeDocketEditSignatures(p.signatures);
        const gateMet =
          docketEditProposalMeetsDualGate(approvals) &&
          docketEditSignaturesMeetDualGate(signatures);
        const canApprove = status === "pending" || status === "approved";
        const canApply = status === "approved" || (status === "pending" && gateMet);
        const sigLabel = signatures.map((s) => String(s.steward_id)).join(", ") || "(none)";
        return `<li class="docket-edit-proposal" data-proposal-id="${escapeAttr(id)}" data-status="${escapeAttr(status)}">
  <p class="docket-edit-proposal-head">
    <span class="docket-status">${escapeText(status)}</span>
    <strong>${escapeText(String(p.summary ?? ""))}</strong>
  </p>
  <p class="form-hint"><code>${escapeText(String(p.field_path ?? ""))}</code> · approvals ${approvals.length}/${DOCKET_EDIT_DUAL_GATE_THRESHOLD}: ${escapeText(approvals.join(", ") || "(none)")}</p>
  <p class="form-hint">DG-v1 signatures ${signatures.length}/${DOCKET_EDIT_DUAL_GATE_THRESHOLD}: ${escapeText(sigLabel)}</p>
  <p class="form-hint"><span class="docket-edit-before">Before:</span> ${escapeText(String(p.before ?? ""))}</p>
  <p class="form-hint"><span class="docket-edit-after">After:</span> ${escapeText(String(p.after ?? ""))}</p>
  <div class="docket-edit-proposal-actions">
    ${canApprove ? `<button type="button" class="btn-secondary" data-dg-approve="${escapeAttr(id)}">Sign + approve (fixture key)</button>` : ""}
    ${canApply && status !== "applied" ? `<button type="button" class="btn-secondary" data-dg-apply="${escapeAttr(id)}">Apply (signed dual-gate)</button>` : ""}
  </div>
</li>`;
      })
      .join("");

    const fieldOptions = DOCKET_EDIT_PROPOSAL_FIELD_PATHS.map(
      (path) => `<option value="${escapeAttr(path)}">${escapeText(path)}</option>`
    ).join("");

    const logHtml = appliedLog.length
      ? `<ul class="docket-wanted-counts">${appliedLog
          .map((line) => `<li>${escapeText(line)}</li>`)
          .join("")}</ul>`
      : `<p class="form-hint">No local applies yet this session.</p>`;

    const appliedCount = proposals.filter(
      (row) =>
        String(/** @type {Record<string, unknown>} */ (row).status ?? "") ===
        "applied"
    ).length;
    const mergeHtml = appliedCount
      ? `<div class="docket-merge-pack">
  <p class="form-hint">Human-gated merge: ${appliedCount} applied proposal(s) ready for pack export. Does not rewrite published JSON.</p>
  <button type="button" class="btn-secondary" id="docket-dg-merge-download">Download merge pack (JSON)</button>
</div>`
      : `<p class="form-hint">Apply a dual-signed proposal to unlock a human-gated merge pack download.</p>`;

    mount.innerHTML = `
<p class="form-hint">Dual-gate <strong>DG-v1</strong> + <strong>DG-store-v0</strong>: two stewards must sign with fixture Ed25519 keys. Proposals sync to Worker D1 — still does not rewrite public case JSON.</p>
<p class="form-hint" id="docket-dg-store-hint">${escapeText(storeHint)}</p>
<label class="form-label" for="docket-dg-actor">Acting as steward</label>
<select class="form-input" id="docket-dg-actor">${stewardOptions}</select>
${
  rows
    ? `<ul class="docket-edit-proposal-list">${rows}</ul>`
    : `<p class="form-hint">No proposals yet — create one below.</p>`
}
<details class="docket-edit-propose">
  <summary>Propose a new edit (signed first gate)</summary>
  <form class="compact-form" id="docket-dg-propose-form">
    <label class="form-label" for="docket-dg-field">Field</label>
    <select class="form-input" id="docket-dg-field" name="field_path" required>${fieldOptions}</select>
    <label class="form-label" for="docket-dg-summary">Summary</label>
    <input class="form-input" id="docket-dg-summary" name="summary" maxlength="200" required placeholder="Clarify count wording" />
    <label class="form-label" for="docket-dg-before">Before</label>
    <input class="form-input" id="docket-dg-before" name="before" maxlength="500" placeholder="Current text (optional)" />
    <label class="form-label" for="docket-dg-after">After</label>
    <input class="form-input" id="docket-dg-after" name="after" maxlength="500" required placeholder="Proposed text" />
    <button type="submit" class="btn-secondary">Propose + sign (first gate)</button>
  </form>
</details>
<p class="form-hint"><button type="button" class="btn-secondary" id="docket-dg-store-sync">Sync to Worker store now</button></p>
<h3 class="docket-case-section-title" id="merge-pack">Human-gated merge pack</h3>
${mergeHtml}
<h3 class="docket-case-section-title">Session apply log</h3>
${logHtml}
<p class="form-hint" id="docket-dg-status" role="status" hidden></p>`;

    const actorEl = mount.querySelector("#docket-dg-actor");
    const statusEl = mount.querySelector("#docket-dg-status");

    /**
     * @param {string} message
     * @param {boolean} [isError]
     */
    function setStatus(message, isError = false) {
      if (!(statusEl instanceof HTMLElement)) return;
      statusEl.hidden = false;
      statusEl.textContent = message;
      statusEl.dataset.error = isError ? "1" : "0";
    }

    function selectedActor() {
      return actorEl instanceof HTMLSelectElement ? actorEl.value : "";
    }

    const syncBtn = mount.querySelector("#docket-dg-store-sync");
    if (syncBtn instanceof HTMLButtonElement) {
      syncBtn.addEventListener("click", () => {
        void (async () => {
          try {
            persistLocal();
            const msg = await persistWorker(false);
            setStatus(msg);
            const hint = mount.querySelector("#docket-dg-store-hint");
            if (hint instanceof HTMLElement) hint.textContent = storeHint;
          } catch (err) {
            setStatus(err instanceof Error ? err.message : String(err), true);
          }
        })();
      });
    }

    const mergeBtn = mount.querySelector("#docket-dg-merge-download");
    if (mergeBtn instanceof HTMLButtonElement) {
      mergeBtn.addEventListener("click", () => {
        try {
          const pack = buildDocketMergePack({
            caseId,
            fullCase,
            proposals,
          });
          const check = validateDocketMergePack(pack);
          if (!check.ok) {
            throw new Error(check.errors.join("; "));
          }
          const blob = new Blob([JSON.stringify(pack, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = docketMergePackFilename(caseId, pack.generated_at);
          a.click();
          URL.revokeObjectURL(url);
          setStatus(
            "Merge pack downloaded. Review offline, then hand-edit case JSON — no auto-merge."
          );
        } catch (err) {
          setStatus(err instanceof Error ? err.message : String(err), true);
        }
      });
    }

    for (const btn of mount.querySelectorAll("[data-dg-approve]")) {
      btn.addEventListener("click", () => {
        void (async () => {
          const proposalId = btn.getAttribute("data-dg-approve");
          const idx = proposals.findIndex(
            (row) => String(/** @type {Record<string, unknown>} */ (row).id) === proposalId
          );
          if (idx < 0) return;
          try {
            proposals[idx] = await approveDocketEditProposalSigned(
              /** @type {Record<string, unknown>} */ (proposals[idx]),
              caseId,
              selectedActor(),
              stewards
            );
            persist();
            render();
            setStatus("DG-v1 signature + approval recorded (fixture key).");
          } catch (err) {
            setStatus(err instanceof Error ? err.message : String(err), true);
          }
        })();
      });
    }

    for (const btn of mount.querySelectorAll("[data-dg-apply]")) {
      btn.addEventListener("click", () => {
        void (async () => {
          const proposalId = btn.getAttribute("data-dg-apply");
          const idx = proposals.findIndex(
            (row) => String(/** @type {Record<string, unknown>} */ (row).id) === proposalId
          );
          if (idx < 0) return;
          try {
            const result = await applyDocketEditProposalSigned(
              /** @type {Record<string, unknown>} */ (proposals[idx]),
              caseId
            );
            proposals[idx] = result.proposal;
            appliedLog = [
              `${result.changelogEntry.dated} — ${result.changelogEntry.summary}`,
              ...appliedLog,
            ].slice(0, 8);
            persist();
            render();
            setStatus(
              "DG-v1 signed dual-gate apply recorded (public case JSON unchanged; Worker store syncing)."
            );
          } catch (err) {
            setStatus(err instanceof Error ? err.message : String(err), true);
          }
        })();
      });
    }

    const form = mount.querySelector("#docket-dg-propose-form");
    if (form instanceof HTMLFormElement) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        void (async () => {
          const fd = new FormData(form);
          try {
            const created = await createDocketEditProposalSigned(
              {
                id: `prop_local_${Date.now()}`,
                field_path: String(fd.get("field_path") ?? ""),
                summary: String(fd.get("summary") ?? ""),
                before: String(fd.get("before") ?? ""),
                after: String(fd.get("after") ?? ""),
                proposed_by: selectedActor(),
              },
              caseId,
              stewards
            );
            proposals = [created, ...proposals];
            persist();
            render();
            setStatus("Proposal created with proposer’s DG-v1 fixture signature.");
          } catch (err) {
            setStatus(err instanceof Error ? err.message : String(err), true);
          }
        })();
      });
    }
  }

  render();
}

/**
 * @param {string} value
 */
function escapeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string} value
 */
function escapeAttr(value) {
  return escapeText(value).replace(/'/g, "&#39;");
}

async function boot() {
  const rootEl = document.getElementById("docket-steward-root");
  const statusEl = document.getElementById("docket-steward-status");
  if (!rootEl) return;
  const caseId =
    rootEl.getAttribute("data-docket-case-id") ||
    docketCaseIdFromPath(location.pathname);
  if (!caseId) {
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = "Unknown case.";
    }
    return;
  }
  try {
    const c = await hydrateDocketStewardPage(rootEl, caseId);
    if (statusEl) statusEl.hidden = true;
    const name = String(c.display_name ?? caseId);
    document.title = `${name} · Steward · Public Docket`;
  } catch (err) {
    console.error(err);
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent =
        "Could not load this steward shell. Return to the case, or try again later.";
    }
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void boot();
    });
  } else {
    void boot();
  }
}
