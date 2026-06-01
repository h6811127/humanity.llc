import { resolverErrorMessage } from "./resolver-user-error-core.mjs";

const TOKEN_KEY = "hc_operator_audit_token";
const HIDE_REVIEWED_KEY = "hc_operator_audit_hide_reviewed";
const ENDPOINT = `${location.origin}/.well-known/hc/v1/operator/vouch-audit-flags`;
const DISMISS_ENDPOINT = `${ENDPOINT}/dismiss`;
const CASES_ENDPOINT = `${location.origin}/.well-known/hc/v1/operator/vouch-cases`;

const SUSPENSION_CAUSE_CATEGORIES = [
  "impersonation",
  "vouch_abuse",
  "harassment",
  "illegal_content",
  "security_compromise",
  "other",
];

const DEFAULT_SUSPEND_NOTICE = "Suspended under public rules pending appeal.";

const tokenEl = document.getElementById("audit-token");
const refreshBtn = document.getElementById("audit-refresh");
const caseRefreshBtn = document.getElementById("case-refresh");
const toggleBtn = document.getElementById("audit-toggle-reviewed");
const statusEl = document.getElementById("audit-status");
const caseStatusEl = document.getElementById("case-status");
const flagsEl = document.getElementById("audit-flags");
const casesEl = document.getElementById("audit-cases");

let hideReviewed = false;
let currentFlags = [];
let currentCases = [];
/** @type {string | null} */
let selectedCaseId = null;

