/**
 * L3 P1 — opt-in plain-language summary of signed public snapshot.
 * @see docs/AI_L3_EXPLAIN_SNAPSHOT.md
 */

const EXPLAIN_PATH = "/.well-known/hc/v1/ai/explain-snapshot";

function readSnapshotFromDom() {
  const root = document.querySelector(".scan-public-snapshot");
  const raw = root?.getAttribute("data-public-snapshot");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function apiOrigin() {
  return window.location.origin;
}

async function requestExplain(snapshot) {
  const res = await fetch(`${apiOrigin()}${EXPLAIN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_snapshot: snapshot }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof body.message === "string"
        ? body.message
        : "Could not prepare plain-language help right now.";
    throw new Error(msg);
  }
  return body;
}

function bindExplain() {
  const btn = document.getElementById("scan-ai-explain-btn");
  const panel = document.getElementById("scan-ai-explain-panel");
  const textEl = document.getElementById("scan-ai-explain-text");
  if (!btn || !panel || !textEl || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  btn.addEventListener("click", async () => {
    const snapshot = readSnapshotFromDom();
    if (!snapshot) return;

    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    const prevLabel = btn.textContent;
    btn.textContent = "Explaining…";

    try {
      const body = await requestExplain(snapshot);
      textEl.textContent =
        typeof body.summary === "string" ? body.summary : "No summary returned.";
      panel.hidden = false;
      panel.classList.add("scan-ai-explain-panel--visible");
    } catch (err) {
      textEl.textContent =
        err instanceof Error ? err.message : "Could not prepare plain-language help.";
      panel.hidden = false;
      panel.classList.add("scan-ai-explain-panel--visible");
    } finally {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
      btn.textContent = prevLabel || "Explain in plain language";
    }
  });
}

bindExplain();
