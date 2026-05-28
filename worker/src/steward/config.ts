import type { Env } from "../env";

/** E1 feature gate (M8): off in production until governance + billing ready. */
export function hostedStewardEnabled(env: Env): boolean {
  return env.HOSTED_STEWARD_ENABLED === "1" || env.HOSTED_STEWARD_ENABLED === "true";
}

export const STEWARD_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const STEWARD_LINK_MAX_TTL_MS = 15 * 60 * 1000;
export const STEWARD_LINK_MAX_CLOCK_SKEW_MS = 60 * 1000;

export const ACCOUNT_ID_REGEX = /^acc_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8,64}$/;
export const DEVICE_ID_REGEX = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz_-]{8,64}$/;
