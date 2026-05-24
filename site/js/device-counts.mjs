import { loadWallet } from "./device-wallet.mjs";
import { loadPins } from "./device-pins.mjs";

/**
 * @returns {{ saved: number, pins: number, total: number, label: string }}
 */
export function getDeviceCounts() {
  const saved = loadWallet().length;
  const pins = loadPins().length;
  const parts = [];
  if (saved > 0) {
    parts.push(`${saved} saved`);
  }
  if (pins > 0) {
    parts.push(`${pins} pin${pins === 1 ? "" : "s"}`);
  }
  return {
    saved,
    pins,
    total: saved + pins,
    label: parts.join(" · ") || "",
  };
}
