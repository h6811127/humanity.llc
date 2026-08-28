/**
 * Hydrate /docket/chapters/ from chapter discovery pins registry.
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md · WS-DOCKET-C
 */
import {
  DOCKET_CHAPTER_PINS_PATH,
  renderDocketChapterPinsPageHtml,
  validateDocketChapterDiscoveryPins,
} from "./docket-chapter-discovery-core.mjs";

async function fetchJson(path) {
  const res = await fetch(path, { credentials: "omit" });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}

async function boot() {
  const bodyEl = document.getElementById("docket-chapter-pins-body");
  const statusEl = document.getElementById("docket-chapter-pins-status");
  if (!bodyEl) return;
  try {
    const raw = await fetchJson(DOCKET_CHAPTER_PINS_PATH);
    const result = validateDocketChapterDiscoveryPins(raw);
    if (!result.ok) {
      throw new Error(result.errors.join("; "));
    }
    bodyEl.innerHTML = renderDocketChapterPinsPageHtml(result.doc);
    if (statusEl) statusEl.hidden = true;
  } catch (err) {
    console.error(err);
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent =
        "Could not load chapter discovery pins. Refresh, or try again later.";
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
