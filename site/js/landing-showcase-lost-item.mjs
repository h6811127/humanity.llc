/**
 * Loads public lost-item relay showcase scan link from site/data/showcase-lost-item.json
 */
const row = document.getElementById("one-use-lost-item-scan-row");
const link = document.getElementById("one-use-lost-item-scan-link");
const sub = document.getElementById("one-use-lost-item-scan-sub");
if (row && link) {
  try {
    const res = await fetch("/data/showcase-lost-item.json", { cache: "no-store" });
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
