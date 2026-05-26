# Device Hub Intro Coachmark

**Status:** Implemented  
**Owners:** Device shell UX  
**Primary files:** `site/js/device-hub-intro-coachmark.mjs`, `site/js/device-status.mjs`, `site/css/device-shell.css`, `site/css/theme-dark.css`  
**Related:** `docs/STATUS_INDICATOR_STEWARD_GREEN.md`, `docs/DEVICE_INBOX.md`, `docs/UI_COLOR_SCHEME_STANDARD.md`

---

## Goal

Guide first-time users to the status dot (`#brand-status-dot-btn`) and explain that it opens the device hub.

This is a **single-run onboarding cue**, not a persistent tooltip.

---

## UX behavior

### Show conditions

Coachmark can show only when all are true:

- Hub exists (`#device-hub`)
- Not on `/wallet/` (`body.page-wallet` false)
- Status graph load did not fail (`#top-chrome` has no `data-device-status-error`)
- Hub sheet is closed
- Inbox sheet is closed
- User has **not dismissed** intro (`localStorage.hc_device_hub_intro_dismissed !== "1"`)
- User has **not seen** intro before (`localStorage.hc_device_hub_intro_seen !== "1"`)

### Hide / stop conditions

- User taps **Got it**
- User opens the hub from the status dot
- Escape key while coachmark is visible
- Hub/inbox opens or page state no longer matches show conditions

### Returning-user contract

The intro must not reappear for returning users once it has shown at least once.

Implementation keys:

- `hc_device_hub_intro_seen`: set to `"1"` when coachmark is rendered visible
- `hc_device_hub_intro_dismissed`: set to `"1"` when user explicitly dismisses or opens hub

This prevents repeat popups on refresh for users who already encountered it.

---

## Visual contract

- Anchored under status cluster with caret pointing to dot
- Copy:
  - Eyebrow: `Welcome`
  - Title: `Meet your device hub`
  - Body: `One tap on the status dot opens everything saved on this device—cards, keys, and notices.`
  - CTA hint: `Tap the dot above`
  - Button: `Got it`
- Uses shared popover surface tokens from `docs/UI_COLOR_SCHEME_STANDARD.md` for light/dark contrast

---

## QA checklist

Manual runbook: [`DEVICE_OS_QA.md`](DEVICE_OS_QA.md) **P1-4**. Automated: `e2e/device-status-dot.spec.ts` (hub intro coachmark).

1. Clear keys:
   - `localStorage.removeItem("hc_device_hub_intro_seen")`
   - `localStorage.removeItem("hc_device_hub_intro_dismissed")`
2. Load landing page with status dot.
3. Verify intro appears once.
4. Refresh without interacting: intro does **not** appear again (`seen` gate).
5. Clear `seen`, then open hub from dot: intro does not return (`dismissed` gate).
6. Verify no intro on `/wallet/`.
7. Verify dark mode contrast on intro panel/button text.

---

## Notes

- If intro repeatedly appears, first inspect storage values:
  - `localStorage.getItem("hc_device_hub_intro_seen")`
  - `localStorage.getItem("hc_device_hub_intro_dismissed")`
- Private browsing/storage restrictions may change persistence behavior per browser.
