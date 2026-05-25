import {
  decodePrivateKeyBase58,
  generateQrId,
  getCardJsonUrl,
  postQrRotateUrl,
  qrExpiryFromIssued,
  qrScanUrl,
  resolverApiOrigin,
  signDocument,
  withProtocolFields,
} from "./hc-sign.mjs";

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const alphabet =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < 16; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/**
 * @param {{
 *   profileId: string;
 *   handle: string;
 *   createdAt: string;
 *   manifestoLine: string;
 *   previousEpoch: number;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 *   validityDays?: number;
 *   cardExtras?: Record<string, unknown>;
 * }} opts
 */
export async function signQrRotation(opts) {
  const {
    profileId,
    handle,
    createdAt,
    manifestoLine,
    previousEpoch,
    privateKeyBase58,
    publicKeyBase58,
    validityDays = 365,
    cardExtras = {},
  } = opts;
  const privateKey = decodePrivateKeyBase58(privateKeyBase58);
  const newQrId = generateQrId();
  const newEpoch = previousEpoch + 1;
  const now = new Date().toISOString();
  const apiOrigin = resolverApiOrigin();
  const origin =
    apiOrigin.includes("127.0.0.1") || apiOrigin.includes("localhost")
      ? apiOrigin
      : "https://humanity.llc";
  const scanUrl = qrScanUrl(profileId, newQrId, origin);
  const expiresAt = qrExpiryFromIssued(now, validityDays);

  const cardUnsigned = withProtocolFields(
    {
      profile_id: profileId,
      public_key: publicKeyBase58,
      handle,
      manifesto_line: manifestoLine,
      created_at: createdAt,
      updated_at: now,
      status: "active",
      ...cardExtras,
      qr: { active_qr_id: newQrId, epoch: newEpoch },
    },
    "humanity_card"
  );

  const qrUnsigned = withProtocolFields(
    {
      qr_id: newQrId,
      profile_id: profileId,
      nonce: `nonce_${randomNonce()}`,
      epoch: newEpoch,
      scope: "card",
      resolver_hint: origin,
      issued_at: now,
      expires_at: expiresAt,
      status: "active",
      payload: scanUrl,
    },
    "qr_credential"
  );

  const card = await signDocument(cardUnsigned, privateKey, publicKeyBase58);
  const qr_credential = await signDocument(qrUnsigned, privateKey, publicKeyBase58);
  return { card, qr_credential, newQrId, newEpoch, scanUrl, expiresAt };
}

/**
 * @param {string} profileId
 * @param {{ card: Record<string, unknown>; qr_credential: Record<string, unknown> }} payload
 */
export async function postQrRotation(profileId, payload) {
  const res = await fetch(postQrRotateUrl(profileId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data;
}

/**
 * @param {{
 *   profileId: string;
 *   getSession: () => Record<string, unknown> | null;
 *   setSession: (next: Record<string, unknown>) => void;
 *   showError: (msg: string) => void;
 *   getSigningKeys: () => { privateKeyBase58: string; publicKeyBase58: string } | null;
 *   onRotated: (result: { qrId: string; scanUrl: string; expiresAt: string; epoch: number }) => void | Promise<void>;
 * }} ctx
 */
export function initQrRotate(ctx) {
  const panel = document.getElementById("qr-rotate-panel");
  const btn = document.getElementById("qr-rotate-submit");
  const statusEl = document.getElementById("qr-rotate-status");
  const validitySelect = document.getElementById("qr-rotate-validity");
  if (!panel || !btn) return null;

  async function resolveCreatedAt() {
    const s = ctx.getSession();
    if (s?.created_at) return String(s.created_at);
    const res = await fetch(getCardJsonUrl(ctx.profileId), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Could not load card from network.");
    const card = await res.json();
    if (!card.created_at) throw new Error("Card missing created_at.");
    const next = { ...s, created_at: card.created_at };
    ctx.setSession(next);
    return String(card.created_at);
  }

  async function resolveEpoch() {
    const s = ctx.getSession();
    if (typeof s?.qr_epoch === "number" && s.qr_epoch >= 1) return s.qr_epoch;
    const res = await fetch(getCardJsonUrl(ctx.profileId), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Could not load card epoch from network.");
    const card = await res.json();
    const epoch = card?.qr?.epoch;
    if (!Number.isInteger(epoch) || epoch < 1) {
      throw new Error("Card missing qr.epoch on network.");
    }
    const next = { ...s, qr_epoch: epoch };
    ctx.setSession(next);
    return epoch;
  }

  btn.addEventListener("click", async () => {
    const keys = ctx.getSigningKeys();
    if (!keys) {
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Unlock owner or recovery key before rotating.";
      }
      return;
    }
    const sessionNow = ctx.getSession();
    const handle = sessionNow?.handle;
    const manifestoLine = sessionNow?.manifesto_line;
    if (!handle || !manifestoLine) {
      ctx.showError("Missing handle or public line in session.");
      return;
    }
    if (
      !window.confirm(
        "Issue a new QR on the network? Scans of your current QR will show “replaced.” Your printed sticker still points at the old URL until you print a new one."
      )
    ) {
      return;
    }

    btn.disabled = true;
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = "Signing and rotating…";
    }
    try {
      const createdAt = await resolveCreatedAt();
      const previousEpoch = await resolveEpoch();
      const validityDays = Number(validitySelect?.value) || 365;
      const signed = await signQrRotation({
        profileId: ctx.profileId,
        handle: String(handle),
        createdAt,
        manifestoLine: String(manifestoLine),
        previousEpoch,
        privateKeyBase58: keys.privateKeyBase58,
        publicKeyBase58: keys.publicKeyBase58,
        validityDays,
        cardExtras: {
          verification: sessionNow?.verification || {
            level: 1,
            label: "Registered",
            method: "registered",
            verified_at: createdAt,
            vouch_count: 0,
            latest_accepted_vouch_at: null,
          },
          badges: [],
          links: {
            standards: "https://humanity.llc/standards/v1",
            data_policy: "https://humanity.llc/data-policy.html",
          },
          ...(sessionNow?.recovery_public_key
            ? { recovery_public_key: sessionNow.recovery_public_key }
            : {}),
          ...(sessionNow?.issuer_public_key
            ? { issuer_public_key: sessionNow.issuer_public_key }
            : {}),
        },
      });
      const result = await postQrRotation(ctx.profileId, {
        card: signed.card,
        qr_credential: signed.qr_credential,
      });
      const next = {
        ...sessionNow,
        qr_id: result.qr_id || signed.newQrId,
        scan_url: result.scan_url || signed.scanUrl,
        qr_expires_at: result.qr_expires_at || signed.expiresAt,
        qr_epoch: result.epoch ?? signed.newEpoch,
      };
      ctx.setSession(next);
      await ctx.onRotated({
        qrId: next.qr_id,
        scanUrl: next.scan_url,
        expiresAt: next.qr_expires_at,
        epoch: next.qr_epoch,
      });
      if (statusEl) {
        statusEl.textContent =
          "New QR is live. Update your sticker or share the new scan link from the Now tab.";
      }
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message || String(err);
    } finally {
      btn.disabled = false;
    }
  });

  return {
    show() {
      panel.removeAttribute("hidden");
    },
  };
}
