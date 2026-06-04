## Summary

<!-- What changed and why (1–3 sentences) -->

## Surface area

<!-- Check all that apply -->

- [ ] Device shell (status dot, hub, inbox, boot)
- [ ] Wallet / hub saved cards
- [ ] `/created/` workspace
- [ ] Scan page / live proof
- [ ] Merch / shop
- [ ] Worker / resolver API
- [ ] Docs only

## Regression (required before merge)

**Desk belt (all PRs — CI runs fast; you run full before merge):**

```bash
npm run verify:desk:fast    # matches CI (Vitest + verify exits + build)
npm run verify:desk         # before merge: adds core Playwright E2E
```

Optional flags: `npm run verify:desk -- --custody` · `npm run verify:desk -- --city-game` · `npm run verify:desk -- --full`

**WS-QUALITY:** Core-loop PRs only — see [`docs/CORE_PRODUCT_LOOP.md`](../docs/CORE_PRODUCT_LOOP.md). Avoid new city-game nodes / Signal War / custody C1 unless fixing an **L1–L8** row.

Surface-specific blocks below if you touched only one area. See [`docs/PRODUCT_WORKSTREAM_COORDINATION.md`](../docs/PRODUCT_WORKSTREAM_COORDINATION.md).

**Device shell (status graph):**

```bash
npm run worker:test -- worker/tests/device-status-shell-modules.test.ts
npm run e2e -- e2e/device-status-dot.spec.ts e2e/device-inbox.spec.ts
```

**Ownership restore / `/created/`:**

```bash
npm run ownership-restore:verify
```

**Live proof / scan:**

```bash
npm run e2e:live-control-loop
```

**Landing `/` (hero + launch doors):**

```bash
npm run verify:landing
npm run e2e:landing-copy
```

Do **not** change `site/index.html` hero without updating `site/js/landing-copy-contract.mjs` and tests.

**Merch funnel:**

```bash
npm run merch-funnel:verify-exit:fast
```

**Hub card Safari / wallet:**

```bash
npm run hub-card-disappeared:verify:fast
```

**Steward handoff / PWA vouch:**

```bash
npm run steward-scan-handoff:verify:fast
```

**Safari keys / WebKit:**

```bash
npm run e2e:safari-keys-persistence
npm run e2e:scan-page-dot
npm run e2e:key-loss-sad-path
```

See [`docs/SAFARI_KEYS_CUSTODY.md`](../docs/SAFARI_KEYS_CUSTODY.md) for full regression list.

**Card disabled since visit:**

```bash
npm run worker:test:card-disabled-since-visit
```

**User-visible copy changed:**

```bash
npm run worker:test:comprehension
```

## Invariants

- [ ] I read [`docs/SYSTEM_INVARIANTS.md`](../docs/SYSTEM_INVARIANTS.md) for my surface
- [ ] I checked [`docs/PRODUCT_WORKSTREAM_COORDINATION.md`](../docs/PRODUCT_WORKSTREAM_COORDINATION.md) active branches — no duplicate work
- [ ] If I touched the status module graph: bumped `DEVICE_SHELL_ASSET_VERSION` and updated `DEVICE_STATUS_SHELL_JS_FILES`
- [ ] If I bumped `DEVICE_SHELL_ASSET_VERSION`: ran `npm run site:build-meta` and committed `site/js/build-meta.mjs`
- [ ] No new investigation doc (invariants → `SYSTEM_INVARIANTS.md` or canonical spec)

## Test results

<!-- Paste command output or "N/A — docs only" -->
