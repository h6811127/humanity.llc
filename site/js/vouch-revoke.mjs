/**
 * M6 Step 3  -  revoke vouches the viewer issued from this browser session.
 */
import { UNLOCK_CONTROL_FIRST } from "./device-ownership-copy-core.mjs";
import { stripResolverUrlsFromMessage } from "./resolver-user-error-core.mjs";
import { postVouchRevokeUrl, signVouchRevocation } from "./hc-sign.mjs";

/**
 * @param {{
 *   voucherProfileId: string,
 *   getSession: () => Record<string, unknown> | null,
 *   setSession: (next: Record<string, unknown>) => void,
 * }} ctx
 */
export function initVoucherRevoke(ctx) {
  const details = document.getElementById("vouch-revoke-details");
  const listEl = document.getElementById("issued-vouch-list");
  const emptyEl = document.getElementById("issued-vouch-empty");
  const noKeyEl = document.getElementById("vouch-revoke-no-key");
  const statusEl = document.getElementById("vouch-revoke-status");

  if (!details || !ctx.voucherProfileId) return { refresh: () => {} };

  function keys() {
    const s = ctx.getSession();
    const ownerPriv = s?.owner_private_key_b58;
    const ownerPub = s?.owner_public_key_b58;
    if (typeof ownerPriv === "string" && typeof ownerPub === "string") {
      return { privateKeyBase58: ownerPriv, publicKeyBase58: ownerPub };
    }
    const recPriv = s?.recovery_private_key_b58;
    const recPub = s?.recovery_public_key_b58;
    if (typeof recPriv === "string" && typeof recPub === "string") {
      return { privateKeyBase58: recPriv, publicKeyBase58: recPub };
    }
    return null;
  }

  function issuedVouches() {
    const s = ctx.getSession();
    const raw = s?.issued_vouches;
    return Array.isArray(raw) ? raw : [];
  }

  function setStatus(msg, isError = false) {
    if (!statusEl) return;
    statusEl.hidden = !msg;
    statusEl.textContent = msg;
    statusEl.className = isError ? "form-status error" : "form-status";
  }

  function formatShortDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  function truncateProfileId(id) {
    if (typeof id !== "string" || id.length < 10) return id ?? " - ";
    return `${id.slice(0, 6)}…${id.slice(-4)}`;
  }

  function plainRevokeError(code, fallback) {
    const map = {
      VOUCH_NOT_FOUND: "This vouch is no longer on the network.",
      VOUCH_ALREADY_REVOKED: "This vouch is already revoked.",
      INVALID_SIGNATURE: "Signature check failed. Use the keys from your create session.",
      SIGNATURE_MISMATCH: "Signature does not match your card keys.",
      REPLAYED_NONCE: "That request was already used. Try again.",
      VOUCH_SUBJECT_MISMATCH: "Signed revocation does not match the stored vouch.",
      VOUCH_ID_MISMATCH: "Revocation document does not match this vouch.",
    };
    const plain = map[code] || stripResolverUrlsFromMessage(fallback);
    return plain || "Could not revoke vouch. Try again.";
  }

  async function revokeEntry(entry, button) {
    const k = keys();
    if (!k) {
      setStatus(UNLOCK_CONTROL_FIRST, true);
      return;
    }

    button.disabled = true;
    setStatus("Signing revocation…");

    try {
      const revocation = await signVouchRevocation({
        vouchId: entry.vouch_id,
        voucherProfileId: ctx.voucherProfileId,
        voucheeProfileId: entry.vouchee_profile_id,
        privateKeyBase58: k.privateKeyBase58,
        publicKeyBase58: k.publicKeyBase58,
      });

      setStatus("Submitting…");
      const res = await fetch(postVouchRevokeUrl(entry.vouch_id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vouch_revocation: revocation }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(plainRevokeError(body?.error, body?.message));
      }

      const session = ctx.getSession() || {};
      const next = issuedVouches().map((v) =>
        v.vouch_id === entry.vouch_id
          ? { ...v, status: "revoked", revoked_at: body.revoked_at }
          : v
      );
      ctx.setSession({ ...session, issued_vouches: next });
      setStatus("Vouch revoked on the network.");
      render();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
      button.disabled = false;
    }
  }

  function render() {
    const k = keys();
    const rows = issuedVouches();

    details.hidden = false;
    if (noKeyEl) noKeyEl.hidden = !!k;

    if (!listEl || !emptyEl) return;

    listEl.replaceChildren();

    emptyEl.hidden = rows.length > 0;
    if (rows.length === 0) {
      emptyEl.textContent =
        "No vouches from this browser session yet. Vouch someone from their scan page while this tab still has your keys.";
      return;
    }

    for (const entry of rows) {
      const li = document.createElement("li");
      li.className = "issued-vouch-item";

      const info = document.createElement("div");
      info.className = "issued-vouch-info";
      const title = document.createElement("p");
      title.className = "issued-vouch-title";
      title.textContent =
        entry.status === "revoked"
          ? `Revoked · card ${truncateProfileId(entry.vouchee_profile_id)}`
          : `Card ${truncateProfileId(entry.vouchee_profile_id)}`;
      const sub = document.createElement("p");
      sub.className = "issued-vouch-sub";
      const when = entry.created_at ? formatShortDate(entry.created_at) : "";
      const snippet =
        typeof entry.statement === "string" && entry.statement.length > 0
          ? entry.statement.length > 72
            ? `${entry.statement.slice(0, 72)}…`
            : entry.statement
          : "Public attestation";
      sub.textContent = when ? `${when} · ${snippet}` : snippet;
      info.append(title, sub);

      li.append(info);

      if (entry.status !== "revoked" && k) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-secondary issued-vouch-revoke-btn";
        btn.textContent = "Revoke vouch";
        btn.addEventListener("click", () => revokeEntry(entry, btn));
        li.append(btn);
      }

      listEl.append(li);
    }
  }

  render();
  return { refresh: render };
}
