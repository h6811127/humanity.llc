/** Normalize hero markup for stable snapshots and contract tests. */
export function normalizeScanHeroSnippet(html: string): string {
  const match = html.match(/<article class="scan-hero[\s\S]*?<\/article>/);
  if (!match) return "";
  return match[0]
    .replace(/data-profile-id="[^"]+"/g, 'data-profile-id="PROFILE"')
    .replace(/data-qr-id="[^"]+"/g, 'data-qr-id="QR"')
    .replace(/data-scan-url="[^"]+"/g, 'data-scan-url="SCAN_URL"')
    .replace(/HC-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}/g, "HC-XXXX-XXXX")
    .replace(/<svg[\s\S]*?<\/svg>/g, "<svg><!-- qr --></svg>")
    .replace(/\s+/g, " ")
    .trim();
}
