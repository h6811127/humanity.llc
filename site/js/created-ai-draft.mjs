/**
 * L3 P2 — steward authoring assistant on /created/ (draft only; steward signs to publish).
 * @see docs/AI_L3_DRAFT_MANIFESTO.md
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import { inferPilotTemplate } from "./manifesto-display.mjs";

const DRAFT_PATH = "/.well-known/hc/v1/ai/draft-manifesto";
const VALID_PILOTS = new Set(["status_plate", "general", "lost_item_relay"]);

/**
 * @param {string | undefined | null} pilot
 * @param {Record<string, unknown> | null | undefined} session
 */
export function resolveDraftPilotTemplate(pilot, session) {
  if (pilot && VALID_PILOTS.has(pilot)) return pilot;
  if (session?.manifesto_line) {
    const inferred = inferPilotTemplate(String(session.manifesto_line));
    if (VALID_PILOTS.has(inferred)) return inferred;
  }
  return "general";
}

/**
 * @param {{
 *   getPilotTemplate: () => string;
 *   getSession: () => Record<string, unknown> | null;
 * }} ctx
 */
export function initCreatedAiDraft(ctx) {
  const root = document.getElementById("created-ai-draft-root");
  const hintEl = document.getElementById("created-ai-draft-hint");
  const btn = document.getElementById("created-ai-draft-btn");
  const panel = document.getElementById("created-ai-draft-panel");
  const previewEl = document.getElementById("created-ai-draft-preview");
  const applyBtn = document.getElementById("created-ai-draft-apply");
  const statusEl = document.getElementById("created-ai-draft-status");
  if (!root || !btn || !panel || !previewEl || !applyBtn) return;

  /** @type {Record<string, unknown> | null} */
  let lastDraft = null;

  function syncVisibility() {
    const session = ctx.getSession();
    const pilot = resolveDraftPilotTemplate(ctx.getPilotTemplate(), session);
    root.hidden = !VALID_PILOTS.has(pilot);
  }

  function formatDraftPreview(draft) {
    const lines = [];
    if (draft.object_label && draft.status_line) {
      lines.push(`${draft.object_label} — ${draft.status_line}`);
    } else if (draft.manifesto_line) {
      lines.push(String(draft.manifesto_line).replace(/\n/g, " · "));
    }
    if (Array.isArray(draft.object_streams)) {
      for (const stream of draft.object_streams) {
        if (stream?.label && stream?.value) {
          lines.push(`${stream.label}: ${stream.value}`);
        }
      }
    }
    return lines.join("\n");
  }

  function applyDraftToForm(draft) {
    const session = ctx.getSession();
    const pilot = resolveDraftPilotTemplate(ctx.getPilotTemplate(), session);
    if (pilot === "status_plate") {
      const objectEl = document.getElementById("update-object-label");
      const statusEl2 = document.getElementById("update-status-line");
      if (objectEl && draft.object_label) objectEl.value = String(draft.object_label);
      if (statusEl2 && draft.status_line) statusEl2.value = String(draft.status_line);
    } else if (pilot === "lost_item_relay") {
      const itemEl = document.getElementById("update-relay-item");
      const msgEl = document.getElementById("update-relay-message");
      if (itemEl && draft.relay_item) itemEl.value = String(draft.relay_item);
      if (msgEl && draft.relay_message) msgEl.value = String(draft.relay_message);
    } else {
      const generalEl = document.getElementById("update-manifesto-general");
      if (generalEl && draft.manifesto_line) {
        generalEl.value = String(draft.manifesto_line);
      }
    }

    const streams = Array.isArray(draft.object_streams) ? draft.object_streams : [];
    const rows = [
      ["update-stream-1-label", "update-stream-1-value"],
      ["update-stream-2-label", "update-stream-2-value"],
    ];
    rows.forEach(([labelId, valueId], index) => {
      const stream = streams[index];
      const labelEl = document.getElementById(labelId);
      const valueEl = document.getElementById(valueId);
      if (!labelEl || !valueEl) return;
      if (stream?.label && stream?.value) {
        labelEl.value = String(stream.label);
        valueEl.value = String(stream.value);
      }
    });
  }

  function formatDraftStreamsForRequest(streams) {
    if (!Array.isArray(streams)) return undefined;
    return streams.slice(0, 4).map((stream) => {
      if (!stream || typeof stream !== "object") return null;
      const row = /** @type {Record<string, unknown>} */ (stream);
      const label = typeof row.label === "string" ? row.label.trim() : "";
      const value = typeof row.value === "string" ? row.value.trim() : "";
      const streamClass = typeof row.class === "string" ? row.class : "place";
      if (!label || !value) return null;
      return { label, value, class: streamClass };
    }).filter(Boolean);
  }

  function describeDraftFailure(res, json) {
    if (typeof json.message === "string" && json.message.trim()) return json.message;
    if (typeof json.error === "string" && json.error.trim()) {
      if (json.error === "not_found") {
        return "Draft API is not available on this resolver yet. Deploy the worker or run worker:dev locally.";
      }
      return json.error;
    }
    if (res.status === 404) {
      return "Draft API not found — deploy the latest worker or use local worker:dev.";
    }
    if (res.status === 429) return "Too many draft requests. Try again in a few minutes.";
    return `Could not generate a draft (HTTP ${res.status}).`;
  }

  async function requestDraft() {
    const session = ctx.getSession();
    const pilot = resolveDraftPilotTemplate(ctx.getPilotTemplate(), session);
    const streams = formatDraftStreamsForRequest(session?.object_streams);
    const body = {
      pilot_template: pilot,
      hint: hintEl?.value?.trim() || undefined,
      current: {
        manifesto_line: session?.manifesto_line
          ? String(session.manifesto_line)
          : undefined,
        ...(streams?.length ? { object_streams: streams } : {}),
      },
    };

    const res = await fetch(`${resolverApiOrigin()}${DRAFT_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(describeDraftFailure(res, json));
    }
    return json;
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = "Drafting…";
    }
    try {
      const body = await requestDraft();
      lastDraft = body.draft || null;
      previewEl.textContent = lastDraft ? formatDraftPreview(lastDraft) : "No draft returned.";
      panel.hidden = false;
      panel.classList.add("created-ai-draft-panel--visible");
      if (statusEl) statusEl.textContent = "";
    } catch (err) {
      if (statusEl) {
        statusEl.textContent =
          err instanceof Error ? err.message : "Could not generate a draft.";
      }
    } finally {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
    }
  });

  applyBtn.addEventListener("click", () => {
    if (!lastDraft) return;
    applyDraftToForm(lastDraft);
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = "Draft applied — review fields, then submit Update to sign.";
    }
  });

  syncVisibility();
  return { syncVisibility };
}
