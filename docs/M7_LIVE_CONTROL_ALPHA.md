# M7  -  Live control alpha

**Status:** Step 1 shipped (verify on production); Step 2 polish in progress  
**Canonical refs:** `docs/Technical Standards v1.0.md` §8.6, `docs/V1_PRODUCT_TRUST_MODEL.md` § Live Control Proof Flow  
**Product thesis:** Revocation proves the object is mutable. Live control proves the object is actively possessed.

---

## Mental model

A Humanity QR should not feel like a static link. It should feel like a live delegated capability:

- The scan shows current resolver state.
- Revoke proves the printed object can be changed after deployment.
- Live control proves someone with the key can respond **right now**.

The scanner-facing sentence is:

> This object is currently controlled by someone live.

Do not lead with cryptography, sessions, signatures, or protocol language. Those details belong in standards and tests, not the first interaction.

---

## UX rules

- Keep live control visually separate from card status, human trust, and QR status.
- Use one plain action: **Ask for live proof**.
- Success copy: **Control proven moments ago. This does not prove legal identity.**
- Failure copy: **Control was not proven. The card may still be active.**
- Do not issue a badge, upgrade verification, or imply ownership of the physical object.
- Do not require phone number, email, account login, or social login.

---

## Step 1  -  Live proof loop

**Goal:** prove the interaction primitive end to end without adding permissions, events, handoff, commerce, or access control.

**Flow:**

1. Scanner opens an active scan page.
2. Scanner taps **Ask for live proof**.
3. Resolver creates a short-lived challenge.
4. Scanner gets an owner proof link.
5. Owner opens the link on a key-holding device or the original created tab and taps **Prove control now**.
6. Owner returns to the scan URL with the challenge reference.
7. Scanner page updates to: **Control proven moments ago. This does not prove legal identity.**

**Exit:**

- [x] Active scan can create a short-lived challenge.
- [x] Challenge expires at the standards upper bound (120 seconds) for alpha usability.
- [x] Revoked/expired/replaced QR or inactive card cannot create a challenge.
- [x] Owner/recovery key can sign the challenge from `/created/`.
- [x] No-key state tells the owner to use the original created tab or unlock backup/recovery.
- [x] Scanner can poll challenge status and see recent-control success.
- [x] Owner proof success can return to the scan page and rehydrate the proven state.
- [x] Live control proof does not mutate card, QR, verification, or vouch state.

---

## Not in step 1

- Temporary permissions.
- Event access.
- Wearable identity rules.
- Handoff mechanics.
- Trust transfer.
- Anti-screenshot enforcement.
- Ephemeral authority policy.
- Persistent proof history.

Those become meaningful only after the base interaction is legible.

---

## Step 2 candidates

- Better side-by-side scanner/owner layout for in-person use — **shipped (2026-05-28):** `live-control-in-person-layout` splits scanner and owner panes; at ≥640px when waiting, grid shows **Scanner** | **Owner** roles side by side (`scan-html.ts`, `scan-pass.css`).
- Visible countdown for challenge expiry — **shipped (2026-05-28):** challenge wait shows **Expires in M:SS**; proven success shows **Proof display expires in M:SS** until `proof_expires_at` (`scan-html.ts`, `scan-pass.css`).
- Clear expired/failed state on the scanner page — **shipped (2026-05-28):** SSR stale-proof gate (`scan.ts`), client `showProofExpired` / `showRequestExpired` (`scan-html.ts`), regression tests in `worker/tests/scan.test.ts` and `worker/tests/live-control.test.ts`.
- Copy comprehension test with the question: “What did live control prove?” — **runbook shipped (2026-05-28):** [`M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md`](M7_LIVE_CONTROL_COPY_COMPREHENSION_RUNBOOK.md); ≥5 strangers; automated copy guards in `worker/tests/scan.test.ts`.
- Manual iPhone/Android camera scan of a printed QR — **runbook shipped (2026-05-28):** [`M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md`](M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md); ≥3 phones; camera-app entry + full live proof loop on print.
