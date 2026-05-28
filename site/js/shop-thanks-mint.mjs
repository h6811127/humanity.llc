/**
 * Tier 1 post-checkout mint UI on /shop/thanks/.
 */
import { loadCardSigningSessionForCustomize } from "./shop-customize-core.mjs";
import { signPlannedPrintArtifactCredentials } from "./shop-artifact-pre-mint.mjs";
import {
  postBuyerOrderMint,
  shouldOfferThanksMint,
  thanksMintButtonLabel,
  thanksMintLeadCopy,
  thanksMintResultMessage,
} from "./shop-thanks-mint-core.mjs";

/** @type {{ order: string, email: string, mint: Record<string, unknown> | null } | null} */
let activeMintContext = null;

const section = document.getElementById("shop-thanks-mint-section");
const leadEl = document.getElementById("shop-thanks-mint-lead");
const noKeysEl = document.getElementById("shop-thanks-mint-no-keys");
const btn = document.getElementById("shop-thanks-mint-btn");
const resultEl = document.getElementById("shop-thanks-mint-result");

/**
 * @param {string} origin
 */
function apiOrigin(origin) {
  if (typeof origin === "string" && origin.trim()) {
    return origin.trim().replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://127.0.0.1:8787";
  }
  return "https://humanity.llc";
}

function signingSession() {
  return loadCardSigningSessionForCustomize(globalThis);
}

function setMintVisible(visible) {
  if (section instanceof HTMLElement) section.hidden = !visible;
}

function setResult(message, isError = false) {
  if (!(resultEl instanceof HTMLElement)) return;
  if (!message) {
    resultEl.hidden = true;
    resultEl.textContent = "";
    resultEl.removeAttribute("role");
    return;
  }
  resultEl.hidden = false;
  resultEl.textContent = message;
  if (isError) resultEl.setAttribute("role", "alert");
  else resultEl.removeAttribute("role");
}

function syncMintChrome() {
  const session = signingSession();
  if (leadEl instanceof HTMLElement) {
    leadEl.textContent = thanksMintLeadCopy(Boolean(session));
  }
  if (noKeysEl instanceof HTMLElement) {
    noKeysEl.hidden = Boolean(session);
  }
  if (btn instanceof HTMLButtonElement) {
    btn.disabled = !session || !activeMintContext;
  }
}

/**
 * @param {Record<string, unknown>} orderStatus
 * @param {boolean} tier1Thanks
 * @param {string} order
 * @param {string} email
 */
export function reconcileThanksMintPanel(orderStatus, tier1Thanks, order, email) {
  const mint = orderStatus?.mint;
  const offer = shouldOfferThanksMint(mint, tier1Thanks);
  if (!offer) {
    activeMintContext = null;
    setMintVisible(false);
    setResult("");
    return;
  }

  activeMintContext = {
    order: order.replace(/^#+/, ""),
    email: email.trim(),
    mint,
  };
  setMintVisible(true);
  syncMintChrome();
  if (mint?.status === "complete") {
    setResult("Your print QR is already active.");
    if (btn instanceof HTMLButtonElement) {
      btn.disabled = true;
      btn.textContent = thanksMintButtonLabel("complete");
    }
  } else {
    setResult("");
    if (btn instanceof HTMLButtonElement) {
      btn.textContent = thanksMintButtonLabel("idle");
    }
  }
}

async function onMintClick() {
  const ctx = activeMintContext;
  const session = signingSession();
  if (!ctx || !session || !(btn instanceof HTMLButtonElement)) return;

  const plannedItems = ctx.mint?.planned_items;
  if (!Array.isArray(plannedItems) || !plannedItems.length) return;

  btn.disabled = true;
  btn.textContent = thanksMintButtonLabel("signing");
  setResult("");

  try {
    const plannedQrIds = plannedItems.map((item) => item.planned_qr_id);
    const plannedPrintArtifactIds = plannedItems.map((item) => item.print_artifact_id);
    const siteOrigin =
      typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : undefined;
    const credentials = await signPlannedPrintArtifactCredentials({
      profileId: session.profile_id,
      plannedItemQrIds: plannedQrIds,
      plannedPrintArtifactIds,
      privateKeyBase58: session.private_key_b58,
      publicKeyBase58: session.public_key_b58,
      siteOrigin,
    });
    const payload = await postBuyerOrderMint(apiOrigin(), {
      order: ctx.order,
      email: ctx.email,
      qr_credentials: credentials,
    });
    const message = thanksMintResultMessage(payload);
    const complete = payload.mint_status === "complete" || payload.all_planned_minted === true;
    setResult(message, !complete);
    btn.textContent = thanksMintButtonLabel(complete ? "complete" : "error");
    btn.disabled = complete;
    if (complete && ctx.mint) {
      ctx.mint.status = "complete";
    }
  } catch (err) {
    setResult(err instanceof Error ? err.message : "Could not activate print QR.", true);
    btn.textContent = thanksMintButtonLabel("error");
    btn.disabled = false;
  }
}

if (btn instanceof HTMLButtonElement) {
  btn.addEventListener("click", () => {
    void onMintClick();
  });
}

syncMintChrome();
