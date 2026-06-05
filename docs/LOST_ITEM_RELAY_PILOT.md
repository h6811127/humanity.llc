# Lost item relay pilot (Phase A vertical #2)

**Front door:** This is a **pilot** (catalog tag `pilot`) — trust proof for revocable relay state, **not** homepage or company identity. Do not lead marketing with lost-item tags ([`PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md`](PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md) · [`QR_DESIGN_SPACE.md`](QR_DESIGN_SPACE.md) § Catalog roles).

**Status:** Active pilot  
**Parent:** `docs/ROOT_CARD_AND_CHILD_OBJECTS.md` · `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md`  
**Prerequisite:** ~~M5 stranger loop~~ **Satisfied** — M5 passed 2026-05-27 (`docs/M5_STRANGER_TEST_RUNBOOK.md`)
**Research:** `site/what-can-a-qr-do/lost-item-relay/`

---

## What it is

A **lost item relay** is a QR on keys, a bag, or a tag that answers one question when scanned:

> Is there a live return path for this item **right now**?

Not proof of ownership. Not a phone number printed in plain sight. Item name + return instructions the owner can **revoke** when recovered or abused.

---

## How to create one

**Current path (deploy wizard — Account → Endpoint → Scan link):**

1. Go to **https://humanity.llc/create/?intent=deploy** (launch door 1 **Live status on something**; lost-item fields in deploy wizard)
2. Fill in:
   - **Handle**  -  your account id (e.g. `keys_relay`)
   - **What is lost?**  -  headline on scan (e.g. `House keys`)
   - **What should finders see?**  -  return message (e.g. `Lost  -  contact owner through relay`)
3. Submit mints **Account** (general root) + **Endpoint** (`lost_item_relay` child) + **Scan link** in one action when no saved general root exists; **Continue on Live** when an account already exists.
4. Save recovery key on `/created/`, print QR, scan from another phone, revoke when recovered.

**Returning steward:** From an existing account, open `/created/` Live → **Add lost-item relay** (register + first scan link in one action) or manage nested rows under the root in **My cards** / hub. See [`ROOT_CARD_AND_CHILD_OBJECTS.md`](ROOT_CARD_AND_CHILD_OBJECTS.md) § Product UX maturity (steps 13–16).

**Legacy flat account (read/scan compatibility only):** `?template=lost_item` mints a root whose `[relay]`-prefixed `manifesto_line` encodes the relay. Scans, updates, and revoke still work — field-kit regression path only; not the front-door create path.

**Same iPhone note:** Same device storage rules as status plates — local child index reconciled from resolver list; nested hub/My cards rows shipped (step 13); PWA install does not add extra storage.

Public showcase scan (homepage pilot): see `site/data/showcase-lost-item.json` - refresh with `npm run site:seed-showcase-lost-item`.

### Storage format

**Current creates (child endpoint):** `public_label` + `public_state` on the `child_objects` row; scan reads these first-class (`[relay]` prefix applied at compose time for lost-item type).

**Legacy flat accounts:** one root `manifesto_line` with **two lines** and a line-1 prefix:

```text
[relay] House keys
Lost  -  contact owner through relay
```

Line 1 = `[relay] ` + item label · Line 2 = return message. Parsed in `worker/src/resolver/manifesto-display.ts`.

---

## What scanners see

- **pass-type:** Lost item relay  
- **Headline:** item name (without `[relay]` prefix)  
- **Status line:** return message (line 2)  
- **Handle:** smaller `@handle` under the message  
- **Badge:** Active / Revoked / etc. from network  
- **Foot:** “This scan does not prove who holds the item. It only shows whether the return relay is active.”
- **Create hint (Step 6):** Calm link to `/create/?template=lost_item` — “Create a lost-item tag” + copy from `scan-safety.ts` (`LOST_ITEM_RELAY_CREATE_*`). Lost-item relay template only.

Deploy Worker with `X-HC-Scan-UI: pass-v8` for this layout.

---

## Pilot checklist (5–10 real tags)

**Field walk (LO-1):** `npm run ws-live:lo1-kit` → open `site/dev/ws-live-lo1-comprehension.html` on phones (requires `pages:dev`).

| Step | Pass? |
|------|-------|
| Stranger creates lost item relay unassisted via **deploy wizard** (`?intent=deploy` or launch door 1) | ☐ |
| Returning steward adds lost-item relay on Live without new account | ☐ manual · **create + update + scan link + disable** on `/created/` Live |
| Legacy flat template (`?template=lost_item`) still scans and updates after create | ☐ regression · field-kit Path B only |
| Finder understands return path in &lt;30s | ☐ |
| Owner revokes after “found” and re-scan shows revoked | ☐ |
| Stranger answers “does scan prove holder?” correctly | ☐ |
| No phone number required on the printed tag | ☐ |

Score with `docs/M5_STRANGER_TEST_RUNBOOK.md`.

---

## Habit loop scorecard

**Strategy:** `docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md` § Step 7  
**Product:** `/created/` shows **Pilot habit loop** for lost-item relay templates (`site/js/lost-item-relay-loop-scorecard.mjs`).

| Signal | Target | How measured |
|--------|--------|--------------|
| Return message updates published | **≥1** per steward | Auto-count on successful Live publish (localStorage per `profile_id`) |
| Printed + tagged | 1 | Owner checkbox (or auto when QR PNG downloaded) |
| Second-device scan | 1 | Owner checkbox |

**Habit loop closed (one steward):** ≥1 update + printed + second-device scan confirmed. Scorecard headline switches to “Pilot habit loop closed on this device.” when all three are true.

**Field pilot export:** **Copy pilot summary** on `/created/` copies local JSON (`humanity_lost_item_relay_pilot_summary_v1`) for founder aggregation — no server analytics. Roll up exports: `npm run site:aggregate-pilot-summaries -- summaries/*.json`

**Privacy:** Scorecard is device-local only — aligns with no scan analytics by default.

---

## Return message updates

Owner can change line 2 (return message) without reprinting  -  `docs/MANIFESTO_STATUS_UPDATE.md`, **Update public line** on `/created/`.

---

## Ethics (read before field test)

- **Do not** imply scan proves the holder is the owner.  
- **Do not** use scan analytics on crisis or lost-item pilots by default.  
- **Revoke** when recovered  -  a live relay after return is a liability.  
- Prefer coalition or owner-controlled copy review; humanity.llc ships the primitive.

---

## Related files

| Path | Role |
|------|------|
| `site/create/?intent=deploy` | Deploy wizard (current); legacy `?template=lost_item` for field-kit regression |
| `site/js/create-card.mjs` | `[relay] ` prefix + `pilot_template` |
| `site/created/` | Lost item pilot tip |
| `site/js/created-child-object-lost-item.mjs` | Lost-item relay child UI on `/created/` Live |
| `worker/src/resolver/manifesto-display.ts` | `childObjectManifestoLine()` — `[relay]` prefix for lost-item child scans |
| `worker/src/resolver/scan-html.ts` | Scan UI (`pass-v8`) |
