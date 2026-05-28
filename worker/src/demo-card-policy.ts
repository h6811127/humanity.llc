import { normalizeHandle } from "./validation/handle";

/** Sample-card handles from create UI (“Create a sample card”). */
export const DEMO_HANDLE_PREFIXES = ["demo_", "live_demo_"] as const;

/** Stricter than general create limit (10/hour per IP). */
export const DEMO_CREATE_LIMIT_PER_HOUR = 5;

/** Shorter grace than ORPHAN_MIN_AGE_DAYS for abandoned demo registrations. */
export const DEMO_ORPHAN_MIN_AGE_DAYS = 7;

export function isDemoHandle(handle: string): boolean {
  const normalized = normalizeHandle(handle);
  return DEMO_HANDLE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
