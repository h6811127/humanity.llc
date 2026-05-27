/**
 * L3 P2 — steward authoring assistant on /created/ (draft only; steward signs to publish).
 * @see docs/AI_L3_DRAFT_MANIFESTO.md
 */
import { resolverApiOrigin } from "./hc-sign.mjs";

const DRAFT_PATH = "/.well-known/hc/v1/ai/draft-manifesto";

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
    const pilot = ctx.getPilotTemplate();
    const show =
      pilot === "status_plate" || pilot === "general" || pilot === "lost_item_relay";
    root.hidden = !show;
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
    const pilot = ctx.getPilotTemplate();
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

  async function requestDraft() {
    const pilot = ctx.getPilotTemplate();
    const session = ctx.getSession();
    const body = {
      pilot_template: pilot,
      hint: hintEl?.value?.trim() || undefined,
      current: {
        manifesto_line: session?.manifesto_line
          ? String(session.manifesto_line)
          : undefined,
        object_streams: Array.isArray(session?.object_streams)
          ? session.object_streams
          : undefined,
      },
    };

    const res = await fetch(`${resolverApiOrigin()}${DRAFT_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof json.message === "string"
          ? json.message
          : "Could not generate a draft right now.";
      throw new Error(msg);
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
