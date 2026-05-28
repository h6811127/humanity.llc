/**
 * Async /created/ route verification (resolver card lookup).
 */
import {
  classifyCardLookupStatus,
  createdInvalidLinkMessage,
  createdRouteNeedsProfileLookup,
  CREATED_INCOMPLETE_LINK_MESSAGE,
  CREATED_SESSION_MISMATCH_HTML,
  isCreatedSessionProfileMismatch,
  resolveCreatedQrId,
  shouldRedirectCreatedToWallet,
} from "./created-route-gate-core.mjs";

/**
 * @param {{
 *   profileIdParam?: string | null,
 *   qrIdParam?: string | null,
 *   loadSession: () => Record<string, unknown> | null,
 *   fetchCard?: (profileId: string) => Promise<Response>,
 *   fetchStatus?: (profileId: string, qrId: string) => Promise<Response>,
 * }} input
 * @returns {Promise<{
 *   action: import("./created-route-gate-core.mjs").CreatedRouteAction,
 *   profileId?: string,
 *   qrId?: string,
 *   card?: Record<string, unknown>,
 *   message?: string,
 *   noticeHtml?: string,
 * }>}
 */
export async function gateCreatedRoute(input) {
  const profileIdParam = input.profileIdParam?.trim() || null;
  const qrIdParam = input.qrIdParam?.trim() || null;
  const session = input.loadSession();
  const sessionProfileId =
    typeof session?.profile_id === "string" ? session.profile_id.trim() : null;
  const sessionQrId = typeof session?.qr_id === "string" ? session.qr_id.trim() : null;

  if (shouldRedirectCreatedToWallet({ profileIdParam, qrIdParam, session })) {
    return { action: "redirect_wallet" };
  }

  if (
    isCreatedSessionProfileMismatch({
      profileIdParam,
      sessionProfileId,
    })
  ) {
    return {
      action: "session_mismatch",
      noticeHtml: CREATED_SESSION_MISMATCH_HTML,
      profileId: sessionProfileId ?? profileIdParam ?? undefined,
      qrId: sessionQrId ?? qrIdParam ?? undefined,
    };
  }

  const profileId = sessionProfileId || profileIdParam;
  if (!profileId) {
    return {
      action: "incomplete_link",
      message: CREATED_INCOMPLETE_LINK_MESSAGE,
    };
  }

  /** @type {Record<string, unknown> | undefined} */
  let card;
  if (createdRouteNeedsProfileLookup(profileId)) {
    const fetchCard =
      input.fetchCard ??
      (async (pid) => {
        const { getCardJsonUrl } = await import("./hc-sign.mjs");
        return fetch(getCardJsonUrl(pid), {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
      });

    let res;
    try {
      res = await fetchCard(profileId);
    } catch {
      return {
        action: "invalid_link",
        message: createdInvalidLinkMessage("unreachable"),
        profileId,
      };
    }

    const kind = classifyCardLookupStatus(res.status);
    if (kind !== "ok") {
      const reason = kind === "not_found" ? "not_found" : kind === "bad_request" ? "bad_request" : "unreachable";
      return {
        action: "invalid_link",
        message: createdInvalidLinkMessage(reason),
        profileId,
      };
    }

    try {
      card = await res.json();
    } catch {
      return {
        action: "invalid_link",
        message: createdInvalidLinkMessage("unreachable"),
        profileId,
      };
    }
  }

  const cardActiveQrId =
    card && typeof card === "object" && card.qr && typeof card.qr === "object"
      ? /** @type {{ active_qr_id?: string }} */ (card.qr).active_qr_id
      : null;

  const qrId = resolveCreatedQrId({
    qrIdParam,
    sessionQrId,
    cardActiveQrId,
  });

  if (!qrId) {
    return {
      action: "incomplete_link",
      message: CREATED_INCOMPLETE_LINK_MESSAGE,
      profileId,
    };
  }

  if (input.fetchStatus) {
    let statusRes;
    try {
      statusRes = await input.fetchStatus(profileId, qrId);
    } catch {
      return {
        action: "invalid_link",
        message: createdInvalidLinkMessage("unreachable"),
        profileId,
        qrId,
      };
    }
    const statusKind = classifyCardLookupStatus(statusRes.status);
    if (statusKind === "not_found" || statusKind === "bad_request") {
      return {
        action: "invalid_link",
        message: createdInvalidLinkMessage("bad_request"),
        profileId,
        qrId,
      };
    }
  }

  return {
    action: "ok",
    profileId,
    qrId,
    card,
  };
}

/**
 * @param {{
 *   action: import("./created-route-gate-core.mjs").CreatedRouteAction,
 * }} gate
 */
export function createdRouteShellState(gate) {
  if (gate.action === "ok") return "ok";
  if (gate.action === "session_mismatch" || gate.action === "incomplete_link") return "blocked";
  if (gate.action === "invalid_link") return "invalid";
  return "blocked";
}

/**
 * @param {{
 *   action: import("./created-route-gate-core.mjs").CreatedRouteAction,
 * }} gate
 */
export function createdRouteHeroTitle(gate) {
  if (gate.action === "ok") return null;
  if (gate.action === "invalid_link") return "Link not valid";
  if (gate.action === "incomplete_link") return "Incomplete link";
  if (gate.action === "session_mismatch") return "Wrong card in this tab";
  return "Link not valid";
}

/**
 * Apply hero + workspace visibility before full app boot.
 * @param {{
 *   action: import("./created-route-gate-core.mjs").CreatedRouteAction,
 *   pending?: boolean,
 * }} gate
 */
export function applyCreatedRoutePendingShell() {
  applyCreatedRouteShell({ action: "ok", pending: true });
}

export function applyCreatedRouteShell(gate) {
  const body = document.body;
  if (gate.pending) {
    body.dataset.createdRoute = "pending";
  } else {
    body.dataset.createdRoute = createdRouteShellState(gate);
  }

  const heroTitle = document.querySelector(".created-hero-title");
  const setupRoot = document.getElementById("created-setup-root");
  const controlRoot = document.getElementById("created-control-root");
  const liveProof = document.getElementById("live-control-proof");
  const vouchBanner = document.getElementById("created-vouch-return-banner");

  const blocked = gate.pending || gate.action !== "ok";

  if (setupRoot) setupRoot.hidden = blocked;
  if (controlRoot) controlRoot.hidden = blocked;
  if (liveProof && blocked) liveProof.hidden = true;
  if (vouchBanner && blocked) vouchBanner.hidden = true;

  if (!heroTitle) return;

  if (gate.pending) {
    heroTitle.textContent = "Checking link…";
    return;
  }

  const custom = createdRouteHeroTitle(gate);
  if (custom) heroTitle.textContent = custom;
}
