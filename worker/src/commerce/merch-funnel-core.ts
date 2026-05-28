/** Allowed campaign refs for aggregate merch funnel metrics (M8.4). */
export const ALLOWED_MERCH_FUNNEL_REFS = new Set([
  "tier0_sticker",
  "tier0_shop",
  "customize_shop",
  "customize_hoodie",
  "scan_customize",
]);

export const MERCH_FUNNEL_EVENTS = new Set(["scan_landing", "create_attributed"]);

const REF_PATTERN = /^[a-z0-9_]{2,32}$/;

export function normalizeMerchFunnelRef(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const ref = raw.trim().toLowerCase();
  if (!REF_PATTERN.test(ref)) return null;
  if (!ALLOWED_MERCH_FUNNEL_REFS.has(ref)) return null;
  return ref;
}

export function normalizeMerchFunnelEvent(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const event = raw.trim().toLowerCase();
  if (!MERCH_FUNNEL_EVENTS.has(event)) return null;
  return event;
}

export function utcDayKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