function loadLocal(key, fallback) {
  try {
    const v = sessionStorage.getItem(key);
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

function saveLocal(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function token() {
  return (tokenEl?.value || "").trim();
}

function setStatus(text, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.dataset.tone = isError ? "error" : "neutral";
}

function setCaseStatus(text, isError = false) {
  if (!caseStatusEl) return;
  caseStatusEl.textContent = text;
  caseStatusEl.dataset.tone = isError ? "error" : "neutral";
}

function setHideReviewed(next) {
  hideReviewed = !!next;
  saveLocal(HIDE_REVIEWED_KEY, hideReviewed ? "1" : "0");
  if (toggleBtn) toggleBtn.textContent = hideReviewed ? "Show reviewed" : "Hide reviewed";
  renderFlags();
}

function displayProfiles(flag) {
  if (flag.kind === "closed_loop_only") {
    return [flag.voucher_profile_id, ...(flag.related_profile_ids || [])].join(", ");
  }
  if (flag.kind === "burst_at_quota_boundary") {
    return flag.voucher_profile_id;
  }
  if (flag.kind === "steward_issuance_burst") {
    return flag.voucher_profile_id;
  }
  if (flag.kind === "shared_voucher_set") {
    return [
      ...(flag.vouchee_profile_ids || []),
      ...(flag.shared_voucher_profile_ids || []),
    ].join(", ");
  }
  if (flag.kind === "directed_cycle_cluster") {
    return (flag.profile_ids || []).join(", ");
  }
  return "Unknown";
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatFlagKind(kind) {
  return String(kind || "unknown").replaceAll("_", " ");
}

async function postDismiss(flag, note, dismissedBy) {
  const res = await fetch(DISMISS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify({
      flag_key: flag.flag_key,
      flag_kind: flag.kind,
      note,
      dismissed_by: dismissedBy || undefined,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      resolverErrorMessage(body, {
        status: res.status,
        requestUrl: DISMISS_ENDPOINT,
        fallback: "Dismiss failed.",
      })
    );
  }
}

async function clearDismiss(flag) {
  const res = await fetch(DISMISS_ENDPOINT, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify({ flag_key: flag.flag_key }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      resolverErrorMessage(body, {
        status: res.status,
        requestUrl: DISMISS_ENDPOINT,
        fallback: "Clear failed.",
      })
    );
  }
}

async function postCaseFromFlag(flag) {
  const res = await fetch(CASES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify({
      source: "audit_flag",
      flag_key: flag.flag_key,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      resolverErrorMessage(body, {
        status: res.status,
        requestUrl: CASES_ENDPOINT,
        fallback: "Case creation failed.",
      })
    );
  }
  return body;
}

async function postCaseSuspend(caseId, payload) {
  const res = await fetch(`${CASES_ENDPOINT}/${encodeURIComponent(caseId)}/suspend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      resolverErrorMessage(body, {
        status: res.status,
        requestUrl: `${CASES_ENDPOINT}/${caseId}/suspend`,
        fallback: "Suspension failed.",
      })
    );
  }
  return body;
}

function formatCaseStatus(status) {
  return String(status || "unknown").replaceAll("_", " ");
}

function defaultAppealDeadlineIso() {
  const deadline = new Date();
  deadline.setUTCDate(deadline.getUTCDate() + 30);
  deadline.setUTCHours(0, 0, 0, 0);
  return deadline.toISOString();
}

function appealDeadlineInputValue(iso = defaultAppealDeadlineIso()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function appealDeadlineFromInput(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

function renderCaseSuspendForm(item) {
  if (item.status === "suspended") {
    return `<p class="form-hint operator-audit-case-suspended-note">This case is already suspended. Scan pages show the public suspension notice.</p>`;
  }
  const profiles = item.subject_profile_ids || [];
  if (profiles.length === 0) {
    return `<p class="form-hint">No subject profiles on this case — suspension is unavailable.</p>`;
  }
  const profileOptions = profiles
    .map(
      (profileId) =>
        `<option value="${escapeHtml(profileId)}">${escapeHtml(profileId)}</option>`
    )
    .join("");
  const causeOptions = SUSPENSION_CAUSE_CATEGORIES.map(
    (category) =>
      `<option value="${escapeHtml(category)}">${escapeHtml(category.replaceAll("_", " "))}</option>`
  ).join("");
  const caseKey = escapeHtml(item.case_id);
  return `
    <div class="operator-audit-case-detail">
      <h3 class="operator-audit-case-detail-title">Suspend subject profile</h3>
      <p class="form-hint">Governance suspension — public notice on scan/status. Requires cause, notice, and appeal deadline.</p>
      <label class="field-label" for="case-profile-${caseKey}">Profile</label>
      <select class="input case-suspend-profile" id="case-profile-${caseKey}">
        ${profileOptions}
      </select>
      <label class="field-label" for="case-cause-${caseKey}">Cause category</label>
      <select class="input case-suspend-cause" id="case-cause-${caseKey}">
        ${causeOptions}
      </select>
      <label class="field-label" for="case-notice-${caseKey}">Public notice</label>
      <textarea class="input case-suspend-notice" id="case-notice-${caseKey}" rows="3" maxlength="500">${escapeHtml(DEFAULT_SUSPEND_NOTICE)}</textarea>
      <label class="field-label" for="case-appeal-${caseKey}">Appeal deadline (UTC)</label>
      <input class="input case-suspend-appeal" id="case-appeal-${caseKey}" type="datetime-local" value="${escapeHtml(appealDeadlineInputValue())}" />
      <label class="field-label" for="case-by-${caseKey}">Suspended by (optional)</label>
      <input class="input case-suspend-by" id="case-by-${caseKey}" type="text" maxlength="120" placeholder="Your handle or initials" />
      <div class="operator-audit-flag-buttons">
        <button type="button" class="btn-danger case-suspend-submit">Suspend profile</button>
      </div>
    </div>`;
}

function renderCases() {
  if (!casesEl) return;
  if (currentCases.length === 0) {
    casesEl.innerHTML = `<li class="operator-audit-empty">No cases yet.</li>`;
    return;
  }

  casesEl.innerHTML = currentCases
    .map((item) => {
      const profiles = (item.subject_profile_ids || []).join(", ") || "none";
      const threats = (item.threat_ids || []).join(", ") || "none";
      const updated = item.updated_at ? new Date(item.updated_at).toLocaleString() : "";
      const isOpen = selectedCaseId === item.case_id;
      return `
      <li class="operator-audit-flag" data-case-id="${escapeHtml(item.case_id)}">
        <article class="operator-audit-flag-card operator-audit-case-card${isOpen ? " operator-audit-case-card--open" : ""}">
          <header class="operator-audit-flag-head">
            <p class="operator-audit-flag-kind">${escapeHtml(formatFlagKind(item.kind))}</p>
            <p class="operator-audit-flag-priority">${escapeHtml(String(item.priority || "p1"))} · ${escapeHtml(formatCaseStatus(item.status))}</p>
          </header>
          <dl class="operator-audit-flag-meta">
            <div>
              <dt>Case</dt>
              <dd class="mono">${escapeHtml(item.case_id)}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>${escapeHtml(formatFlagKind(item.source))}</dd>
            </div>
            <div>
              <dt>Profiles</dt>
              <dd class="mono">${escapeHtml(profiles)}</dd>
            </div>
            <div>
              <dt>Threat IDs</dt>
              <dd>${escapeHtml(threats)}</dd>
            </div>
            <div class="operator-audit-flag-action">
              <dt>Summary</dt>
              <dd>${escapeHtml(item.summary || "Manual review case.")}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>${escapeHtml(updated || "unknown")}</dd>
            </div>
          </dl>
          <div class="operator-audit-flag-buttons">
            <button type="button" class="btn-secondary audit-case-toggle">${isOpen ? "Hide detail" : "Open detail"}</button>
          </div>
          ${isOpen ? renderCaseSuspendForm(item) : ""}
        </article>
      </li>`;
    })
    .join("");

  casesEl.querySelectorAll(".audit-case-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest("[data-case-id]");
      if (!item) return;
      const caseId = item.getAttribute("data-case-id");
      selectedCaseId = selectedCaseId === caseId ? null : caseId;
      renderCases();
    });
  });

  casesEl.querySelectorAll(".case-suspend-submit").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = btn.closest("[data-case-id]");
      if (!item) return;
      const caseId = item.getAttribute("data-case-id");
      const caseItem = currentCases.find((entry) => entry.case_id === caseId);
      if (!caseId || !caseItem) return;

      const profileId = item.querySelector(".case-suspend-profile")?.value?.trim() || "";
      const causeCategory = item.querySelector(".case-suspend-cause")?.value?.trim() || "";
      const notice = item.querySelector(".case-suspend-notice")?.value?.trim() || "";
      const appealDeadline = appealDeadlineFromInput(
        item.querySelector(".case-suspend-appeal")?.value
      );
      const suspendedBy = item.querySelector(".case-suspend-by")?.value?.trim() || "";

      if (!profileId || !causeCategory || !notice || !appealDeadline) {
        setCaseStatus("Profile, cause, notice, and appeal deadline are required.", true);
        return;
      }

      btn.disabled = true;
      try {
        const body = await postCaseSuspend(caseId, {
          profile_id: profileId,
          cause_category: causeCategory,
          notice,
          appeal_deadline: appealDeadline,
          suspended_by: suspendedBy || undefined,
        });
        const suspension = body.suspension;
        const label =
          suspension?.profile_id && suspension?.public_label
            ? `${suspension.profile_id} · ${suspension.public_label}`
            : profileId;
        setCaseStatus(`Suspended ${label}.`);
        selectedCaseId = caseId;
        await refreshCases();
      } catch (err) {
        setCaseStatus(err instanceof Error ? err.message : "Suspension failed.", true);
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function renderFlags() {
  if (!flagsEl) return;
  const visible = hideReviewed
    ? currentFlags.filter((f) => !f.dismissal)
    : currentFlags;

  if (visible.length === 0) {
    flagsEl.innerHTML = `<li class="operator-audit-empty">No flags to review.</li>`;
    return;
  }

  flagsEl.innerHTML = visible
    .map((flag) => {
      const dismissal = flag.dismissal;
      const note = dismissal?.note || "";
      const reviewedBy = dismissal?.dismissed_by
        ? `Reviewed by ${escapeHtml(dismissal.dismissed_by)}`
        : "";
      const reviewedAt = dismissal?.dismissed_at
        ? new Date(dismissal.dismissed_at).toLocaleString()
        : "";
      const priority = flag.triage?.priority || "unknown";
      const threats = (flag.triage?.threat_ids || []).join(", ") || "none";
      return `
      <li class="operator-audit-flag" data-flag-key="${escapeHtml(flag.flag_key)}">
        <article class="operator-audit-flag-card${dismissal ? " operator-audit-flag-card--reviewed" : ""}">
          <header class="operator-audit-flag-head">
            <p class="operator-audit-flag-kind">${escapeHtml(formatFlagKind(flag.kind))}</p>
            <p class="operator-audit-flag-priority">${escapeHtml(String(priority))} priority</p>
          </header>
          <dl class="operator-audit-flag-meta">
            <div>
              <dt>Profiles</dt>
              <dd class="mono">${escapeHtml(displayProfiles(flag))}</dd>
            </div>
            <div>
              <dt>Threat IDs</dt>
              <dd>${escapeHtml(threats)}</dd>
            </div>
            <div class="operator-audit-flag-action">
              <dt>Suggested action</dt>
              <dd>${escapeHtml(flag.triage?.action || "Review manually.")}</dd>
            </div>
            ${
              dismissal
                ? `<div class="operator-audit-flag-reviewed">
              <dt>Review record</dt>
              <dd>${escapeHtml(reviewedBy)}${reviewedAt ? ` · ${escapeHtml(reviewedAt)}` : ""}</dd>
            </div>`
                : ""
            }
          </dl>
          <div class="operator-audit-flag-form">
            <label class="field-label" for="audit-note-${escapeHtml(flag.flag_key)}">Dismissal note</label>
            <input
              class="input audit-note"
              id="audit-note-${escapeHtml(flag.flag_key)}"
              type="text"
              maxlength="500"
              placeholder="Why this flag is benign or resolved"
              value="${escapeHtml(note)}"
            />
            <label class="field-label" for="audit-by-${escapeHtml(flag.flag_key)}">Reviewed by (optional)</label>
            <input
              class="input audit-by"
              id="audit-by-${escapeHtml(flag.flag_key)}"
              type="text"
              maxlength="120"
              placeholder="Your handle or initials"
            />
            <div class="operator-audit-flag-buttons">
              <button type="button" class="btn-secondary audit-create-case">Create / open case</button>
              <button type="button" class="btn-secondary audit-dismiss">Save dismissal</button>
              <button type="button" class="btn-danger audit-clear" ${dismissal ? "" : "disabled"}>Clear</button>
            </div>
          </div>
        </article>
      </li>`;
    })
    .join("");

  flagsEl.querySelectorAll(".audit-dismiss").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = btn.closest("[data-flag-key]");
      if (!item) return;
      const key = item.getAttribute("data-flag-key");
      const flag = currentFlags.find((f) => f.flag_key === key);
      if (!flag) return;
      const note = item.querySelector(".audit-note")?.value?.trim() || "";
      const dismissedBy = item.querySelector(".audit-by")?.value?.trim() || "";
      if (!note) {
        setStatus("Dismissal note is required.", true);
        return;
      }
      btn.disabled = true;
      try {
        await postDismiss(flag, note, dismissedBy);
        setStatus("Dismissal saved.");
        await refreshFlags();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Dismiss failed.", true);
      } finally {
        btn.disabled = false;
      }
    });
  });

  flagsEl.querySelectorAll(".audit-create-case").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = btn.closest("[data-flag-key]");
      if (!item) return;
      const key = item.getAttribute("data-flag-key");
      const flag = currentFlags.find((f) => f.flag_key === key);
      if (!flag) return;
      btn.disabled = true;
      try {
        const body = await postCaseFromFlag(flag);
        const createdText = body.created === false ? "Opened existing case" : "Case created";
        const caseId = body.case?.case_id ? `: ${body.case.case_id}` : ".";
        setCaseStatus(`${createdText}${caseId}`);
        await refreshCases();
      } catch (err) {
        setCaseStatus(err instanceof Error ? err.message : "Case creation failed.", true);
      } finally {
        btn.disabled = false;
      }
    });
  });

  flagsEl.querySelectorAll(".audit-clear").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = btn.closest("[data-flag-key]");
      if (!item) return;
      const key = item.getAttribute("data-flag-key");
      const flag = currentFlags.find((f) => f.flag_key === key);
      if (!flag || !flag.dismissal) return;
      btn.disabled = true;
      try {
        await clearDismiss(flag);
        setStatus("Dismissal cleared.");
        await refreshFlags();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Clear failed.", true);
      } finally {
        btn.disabled = false;
      }
    });
  });
}

async function refreshCases() {
  if (!token()) {
    setCaseStatus("Enter OPERATOR_AUDIT_TOKEN to load cases.", true);
    currentCases = [];
    renderCases();
    return;
  }
  setCaseStatus("Loading cases...");
  const res = await fetch(`${CASES_ENDPOINT}?limit=100`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      resolverErrorMessage(body, {
        status: res.status,
        requestUrl: CASES_ENDPOINT,
        fallback: "Failed to load cases.",
      })
    );
  }
  currentCases = Array.isArray(body.cases) ? body.cases : [];
  setCaseStatus(`Loaded ${currentCases.length} cases.`);
  renderCases();
}

async function refreshFlags() {
  if (!token()) {
    setStatus("Enter OPERATOR_AUDIT_TOKEN to load flags.", true);
    currentFlags = [];
    renderFlags();
    return;
  }
  setStatus("Loading…");
  const res = await fetch(ENDPOINT, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      resolverErrorMessage(body, {
        status: res.status,
        requestUrl: ENDPOINT,
        fallback: "Failed to load flags.",
      })
    );
  }
  currentFlags = Array.isArray(body.flags) ? body.flags : [];
  const reviewed = currentFlags.filter((f) => f.dismissal).length;
  setStatus(
    `Loaded ${currentFlags.length} flags (${reviewed} reviewed). Updated ${new Date(body.generated_at).toLocaleString()}.`
  );
  renderFlags();
}

async function refreshWithErrors() {
  const [flags, cases] = await Promise.allSettled([refreshFlags(), refreshCases()]);
  if (flags.status === "rejected") {
    const err = flags.reason;
    setStatus(err instanceof Error ? err.message : "Failed to load flags.", true);
  }
  if (cases.status === "rejected") {
    const err = cases.reason;
    setCaseStatus(err instanceof Error ? err.message : "Failed to load cases.", true);
  }
}

function init() {
  const savedToken = loadLocal(TOKEN_KEY, "");
  if (tokenEl && savedToken) tokenEl.value = savedToken;
  setHideReviewed(loadLocal(HIDE_REVIEWED_KEY, "1") === "1");

  tokenEl?.addEventListener("change", () => {
    saveLocal(TOKEN_KEY, token());
    refreshWithErrors();
  });
  refreshBtn?.addEventListener("click", () => refreshWithErrors());
  caseRefreshBtn?.addEventListener("click", async () => {
    try {
      await refreshCases();
    } catch (err) {
      setCaseStatus(err instanceof Error ? err.message : "Failed to load cases.", true);
    }
  });
  toggleBtn?.addEventListener("click", () => setHideReviewed(!hideReviewed));

  refreshWithErrors();
}

init();
