/**
 * V-002  -  vouch issuance on scan page when viewer has hc_created keys.
 */
import { logDeviceActivity } from "./device-activity.mjs";
import { activateWalletEntry, clearTabSessionKeys } from "./device-keys.mjs";
import {
  DEFAULT_VOUCH_STATEMENT,
  getCardStatusUrl,
  postVouchUrl,
  signVouch,
} from "./hc-sign.mjs";
import { loadWallet } from "./device-wallet.mjs";
import {
  humanTrustIconMeta,
  isEligibleVoucherState,
} from "./human-trust-ui.mjs";
import {
  getDefaultVouchProfileId,
  isDefaultVouchProfile,
  isVouchAutoActivateEnabled,
} from "./vouch-ready-keys.mjs";

const VOUCHER_WAIT_DAYS = 90;
const VOUCH_THRESHOLD = 3;
const VOUCH_RETURN_KEY = "hc_vouch_return_url";
/** Set when user taps Stop on this scan; blocks auto-activate until scan URL changes. */
const VOUCH_SKIP_AUTO_KEY = "hc_vouch_skip_auto_scan";
const MAX_USE_KEYS_HERE = 5;

let submitHandlerBound = false;

function rememberVouchReturnUrl() {
  try {
    sessionStorage.setItem(VOUCH_RETURN_KEY, location.href);
  } catch {
    /* ignore */
  }
}

function loadKeysHelpHtml(walletUrl) {
  const defaultHint = getDefaultVouchProfileId()
    ? ` Change default on <a href="${walletUrl}">Saved cards</a> (⋯ → <strong>Default for vouching</strong>).`
    : "";
  return (
    ` Or open <a href="${walletUrl}">Saved cards</a>, tap <strong>Open controls</strong> (` +
    `<code>/created/</code>), and return here in the same tab.${defaultHint}`
  );
}

const row = document.getElementById("vouch-row");
const explainer = document.getElementById("vouch-explainer");
const explainerCopy = document.getElementById("vouch-explainer-copy");
const explainerActions = document.getElementById("vouch-explainer-actions");
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

function saveIssuedVouch(signed) {
  const session = loadSession();
  if (!session) return;
  const list = Array.isArray(session.issued_vouches) ? session.issued_vouches : [];
  list.unshift({
    vouch_id: signed.vouch_id,
    vouchee_profile_id: signed.vouchee_profile_id,
    statement: signed.statement,
    created_at: signed.created_at,
    status: "active",
  });
  sessionStorage.setItem(
    "hc_created",
    JSON.stringify({ ...session, issued_vouches: list })
  );
}

function setStatus(msg, tone = "neutral") {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.dataset.tone = tone;
}

function clearVouchStopButton() {
  document.getElementById("vouch-stop-keys")?.remove();
}

function clearVouchSwitchDefault() {
  document.getElementById("vouch-switch-default")?.remove();
}

function mountVouchStopButton(voucherLabel) {
  const panel = statusEl?.parentElement;
  if (!panel) return;

  let stop = document.getElementById("vouch-stop-keys");
  if (!stop) {
    stop = document.createElement("button");
    stop.type = "button";
    stop.id = "vouch-stop-keys";
    stop.className = "vouch-stop-keys";
    stop.textContent = "Clear keys from this tab";
    stop.addEventListener("click", () => {
      try {
        sessionStorage.setItem(VOUCH_SKIP_AUTO_KEY, location.href);
      } catch {
        /* ignore */
      }
      clearTabSessionKeys();
      clearVouchStopButton();
      runVouchFlow({ skipAutoActivate: true });
    });
    panel.appendChild(stop);
  }

  const hint = voucherLabel ? ` · ${voucherLabel}` : "";
  setStatus(`Signing key loaded${hint}. Confirm in-person contact before signing.`);
}

