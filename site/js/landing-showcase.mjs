/**
 * Loads public status-plate showcase scan link from site/data/showcase-status-plate.json
 */
const row = document.getElementById("one-use-live-scan-row");
const link = document.getElementById("one-use-live-scan-link");
const sub = document.getElementById("one-use-live-scan-sub");
if (!row || !link) {
  // nothing to wire
} else {
  try {
    const res = await fetch("/data/showcase-status-plate.json", { cache: "no-store" });
    if (!res.ok) throw new Error("missing");
    const data = await res.json();
    if (data.scan_url && data.profile_id) {
      link.href = data.scan_url;
      if (sub && data.label) sub.textContent = data.label;
      row.hidden = false;
    }
  } catch {
    row.hidden = true;
  }
}
