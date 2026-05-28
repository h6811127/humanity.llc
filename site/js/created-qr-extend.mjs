import {
  decodePrivateKeyBase58,
  getCardStatusUrl,
  postQrExtendUrl,
  signDocument,
  withProtocolFields,
} from "./hc-sign.mjs";
import { resolverErrorMessage } from "./resolver-user-error-core.mjs";

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
 *   qrId: string;
 *   epoch: number;
 *   payload: string;
 *   issuedAt: string;
 *   currentExpiresAt: string | null;
 *   validityDays: number;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 *   resolverHint?: string;
 * }} opts
 */
export async function signQrExtend(opts) {
  const {
    profileId,
    qrId,
    epoch,
    payload,
    issuedAt,
    currentExpiresAt,
    validityDays,
    privateKeyBase58,
    publicKeyBase58,
    resolverHint = "https://humanity.llc",
  } = opts;
  const privateKey = decodePrivateKeyBase58(privateKeyBase58);
  const baseMs = Math.max(
    Date.now(),
    currentExpiresAt ? new Date(currentExpiresAt).getTime() : Date.now()
  );
  const d = new Date(baseMs);
  d.setUTCDate(d.getUTCDate() + validityDays);
  const expiresAt = d.toISOString();

  const qrUnsigned = withProtocolFields(
    {
      qr_id: qrId,
      profile_id: profileId,
      nonce: `nonce_${randomNonce()}`,
      epoch,
      scope: "card",
      resolver_hint: resolverHint,
      issued_at: issuedAt,
      expires_at: expiresAt,
      status: "active",
      payload,
    },
    "qr_credential"
  );

  const qr_credential = await signDocument(qrUnsigned, privateKey, publicKeyBase58);
  return { qr_credential, expiresAt };
}

/**
 * @param {string} profileId
 * @param {Record<string, unknown>} qr_credential
 */
export async function postQrExtend(profileId, qr_credential) {
  const res = await fetch(postQrExtendUrl(profileId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qr_credential }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const url = postQrExtendUrl(profileId);
    throw new Error(
      resolverErrorMessage(data, {
        status: res.status,
        requestUrl: url,
        fallback: "Could not extend QR.",
      })
    );
  }
  return data;
}

/**
 * @param {{
 *   profileId: string;
 *   qrId: string;
 *   getSession: () => Record<string, unknown> | null;
 *   setSession: (next: Record<string, unknown>) => void;
 *   showError: (msg: string) => void;
 *   getSigningKeys: () => { privateKeyBase58: string; publicKeyBase58: string } | null;
 *   onExtended: (result: { expiresAt: string }) => void | Promise<void>;
 * }} ctx
 */
export function initQrExtend(ctx) {
  const panel = document.getElementById("qr-extend-panel");
  const btn = document.getElementById("qr-extend-submit");
  const statusEl = document.getElementById("qr-extend-status");
  const validitySelect = document.getElementById("qr-extend-validity");
  const currentExpiryEl = document.getElementById("qr-extend-current");
  if (!panel || !btn) return null;

  async function loadCurrentExpiry() {
    const session = ctx.getSession();
    if (session?.qr_expires_at && currentExpiryEl) {
      currentExpiryEl.textContent = new Date(String(session.qr_expires_at)).toLocaleString();
      return String(session.qr_expires_at);
    }
    const res = await fetch(getCardStatusUrl(ctx.profileId, ctx.qrId), {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Could not load QR status from network.");
    const body = await res.json();
    const expiresAt = body?.scan?.qr?.expires_at;
    if (!expiresAt) {
      if (currentExpiryEl) currentExpiryEl.textContent = "No expiry set";
      return null;
    }
    if (currentExpiryEl) {
      currentExpiryEl.textContent = new Date(expiresAt).toLocaleString();
    }
    const next = { ...session, qr_expires_at: expiresAt };
    ctx.setSession(next);
    return expiresAt;
  }

  void loadCurrentExpiry().catch(() => {
    if (currentExpiryEl) currentExpiryEl.textContent = "Could not load";
  });

  btn.addEventListener("click", async () => {
    const keys = ctx.getSigningKeys();
    if (!keys) {
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Unlock owner or recovery key before extending.";
      }
      return;
    }
    const sessionNow = ctx.getSession();
    const scanUrl = sessionNow?.scan_url;
    if (!scanUrl) {
      ctx.showError("Missing scan URL in session.");
      return;
    }

    btn.disabled = true;
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = "Signing and extending…";
    }
    try {
      const currentExpiresAt = await loadCurrentExpiry();
      const statusRes = await fetch(getCardStatusUrl(ctx.profileId, ctx.qrId), {
        cache: "no-store",
      });
      if (!statusRes.ok) throw new Error("Could not load QR credential from network.");
      const statusBody = await statusRes.json();
      const qrScan = statusBody?.scan?.qr;
      const issuedAt = qrScan?.issued_at;
      const epoch = qrScan?.epoch;
      const payload = qrScan?.payload || scanUrl;
      if (!issuedAt || !Number.isInteger(epoch)) {
        throw new Error("Network QR metadata incomplete.");
      }

      const validityDays = Number(validitySelect?.value) || 365;
      const signed = await signQrExtend({
        profileId: ctx.profileId,
        qrId: ctx.qrId,
        epoch,
        payload,
        issuedAt,
        currentExpiresAt,
        validityDays,
        privateKeyBase58: keys.privateKeyBase58,
        publicKeyBase58: keys.publicKeyBase58,
      });

      const result = await postQrExtend(ctx.profileId, signed.qr_credential);
      const expiresAt = result.qr_expires_at || signed.expiresAt;
      ctx.setSession({ ...sessionNow, qr_expires_at: expiresAt });
      await ctx.onExtended({ expiresAt });
      if (statusEl) {
        statusEl.textContent = `Extended. Valid until ${new Date(expiresAt).toLocaleString()}.`;
      }
      if (currentExpiryEl) {
        currentExpiryEl.textContent = new Date(expiresAt).toLocaleString();
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
    refreshExpiry: loadCurrentExpiry,
  };
}