function plainVouchError(code, fallback) {
  const map = {
    SELF_VOUCH_NOT_ALLOWED: "Cannot vouch for your own profile.",
    VOUCHER_NOT_VERIFIED:
      "Your card must be Vouched Human or Steward before you can vouch.",
    VOUCHER_TOO_NEW: `Wait ${VOUCHER_WAIT_DAYS} days after verification before vouching.`,
    VOUCH_QUOTA_EXCEEDED: "Annual limit: 5 vouches per voucher.",
    STEWARD_VOUCH_QUOTA_EXCEEDED: "Steward annual limit: 3 vouches per voucher.",
    VOUCH_ALREADY_ACTIVE: "You already have an active vouch for this profile.",
    VOUCH_ALREADY_EXISTS: "This vouch is already on the network.",
    VOUCHER_INACTIVE: "Your card is inactive.",
    VOUCHEE_INACTIVE: "This card is inactive.",
    VOUCHER_NOT_FOUND: "Your card was not found on this network.",
    VOUCHEE_NOT_FOUND: "This card was not found on this network.",
    INVALID_VOUCH_STATEMENT: "Statement must be 1–280 characters.",
    INVALID_VOUCH_METHOD: "Unsupported vouch method.",
    PRIVATE_NOTE_NOT_ALLOWED: "Only public statements are accepted.",
    REPLAYED_NONCE: "Nonce already used. Sign again.",
    INVALID_SIGNATURE: "Signature invalid. Reload keys from your create session.",
    CARD_INVALID_SIGNATURE:
      "Signature invalid. Load steward keys via Saved cards → Sign as…",
    SIGNATURE_MISMATCH: "Signature does not match your card keys.",
  };
  return map[code] || fallback || "Vouch not recorded. Try again.";
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
    return `${count} of ${VOUCH_THRESHOLD} vouches accepted  -  needs ${VOUCH_THRESHOLD} for Vouched Human.`;
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
  clearVouchStopButton();
  clearVouchSwitchDefault();
}

function showSuccess(verification) {
  if (interactive) interactive.hidden = true;
  if (ineligible) ineligible.hidden = true;
  clearVouchStopButton();
  clearVouchSwitchDefault();
  if (success) success.hidden = false;
  if (successCopy) {
    const count = verification?.vouch_count ?? 0;
    const label = verification?.label || "Registered";
    successCopy.textContent =
      count >= VOUCH_THRESHOLD
        ? `Signed vouch accepted. This card is now ${label}.`
        : `Signed vouch accepted. ${count} of ${VOUCH_THRESHOLD} active vouches toward Vouched Human.`;
  }
  updateHumanTrustRow(verification);
}

function clearExplainerActions() {
  if (!explainerActions) return;
  explainerActions.innerHTML = "";
  explainerActions.hidden = true;
}

function hideExplainer() {
  if (explainer) explainer.hidden = true;
  clearExplainerActions();
  clearVouchStopButton();
  clearVouchSwitchDefault();
}

/**
 * @param {Array<{ entry: Record<string, unknown>, label: string, verificationLabel: string }>} eligible
 */
function mountUseKeysHereButtons(eligible) {
  if (!explainerActions) return;

  clearExplainerActions();
  const withKeys = eligible
    .filter((e) => e.entry?.owner_private_key_b58 && e.entry?.owner_public_key_b58)
    .slice(0, MAX_USE_KEYS_HERE);

  if (withKeys.length === 0) {
    return;
  }

  explainerActions.hidden = false;

  for (const item of withKeys) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vouch-cta vouch-use-keys-here";
    btn.textContent = `Sign as ${item.label} · ${item.verificationLabel}`;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      setStatus("Loading signing key…", "waiting");
      activateWalletEntry(item.entry);
      await runVouchFlow();
    });
    explainerActions.appendChild(btn);
  }
}

function showExplainerHtml(html, eligible = []) {
  if (explainer) explainer.hidden = false;
  if (explainerCopy) explainerCopy.innerHTML = html;
  if (row) row.hidden = true;
  mountUseKeysHereButtons(eligible);
}

function walletLinksHtml() {
  const walletUrl = `${location.origin}/wallet/`;
  const createUrl = `${location.origin}/create/`;
  return `<a href="${walletUrl}">Saved cards</a> (or <a href="${createUrl}">create one</a>)`;
}

