/**
 * Loads public live-object showcase scan link from site/data/showcase-live-object.json
 */
const row = document.getElementById("one-use-live-object-scan-row");
const link = document.getElementById("one-use-live-object-scan-link");
const sub = document.getElementById("one-use-live-object-scan-sub");
if (row && link) {
  try {
    const res = await fetch("/data/showcase-live-object.json", { cache: "no-store" });
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
