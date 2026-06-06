/**
 * Canonical landing copy contract — single source of truth for Vitest + post-deploy verify.
 * Do not change without updating worker/tests/landing-copy-contract.test.ts and running
 * `npm run verify:landing`.
 *
 * @see docs/DEVICE_HUB_AND_LOCAL_SEARCH.md § Landing story
 */

/** Bump when hero / launch doors copy or structure changes intentionally. */
export const LANDING_COPY_CONTRACT_VERSION = 1;

export const LANDING_STYLES_CACHE_BUST = "152";

export const LANDING_REQUIRED_SNIPPETS = [
  "Public programmable objects",
  "The sticker stays.<br />The status changes.",
  'id="launch-doors"',
  "landing-launch-doors-list",
  "Three ways in",
  "Live status on something",
  "Live status on you",
  "Play the city game",
  "/create/?intent=deploy",
  "/shop/customize/?product=glitch_hoodie_v1",
  "/play/cedar-rapids/",
  "landing-hero-privacy",
  'id="landing-how-it-works-title"',
  'id="one-use-title">Live status objects',
  `styles.css?v=${LANDING_STYLES_CACHE_BUST}`,
];

/** Reverted matrix copy — must never return on `/`. */
export const LANDING_FORBIDDEN_SNIPPETS = [
  "Live state<br />on real objects.",
  'class="hc-emphasis-card__cta landing-hero-btn-primary"',
  "One use · status plate",
];

/** Launch doors must appear before How it works in document order. */
export const LANDING_SECTION_ORDER_MARKERS = [
  'id="launch-doors"',
  'id="landing-how-it-works-title"',
];
