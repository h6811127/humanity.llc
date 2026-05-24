/**
 * V-002 — vouch issuance on scan page when viewer has hc_created keys.
 */
import {
  DEFAULT_VOUCH_STATEMENT,
  getCardStatusUrl,
  postVouchUrl,
  signVouch,
} from "./hc-sign.mjs";

const VOUCHER_WAIT_DAYS = 90;
const VOUCH_THRESHOLD = 3;

const row = document.getElementById("vouch-row");
const interactive = document.getElementById("vouch-interactive");
const ineligible = document.getElementById("vouch-ineligible");
const ineligibleCopy = document.getElementById("vouch-ineligible-copy");
const success = document.getElementById("vouch-success");
const successCopy = document.getElementById("vouch-success-copy");
const statusEl = document.getElementById("vouch-status");
const statementEl = document.getElementById("vouch-statement");
const confirmEl = document.getElementById("vouch-confirm");
const submitBtn = document.getElementById("vouch-submit");

function loadSession() {
  try {
    const raw = sessionStorage.getItem("hc_created");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStatus(msg, tone = "neutral") {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.dataset.tone = tone;
}

function plainVouchError(code, fallback) {
  const map = {
    SELF_VOUCH_NOT_ALLOWED: "You can't vouch for your own card.",
    VOUCHER_NOT_VERIFIED:
      "Your card must be a Vouched Human or steward before you can vouch for others.",
    VOUCHER_TOO_NEW: `You need to wait ${VOUCHER_WAIT_DAYS} days after becoming verified before vouching.`,
    VOUCH_QUOTA_EXCEEDED: "You've reached your limit of 5 active vouches this year.",
    VOUCH_ALREADY_ACTIVE: "You already have an active vouch for this person.",
    VOUCH_ALREADY_EXISTS: "This vouch was already recorded.",
    VOUCHER_INACTIVE: "Your card is not active.",
    VOUCHEE_INACTIVE: "This person's card is not active.",
    VOUCHER_NOT_FOUND: "Your card wasn't found on this network.",
    VOUCHEE_NOT_FOUND: "This card wasn't found on this network.",
    INVALID_VOUCH_STATEMENT: "Statement must be 1–280 characters.",
    INVALID_VOUCH_METHOD: "Unsupported vouch method.",
    PRIVATE_NOTE_NOT_ALLOWED: "Private notes can't be sent to the resolver.",
    REPLAYED_NONCE: "That request was already used. Try again.",
    INVALID_SIGNATURE: "Signature check failed. Use the keys from your create session.",
    SIGNATURE_MISMATCH: "Signature does not match your card keys.",
  };
  return map[code] || fallback || "Could not record vouch. Try again.";
}

function formatRecency(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const days = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function humanTrustSubtitle(verification) {
  const count = verification?.vouch_count ?? 0;
  const latest = verification?.latest_accepted_vouch_at;
  const state = verification?.state;
  const label = verification?.label;

  if (state === "revoked" || state === "suspended") {
    return label || "Verification unavailable";
  }
  if (count >= VOUCH_THRESHOLD) {
    const recency = latest ? formatRecency(latest) : "";
    return recency
      ? `${count} humans vouched for this card. Latest vouch ${recency}.`
      : `${count} humans vouched for this card on this network.`;
  }
  if (count > 0) {
    return `${count} of ${VOUCH_THRESHOLD} vouches accepted — needs ${VOUCH_THRESHOLD} for Vouched Human.`;
  }
  return "No accepted human vouches yet.";
}

function updateHumanTrustRow(verification) {
  const title = document.getElementById("human-trust-row-title");
  const sub = document.getElementById("human-trust-row-sub");
  if (title && verification?.label) title.textContent = verification.label;
  if (sub) sub.textContent = humanTrustSubtitle(verification);
}

function showIneligible(message) {
  if (interactive) interactive.hidden = true;
  if (success) success.hidden = true;
  if (ineligible) ineligible.hidden = false;
  if (ineligibleCopy) ineligibleCopy.textContent = message;
}

function showSuccess(verification) {
  if (interactive) interactive.hidden = true;
  if (ineligible) ineligible.hidden = true;
  if (success) success.hidden = false;
  if (successCopy) {
    const count = verification?.vouch_count ?? 0;
    const label = verification?.label || "Registered";
    successCopy.textContent =
      count >= VOUCH_THRESHOLD
        ? `Vouch recorded. This card is now ${label}.`
        : `Vouch recorded. ${count} of ${VOUCH_THRESHOLD} active vouches on this card.`;
  }
  updateHumanTrustRow(verification);
}

async function init() {
  if (!row) return;

  const voucheeProfileId = row.dataset.voucheeProfileId?.trim();
  if (!voucheeProfileId) return;

  const session = loadSession();
  if (
    !session?.profile_id ||
    !session?.owner_private_key_b58 ||
    !session?.owner_public_key_b58
  ) {
    return;
  }

  const voucherProfileId = session.profile_id;
  if (voucherProfileId === voucheeProfileId) return;

  row.hidden = false;

  if (statementEl && !statementEl.value) {
    statementEl.value = DEFAULT_VOUCH_STATEMENT;
  }

  let voucherStatus;
  try {
    const res = await fetch(getCardStatusUrl(voucherProfileId));
    voucherStatus = await res.json();
  } catch {
    showIneligible("Could not load your card status. Check your connection and refresh.");
    return;
  }

  const cardStatus = voucherStatus?.scan?.card?.status;
  const voucherState = voucherStatus?.scan?.verification?.state;

  if (cardStatus !== "active") {
    showIneligible("Your card must be active before you can vouch for someone else.");
    return;
  }

  if (!["verified_human", "steward"].includes(voucherState)) {
    showIneligible(
      "Your card must reach Vouched Human status (or steward) before you can vouch for others."
    );
    return;
  }

  if (interactive) interactive.hidden = false;
  if (ineligible) ineligible.hidden = true;
  setStatus("Ready when you've met this person in person.");

  if (!submitBtn || !statementEl || !confirmEl) return;

  submitBtn.addEventListener("click", async () => {
    const statement = statementEl.value.trim();
    if (!statement || statement.length > 280) {
      setStatus("Statement must be 1–280 characters.", "error");
      return;
    }
    if (!confirmEl.checked) {
      setStatus("Confirm the attestation before submitting.", "error");
      return;
    }

    submitBtn.disabled = true;
    setStatus("Signing vouch…", "waiting");

    try {
      const signed = await signVouch({
        voucherProfileId,
        voucheeProfileId,
        privateKeyBase58: session.owner_private_key_b58,
        publicKeyBase58: session.owner_public_key_b58,
        statement,
      });

      const res = await fetch(postVouchUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vouch: signed }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus(
          plainVouchError(body?.error, body?.message),
          "error"
        );
        submitBtn.disabled = false;
        return;
      }

      showSuccess(body?.verification);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not sign vouch.", "error");
      submitBtn.disabled = false;
    }
  });
}

init();
