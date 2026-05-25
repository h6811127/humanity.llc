import { VOUCH_THRESHOLD } from "../db/verification";
import type { ScanViewModel } from "./scan-state";

export type HumanTrustIconTone = "green" | "purple" | "orange" | "red" | "slate";

export interface HumanTrustDisplay {
  label: string;
  subtitle: string;
  iconTone: HumanTrustIconTone;
  pillActive: boolean;
}

export type HumanTrustListIconId = "people" | "shield" | "warning" | "ban";

/** Scan list row icon  -  tone maps to bundled scan-pass.css list-icon-tone-* */
export function humanTrustListIcon(display: HumanTrustDisplay): {
  id: HumanTrustListIconId;
  tone: HumanTrustIconTone | "trust";
} {
  if (display.label === "Suspended") {
    return { id: "warning", tone: "orange" };
  }
  if (display.label === "Verification revoked") {
    return { id: "ban", tone: "red" };
  }
  if (display.label === "Vouched Human" || display.label === "Steward") {
    return { id: "shield", tone: display.label === "Steward" ? "green" : "trust" };
  }
  if (display.subtitle.includes(" of 3 vouches")) {
    return { id: "people", tone: "purple" };
  }
  if (display.label === "Unverified") {
    return { id: "people", tone: "slate" };
  }
  return { id: "people", tone: "slate" };
}

/** Public freshness signal for latest accepted vouch (HV-FR-32). */
export function formatVouchRecency(iso: string, now: Date = new Date()): string | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const sec = Math.max(0, Math.floor((now.getTime() - t) / 1000));
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86_400) return `${Math.floor(sec / 3600)}h ago`;
  const days = Math.floor(sec / 86_400);
  if (days === 1) return "1 day ago";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function vouchCountLine(count: number): string {
  return `${count} accepted vouch${count === 1 ? "" : "es"} on this operator`;
}

/**
 * Scan Human trust row  -  mechanism-revealing copy (V-001, M6 Step 1).
 * Revoked/suspended verification and card suspension override positive badges.
 */
export function humanTrustDisplay(
  vm: ScanViewModel,
  now: Date = new Date()
): HumanTrustDisplay {
  const cardActive = vm.cardStatus === "active";
  const state = vm.verificationState;
  const count = vm.vouchCount;
  const latest = vm.latestVouchAt;

  if (vm.cardStatus === "suspended" || state === "suspended") {
    return {
      label: "Suspended",
      subtitle: "Human verification is suspended under published rules.",
      iconTone: "orange",
      pillActive: false,
    };
  }

  if (state === "revoked") {
    return {
      label: "Verification revoked",
      subtitle: "Prior verification credentials no longer count on scan.",
      iconTone: "red",
      pillActive: false,
    };
  }

  if (!cardActive && vm.kind !== "active") {
    return {
      label: vm.verificationLabel || "Unknown",
      subtitle: "Verification may not apply while the card is not active.",
      iconTone: "slate",
      pillActive: false,
    };
  }

  if (state === "steward" || vm.verificationLabel === "Steward") {
    const recency = latest ? formatVouchRecency(latest, now) : null;
    const base = "Steward credential on this operator";
    return {
      label: vm.verificationLabel || "Steward",
      subtitle: recency ? `${base} · latest vouch ${recency}` : base,
      iconTone: "green",
      pillActive: cardActive,
    };
  }

  const isVouched =
    state === "verified_human" ||
    count >= VOUCH_THRESHOLD ||
    vm.verificationLabel === "Vouched Human";

  if (isVouched && cardActive) {
    const recency = latest ? formatVouchRecency(latest, now) : null;
    const base = vouchCountLine(count);
    return {
      label: "Vouched Human",
      subtitle: recency ? `${base} · latest ${recency}` : base,
      iconTone: "green",
      pillActive: true,
    };
  }

  if (count > 0 && count < VOUCH_THRESHOLD) {
    return {
      label: "Registered",
      subtitle: `${count} of ${VOUCH_THRESHOLD} vouches accepted  -  not yet a Vouched Human`,
      iconTone: "purple",
      pillActive: cardActive,
    };
  }

  if (state === "unverified" || vm.verificationLabel === "Unverified") {
    return {
      label: "Unverified",
      subtitle: "No accepted human vouches on this operator yet.",
      iconTone: "slate",
      pillActive: false,
    };
  }

  return {
    label: "Registered",
    subtitle:
      "No accepted vouches yet  -  registered on this operator, not proof of humanity.",
    iconTone: "purple",
    pillActive: cardActive,
  };
}
