# Landing progress strip

**Status:** Retired (removed from `/` May 2026)  
**Reason:** The inset four-step walkthrough duplicated the hero **Create** CTA and the **How it works** strip, competed visually with real product UI (hub, `/created/` setup wizard), and still read as a broken stepper despite the legend + Continue refactor. Returning stewards already get focus mode, hub notices, and wallet deeplinks.

**Preserved elsewhere:**

| Need | Where |
|------|--------|
| Stranger → create | Hero **Create a live object** → `/create/` |
| Public loop (print → scan → verify) | **How it works** on `/` |
| Steward custody (save → print → manage) | Device hub + `/created/` setup wizard |
| Setup hash deeplinks (`#setup`, `#setup-qr`) | `site/js/created-setup-hash.mjs` · `worker/tests/created-setup-hash.test.ts` |

---

## Historical spec (Phases 1–2, May 2026)

The sections below document the shipped-then-removed contract for archaeology. Do not reintroduce the UI without a fresh UX review.

### Problem (original)

The inset **“Your first live object in four steps”** block looked like a **step wizard** but behaved inconsistently when four peer links mostly opened `/wallet/`. Phase 1–2 replaced that with a read-only legend + single **Continue** CTA driven by `resolveLandingContinue()` in `landing-progress-core.mjs`.

### Product decision (original)

> Teach the steward custody journey and offer one honest “continue” action from browser-local state.

That job is now covered by hub + card workspace without a homepage wizard.

### Shipped files (removed)

| Path | Was |
|------|-----|
| `site/index.html` | `.landing-progress` nav |
| `site/js/landing-progress-core.mjs` | `resolveLandingContinue()` |
| `site/js/landing-progress.mjs` | DOM apply |
| `site/styles.css` | `.landing-progress-*` |
| `worker/tests/landing-progress.test.ts` | Resolver unit tests |
| `e2e/landing-progress.spec.ts` | Playwright |

### Tests (current)

```bash
npm run worker:test:created-setup-hash
```

Manual **P1-LP** in `docs/DEVICE_OS_QA.md` is retired with the strip.

---

## Changelog

| Date | Note |
|------|------|
| May 2026 | Spec + Phase 1–2: legend + Continue; deeplinks to `/created/` hashes. |
| May 2026 | **Retired:** strip removed from `/`; core module and landing e2e deleted. Setup hash tests kept. |