function cardLabel(entry) {
  if (entry.handle) return `@${entry.handle}`;
  if (entry.label) return entry.label;
  if (entry.profile_id) return `${entry.profile_id.slice(0, 10)}…`;
  return "Saved card";
}

/**
 * @param {string} voucheeProfileId
 * @returns {Promise<Array<{ entry: Record<string, unknown>, label: string, verificationLabel: string }>>}
 */
async function findEligibleWalletVouchers(voucheeProfileId) {
  const wallet = loadWallet();
  /** @type {Array<{ entry: Record<string, unknown>, label: string, verificationLabel: string }>} */
  const eligible = [];

  await Promise.all(
    wallet.map(async (entry) => {
      if (!entry?.profile_id || entry.profile_id === voucheeProfileId) return;
      try {
        const res = await fetch(
          getCardStatusUrl(String(entry.profile_id), entry.qr_id ?? null),
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const body = await res.json();
        const state = body?.scan?.verification?.state;
        if (!isEligibleVoucherState(state)) return;
        const verificationLabel =
          body?.scan?.human_trust?.label ||
          body?.scan?.verification?.label ||
          (state === "steward" ? "Steward" : "Vouched Human");
        eligible.push({
          entry,
          label: cardLabel(entry),
          verificationLabel,
        });
      } catch {
        /* skip */
      }
    })
  );

  return eligible;
}

/**
 * @param {string} voucheeProfileId
 * @returns {Promise<boolean>}
 */
function userSkippedAutoActivateOnThisScan() {
  try {
    return sessionStorage.getItem(VOUCH_SKIP_AUTO_KEY) === location.href;
  } catch {
    return false;
  }
}

async function tryAutoActivateDefaultVouchKeys(voucheeProfileId, opts = {}) {
  if (opts.skipAutoActivate || userSkippedAutoActivateOnThisScan()) return false;
  if (!isVouchAutoActivateEnabled()) return false;

  const defaultId = getDefaultVouchProfileId();
  if (!defaultId || defaultId === voucheeProfileId) return false;

  const entry = loadWallet().find((e) => e.profile_id === defaultId);
  if (!entry?.owner_private_key_b58 || !entry?.owner_public_key_b58) {
    return false;
  }

  try {
    const res = await fetch(
      getCardStatusUrl(String(entry.profile_id), entry.qr_id ?? null),
      { cache: "no-store" }
    );
    if (!res.ok) return false;
    const body = await res.json();
    const state = body?.scan?.verification?.state;
    if (!isEligibleVoucherState(state)) return false;
    if (body?.scan?.card?.status !== "active") return false;
  } catch {
    return false;
  }

  activateWalletEntry(entry);
  logDeviceActivity(
    "auto_activate_vouch_keys",
    entry.label || entry.handle || String(entry.profile_id).slice(0, 12),
    { profile_id: entry.profile_id, qr_id: entry.qr_id ?? null }
  );
  return true;
}

/**
 * No signing keys in this tab — explain network vs device and detect saved eligible cards.
 */
async function showNoKeysExplainer(voucheeProfileId) {
  const wallet = loadWallet();
  const walletUrl = `${location.origin}/wallet/`;

  if (wallet.length === 0) {
    showExplainerHtml(
      `Vouching requires your card’s Ed25519 signing key in <strong>this tab</strong>—network Steward status alone is not enough. ` +
        `Create a card or open ${walletLinksHtml()}, then tap <strong>Sign as…</strong> on this scan. ` +
        `Only the signed document is transmitted; the private key stays on device.`
    );
    return;
  }

  const eligible = await findEligibleWalletVouchers(voucheeProfileId);

  if (eligible.length === 0) {
    showExplainerHtml(
      `${wallet.length} saved card${wallet.length === 1 ? "" : "s"} on this device, but none qualify as <strong>Vouched Human</strong> or <strong>Steward</strong> on the network—or the saved profile matches this scan. ` +
        loadKeysHelpHtml(walletUrl)
    );
    return;
  }

  const lines = eligible
    .slice(0, 3)
    .map(
      (e) =>
        `<strong>${e.verificationLabel}</strong> on the network for <strong>${e.label}</strong>`
    )
    .join("; ");
  const more =
    eligible.length > 3 ? ` (+${eligible.length - 3} more saved)` : "";

  const hasActivatable = eligible.some(
    (e) => e.entry?.owner_private_key_b58 && e.entry?.owner_public_key_b58
  );

  const multiple = eligible.length > 1;
  const defaultSet = !!getDefaultVouchProfileId();
  let lead;
  if (multiple) {
    lead =
      `<strong>Select a signing card.</strong> No signing key is active in this tab. ` +
      (hasActivatable
        ? `Tap <strong>Sign as…</strong> below. `
        : `Re-save a card with keys on <a href="${walletUrl}">Saved cards</a>, then return. `) +
      (!defaultSet
        ? `<a href="${walletUrl}">Set a default for vouching</a> to auto-load one card on future scans. `
        : "");
  } else {
    lead =
      `${lines}${more} — <strong>signing key not loaded in this tab</strong>. ` +
      (hasActivatable
        ? `Tap <strong>Sign as…</strong> below to load the key and sign. `
        : `Re-save your card with keys on <a href="${walletUrl}">Saved cards</a>, then return. `);
  }

  showExplainerHtml(
    lead +
      loadKeysHelpHtml(walletUrl) +
      ` <a href="${location.origin}/features/vouching.html">How vouching works</a>.`,
    eligible
  );
}

/**
 * When keys are active for a different card than the user's vouch default.
 * @param {Record<string, unknown>} session
 */
async function mountVouchSwitchDefault(session) {
  clearVouchSwitchDefault();
  if (!interactive) return;

  const defaultId = getDefaultVouchProfileId();
  if (!defaultId || !isVouchAutoActivateEnabled()) return;
  if (session.profile_id === defaultId) return;

  const defaultEntry = loadWallet().find((e) => e.profile_id === defaultId);
  if (!defaultEntry?.owner_private_key_b58 || !defaultEntry?.owner_public_key_b58) {
    return;
  }

  try {
    const res = await fetch(
      getCardStatusUrl(String(defaultEntry.profile_id), defaultEntry.qr_id ?? null),
      { cache: "no-store" }
    );
    if (!res.ok) return;
    const body = await res.json();
    if (!isEligibleVoucherState(body?.scan?.verification?.state)) return;
    if (body?.scan?.card?.status !== "active") return;
  } catch {
    return;
  }

  const currentLabel = session.handle
    ? `@${session.handle}`
    : cardLabel({
        profile_id: session.profile_id,
        label: session.wallet_label,
        handle: session.handle,
      });
  const defaultLabel = cardLabel(defaultEntry);

  const box = document.createElement("div");
  box.id = "vouch-switch-default";
  box.className = "vouch-card vouch-card-hint vouch-switch-default";
  box.setAttribute("role", "note");

  const copy = document.createElement("p");
  copy.className = "vouch-lead";
  copy.innerHTML =
    `Active signing key: <strong>${currentLabel}</strong>. ` +
    `Default for vouching: <strong>${defaultLabel}</strong>.`;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "vouch-cta vouch-switch-default-btn";
  btn.textContent = `Switch to ${defaultLabel}`;
  btn.addEventListener("click", () => {
    try {
      sessionStorage.removeItem(VOUCH_SKIP_AUTO_KEY);
    } catch {
      /* ignore */
    }
    activateWalletEntry(defaultEntry);
    runVouchFlow({ autoActivateAttempted: true });
  });

  box.append(copy, btn);
  interactive.insertBefore(box, interactive.firstChild);
}

function bindSubmitHandler(voucheeProfileId) {
  if (!submitBtn || !statementEl || !confirmEl || submitHandlerBound) return;
  submitHandlerBound = true;

  submitBtn.addEventListener("click", async () => {
    const session = loadSession();
    if (
      !session?.profile_id ||
      !session.owner_private_key_b58 ||
      !session.owner_public_key_b58
    ) {
      setStatus("No signing key in this tab.", "error");
      return;
    }
    const voucherProfileId = session.profile_id;

    const statement = statementEl.value.trim();
    if (!statement || statement.length > 280) {
      setStatus("Statement must be 1–280 characters.", "error");
      return;
    }
    if (!confirmEl.checked) {
      setStatus("Confirm in-person attestation before signing.", "error");
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

      const raw = await res.text();
      let body = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }

      if (!res.ok) {
        const fallback =
          body?.message ||
          (res.status === 405
            ? "Vouch service is not reachable on this URL."
            : res.status >= 500
              ? "Server error. Try again shortly."
              : undefined);
        setStatus(plainVouchError(body?.error, fallback), "error");
        submitBtn.disabled = false;
        return;
      }

      showSuccess(body?.verification);
      saveIssuedVouch(signed);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not sign vouch.", "error");
      submitBtn.disabled = false;
    }
  });
}

