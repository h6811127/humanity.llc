/**
 * WS-NOTIF N3 — foreground U0 attention strip (pure).
 * @see docs/NOTIFICATION_SYSTEM_V2.md
 */
import { inboxWalletEntryLabel } from "./device-inbox-core.mjs?v=94";
import {
  buildForegroundAttentionPlan,
  liveProofPendingFromInbox,
} from "./device-notification-delivery-core.mjs?v=94";

/**
 * @typedef {object} ForegroundAttentionStripModel
 * @property {boolean} visible
 * @property {'live_proof' | 'relay_offer' | null} kind
 * @property {string} [eyebrow]
 * @property {string} [title]
 * @property {string} [detail]
 * @property {string} [ctaLabel]
 * @property {Record<string, unknown>} [proofItem]
 * @property {boolean} [openInboxOnClick]
 */

/**
 * @param {import("./device-inbox-core.mjs").InboxItem[]} items
 * @param {{ tabVisible?: boolean }} [ctx]
 * @returns {ForegroundAttentionStripModel}
 */
export function buildForegroundAttentionStripModel(items, ctx = {}) {
  const plan = buildForegroundAttentionPlan(items, ctx);
  if (!plan.show || !plan.topU0Kind) {
    return { visible: false, kind: null };
  }

  if (plan.topU0Kind === "live_proof") {
    const pending = liveProofPendingFromInbox(items);
    if (pending.length === 0) {
      return { visible: false, kind: null };
    }
    const first = pending[0];
    const label = inboxWalletEntryLabel(first.entry);
    const n = pending.length;
    return {
      visible: true,
      kind: "live_proof",
      eyebrow: n === 1 ? "Live proof" : `${n} live proofs waiting`,
      title: "Prove live control",
      detail:
        n === 1
          ? `Someone nearby scanned ${label} and asked you to prove you can update it right now. Tap below on this device.`
          : `${n} cards need your signature — starting with ${label}.`,
      ctaLabel: "Prove control now",
      proofItem: first,
      openInboxOnClick: false,
    };
  }

  if (plan.topU0Kind === "relay_offer") {
    const item = items.find((i) => i.kind === "relay_offer");
    const count = item?.count ?? 0;
    if (count <= 0) {
      return { visible: false, kind: null };
    }
    return {
      visible: true,
      kind: "relay_offer",
      eyebrow: count === 1 ? "Finder message" : `${count} finder messages`,
      title: "Reply on your relay",
      detail: "Someone replied on your lost-item relay. Open the inbox to read and respond.",
      ctaLabel: "Open inbox",
      openInboxOnClick: true,
    };
  }

  return { visible: false, kind: null };
}
