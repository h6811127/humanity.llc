import { getCardJsonUrl } from "./hc-sign.mjs";
import { postCardUpdate, signCardUpdate } from "./created-update.mjs";
import { inferPilotTemplate } from "./manifesto-display.mjs";
import { buildObjectStreamsFromFormRows } from "./object-streams-core.mjs";

/**
 * @param {{
 *   profileId: string;
 *   getSession: () => Record<string, unknown> | null;
 *   setSession: (next: Record<string, unknown>) => void;
 *   showError: (msg: string) => void;
 *   onUpdated: (manifestoLine: string) => void;
 *   getSigningKeys: () => { privateKeyBase58: string; publicKeyBase58: string } | null;
 * }} ctx
 */
export function initManifestoUpdate(ctx) {
  const scannersSee = document.getElementById("created-live-scanners-see");
  const form = document.getElementById("manifesto-update-form");
  const statusEl = document.getElementById("manifesto-update-status");
  const generalFields = document.getElementById("update-fields-general");
  const generalField = document.getElementById("update-manifesto-general");
  const plateFields = document.getElementById("update-fields-status-plate");
  const relayFields = document.getElementById("update-fields-lost-item");
  if (!form) return;

  const session = ctx.getSession();
  const pilot =
    session?.pilot_template ||
    (session?.manifesto_line ? inferPilotTemplate(session.manifesto_line) : "general");
  if (generalFields) generalFields.hidden = pilot !== "general";
  if (plateFields) plateFields.hidden = pilot !== "status_plate";
  if (relayFields) relayFields.hidden = pilot !== "lost_item_relay";

  if (pilot === "status_plate" && session?.manifesto_line) {
    const lines = String(session.manifesto_line).split("\n");
    const objectEl = document.getElementById("update-object-label");
    const statusEl2 = document.getElementById("update-status-line");
    if (objectEl && lines[0]) objectEl.value = lines[0];
    if (statusEl2 && lines[1]) statusEl2.value = lines[1];
    fillObjectStreamFields(session?.object_streams);
  }
  if (pilot === "lost_item_relay" && session?.manifesto_line) {
    const raw = String(session.manifesto_line);
    const nl = raw.indexOf("\n");
    const first = nl >= 0 ? raw.slice(0, nl) : raw;
    const rest = nl >= 0 ? raw.slice(nl + 1) : "";
    const itemEl = document.getElementById("update-relay-item");
    const msgEl = document.getElementById("update-relay-message");
    if (itemEl) itemEl.value = first.replace(/^\[relay\]\s*/, "");
    if (msgEl) msgEl.value = rest;
  }
  if (pilot === "general" && generalField && session?.manifesto_line) {
    generalField.value = String(session.manifesto_line);
  }

  async function resolveCreatedAt() {
    const s = ctx.getSession();
    if (s?.created_at) return String(s.created_at);
    const res = await fetch(getCardJsonUrl(ctx.profileId), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Could not load card from network.");
    const card = await res.json();
    if (!card.created_at) throw new Error("Card missing created_at.");
    const next = { ...s, created_at: card.created_at };
    ctx.setSession(next);
    return String(card.created_at);
  }

  function buildManifesto() {
    if (pilot === "status_plate") {
      const objectLabel = document.getElementById("update-object-label")?.value?.trim();
      const statusLine = document.getElementById("update-status-line")?.value?.trim();
      if (!objectLabel || !statusLine) {
        throw new Error("Object name and status line are required.");
      }
      const combined = `${objectLabel}\n${statusLine}`;
      if (combined.length > 280) throw new Error("Combined text must be 280 characters or fewer.");
      return combined;
    }
    if (pilot === "lost_item_relay") {
      const item = document.getElementById("update-relay-item")?.value?.trim();
      const message = document.getElementById("update-relay-message")?.value?.trim();
      if (!item || !message) throw new Error("Item and return message are required.");
      const combined = `[relay] ${item}\n${message}`;
      if (combined.length > 280) throw new Error("Combined text must be 280 characters or fewer.");
      return combined;
    }
    const line = generalField?.value?.trim();
    if (!line) throw new Error("Public line is required.");
    return line;
  }

  function buildObjectStreamsForUpdate(sessionNow) {
    if (pilot === "status_plate") {
      return buildObjectStreamsFromFormRows([
        {
          label: document.getElementById("update-stream-1-label")?.value,
          value: document.getElementById("update-stream-1-value")?.value,
          class: "place",
        },
        {
          label: document.getElementById("update-stream-2-label")?.value,
          value: document.getElementById("update-stream-2-value")?.value,
          class: "care",
        },
      ]);
    }
    return Array.isArray(sessionNow?.object_streams) ? sessionNow.object_streams : [];
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const keys = ctx.getSigningKeys();
    if (!keys) {
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Unlock owner or recovery key before updating.";
      }
      return;
    }
    const sessionNow = ctx.getSession();
    const handle = sessionNow?.handle;
    if (!handle) {
      ctx.showError("Missing handle in session.");
      return;
    }
    const btn = document.getElementById("manifesto-update-submit");
    if (btn) btn.disabled = true;
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = "Signing and updating…";
    }
    try {
      const manifestoLine = buildManifesto();
      const objectStreams = buildObjectStreamsForUpdate(sessionNow);
      const createdAt = await resolveCreatedAt();
      const signed = await signCardUpdate({
        profileId: ctx.profileId,
        handle: String(handle),
        createdAt,
        manifestoLine,
        privateKeyBase58: keys.privateKeyBase58,
        publicKeyBase58: keys.publicKeyBase58,
        cardExtras: {
          verification: sessionNow?.verification || {
            level: 1,
            label: "Registered",
            method: "registered",
            verified_at: createdAt,
            vouch_count: 0,
            latest_accepted_vouch_at: null,
          },
          badges: [],
          qr: { active_qr_id: sessionNow?.qr_id, epoch: 1 },
          links: {
            standards: "https://humanity.llc/standards/v1",
            data_policy: "https://humanity.llc/data-policy.html",
          },
          ...(objectStreams.length ? { object_streams: objectStreams } : {}),
        },
      });
      await postCardUpdate(ctx.profileId, signed);
      const next = {
        ...sessionNow,
        manifesto_line: manifestoLine,
        ...(objectStreams.length
          ? { object_streams: objectStreams }
          : { object_streams: undefined }),
      };
      if (!objectStreams.length) delete next.object_streams;
      ctx.setSession(next);
      ctx.onUpdated(manifestoLine);
      if (statusEl) statusEl.textContent = "Updated. Next scan shows the new line.";
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message || String(err);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  return {
    show() {
      scannersSee?.removeAttribute("hidden");
    },
  };
}

/** @param {unknown} streams */
function fillObjectStreamFields(streams) {
  if (!Array.isArray(streams)) return;
  const rows = [
    ["update-stream-1-label", "update-stream-1-value"],
    ["update-stream-2-label", "update-stream-2-value"],
  ];
  streams.slice(0, 2).forEach((stream, index) => {
    const ids = rows[index];
    if (!ids || !stream || typeof stream !== "object") return;
    const labelEl = document.getElementById(ids[0]);
    const valueEl = document.getElementById(ids[1]);
    if (labelEl) labelEl.value = String(stream.label || "");
    if (valueEl) valueEl.value = String(stream.value || "");
  });
}