async function runVouchFlow(opts = {}) {
  if (!row) return;

  const voucheeProfileId = row.dataset.voucheeProfileId?.trim();
  if (!voucheeProfileId) return;

  rememberVouchReturnUrl();

  if (success) success.hidden = true;
  if (ineligible) ineligible.hidden = true;

  let session = loadSession();
  let hasKeys =
    session?.profile_id &&
    session?.owner_private_key_b58 &&
    session?.owner_public_key_b58;

  if (!hasKeys && !opts.autoActivateAttempted && !opts.skipAutoActivate) {
    const activated = await tryAutoActivateDefaultVouchKeys(voucheeProfileId, opts);
    if (activated) {
      return runVouchFlow({ autoActivateAttempted: true });
    }
    await showNoKeysExplainer(voucheeProfileId);
    return;
  }

  if (!hasKeys) {
    await showNoKeysExplainer(voucheeProfileId);
    return;
  }

  const voucherProfileId = session.profile_id;
  if (voucherProfileId === voucheeProfileId) {
    showExplainerHtml(
      "Cannot vouch for your own profile. Open another person’s scan while <strong>your</strong> signing key is loaded in this tab."
    );
    return;
  }

  hideExplainer();
  row.hidden = false;

  if (statementEl && !statementEl.value) {
    statementEl.value = DEFAULT_VOUCH_STATEMENT;
  }

  let voucherStatus;
  try {
    const res = await fetch(getCardStatusUrl(voucherProfileId));
    voucherStatus = await res.json();
  } catch {
    showIneligible("Could not load your card status. Check connection and refresh.");
    return;
  }

  const cardStatus = voucherStatus?.scan?.card?.status;
  const voucherState = voucherStatus?.scan?.verification?.state;
  const voucherLabel =
    voucherStatus?.scan?.human_trust?.label ||
    voucherStatus?.scan?.verification?.label;

  if (cardStatus !== "active") {
    showIneligible("Your card must be active before you can issue a vouch.");
    return;
  }

  if (!isEligibleVoucherState(voucherState)) {
    showIneligible(
      "Your card must be Vouched Human or Steward on this network before you can vouch."
    );
    return;
  }

  if (interactive) interactive.hidden = false;
  if (ineligible) ineligible.hidden = true;
  humanTrustIconMeta({
    label: voucherLabel,
    state: voucherState,
  });
  const toneHint =
    voucherState === "steward" ? "Steward on the network" : "Vouched Human on the network";
  const autoLoaded =
    opts.autoActivateAttempted && isDefaultVouchProfile(voucherProfileId);
  const voucherDisplay =
    session.handle ? `@${session.handle}` : session.wallet_label || toneHint;
  mountVouchStopButton(
    autoLoaded
      ? `Signing as ${voucherDisplay} (default, auto-loaded)`
      : `Signing as ${voucherDisplay} · ${toneHint}`
  );

  await mountVouchSwitchDefault(session);

  bindSubmitHandler(voucheeProfileId);
}

runVouchFlow();

window.addEventListener("hc-device-hub-changed", () => {
  if (!loadSession()?.owner_private_key_b58 && userSkippedAutoActivateOnThisScan()) {
    runVouchFlow({ skipAutoActivate: true });
    return;
  }
  runVouchFlow();
});
