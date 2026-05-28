import { resolverErrorMessage } from "./resolver-user-error-core.mjs";

const TOKEN_KEY = "hc_operator_audit_token";
const HIDE_REVIEWED_KEY = "hc_operator_audit_hide_reviewed";
const ENDPOINT = `${location.origin}/.well-known/hc/v1/operator/vouch-audit-flags`;
const DISMISS_ENDPOINT = `${ENDPOINT}/dismiss`;

const tokenEl = document.getElementById("audit-token");
const refreshBtn = document.getElementById("audit-refresh");
const toggleBtn = document.getElementById("audit-toggle-reviewed");
const statusEl = document.getElementById("audit-status");
const flagsEl = document.getElementById("audit-flags");

let hideReviewed = false;
let currentFlags = [];

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
  statusEl.style.color = isError ? "var(--red)" : "";
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
  if (flag.kind === "shared_voucher_set") {
    return (flag.vouchee_profile_ids || []).join(", ");
  }
  return "Unknown";
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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

function renderFlags() {
  if (!flagsEl) return;
  const visible = hideReviewed
    ? currentFlags.filter((f) => !f.dismissal)
    : currentFlags;

  if (visible.length === 0) {
    flagsEl.innerHTML = `<li class="list-item"><span class="list-sub">No flags to review.</span></li>`;
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
        ? ` · ${new Date(dismissal.dismissed_at).toLocaleString()}`
        : "";
      return `
      <li class="list-item" data-flag-key="${escapeHtml(flag.flag_key)}">
        <div class="list-main">
          <div class="list-title">${escapeHtml(flag.kind)}</div>
          <div class="list-sub">Profiles: ${escapeHtml(displayProfiles(flag))}</div>
          <div class="list-sub">Priority: ${escapeHtml(flag.triage?.priority || "unknown")} · Threats: ${escapeHtml((flag.triage?.threat_ids || []).join(", "))}</div>
          <div class="list-sub">${escapeHtml(flag.triage?.action || "")}</div>
          ${
            dismissal
              ? `<div class="list-sub">Reviewed: ${escapeHtml(reviewedBy + reviewedAt)}</div>`
              : ""
          }
        </div>
        <div class="created-keys-actions" style="margin-top:8px">
          <input class="input audit-note" type="text" maxlength="500" placeholder="Dismissal note" value="${escapeHtml(note)}" />
          <input class="input audit-by" type="text" maxlength="120" placeholder="dismissed_by (optional)" />
          <button type="button" class="btn-secondary audit-dismiss">Save dismissal</button>
          <button type="button" class="btn-danger audit-clear" ${dismissal ? "" : "disabled"}>Clear</button>
        </div>
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
  try {
    await refreshFlags();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Failed to load flags.", true);
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
  toggleBtn?.addEventListener("click", () => setHideReviewed(!hideReviewed));

  refreshWithErrors();
}

init();
