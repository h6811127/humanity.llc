# Lost item relay pilot (Phase A vertical #2)

**Status:** Active pilot  
**Parent:** `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md`  
**Prerequisite:** M5 stranger loop (`docs/M5_STRANGER_TEST_RUNBOOK.md`)  
**Research:** `site/what-can-a-qr-do/lost-item-relay/`

---

## What it is

A **lost item relay** is a QR on keys, a bag, or a tag that answers one question when scanned:

> Is there a live return path for this item **right now**?

Not proof of ownership. Not a phone number printed in plain sight. Item name + return instructions the owner can **revoke** when recovered or abused.

---

## How to create one

1. Go to **https://humanity.llc/create/**
2. Choose **Lost item** under “Start from”
3. Fill in:
   - **Handle** — your card id (e.g. `keys_relay`)
   - **What is lost?** — headline on scan (e.g. `House keys`)
   - **What should finders see?** — return message (e.g. `Lost — contact owner through relay`)
4. Save recovery key on `/created/`, print QR, scan from another phone, revoke when recovered.

### Storage format (no new API field)

The resolver stores one `manifesto_line` with **two lines** and a line-1 prefix:

```text
[relay] House keys
Lost — contact owner through relay
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

Deploy Worker with `X-HC-Scan-UI: pass-v8` for this layout.

---

## Pilot checklist (5–10 real tags)

| Step | Pass? |
|------|-------|
| Stranger creates lost item relay unassisted | ☐ |
| Finder understands return path in &lt;30s | ☐ |
| Owner revokes after “found” and re-scan shows revoked | ☐ |
| Stranger answers “does scan prove holder?” correctly | ☐ |
| No phone number required on the printed tag | ☐ |

Score with `docs/M5_STRANGER_TEST_RUNBOOK.md`.

---

## Ethics (read before field test)

- **Do not** imply scan proves the holder is the owner.  
- **Do not** use scan analytics on crisis or lost-item pilots by default.  
- **Revoke** when recovered — a live relay after return is a liability.  
- Prefer coalition or owner-controlled copy review; humanity.llc ships the primitive.

---

## Related files

| Path | Role |
|------|------|
| `site/create/` | Lost item template |
| `site/js/create-card.mjs` | `[relay] ` prefix + `pilot_template` |
| `site/created/` | Lost item pilot tip |
| `worker/src/resolver/manifesto-display.ts` | Parse relay layout |
| `worker/src/resolver/scan-html.ts` | Scan UI (`pass-v8`) |
