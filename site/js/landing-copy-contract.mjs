/**
 * Canonical landing copy contract — single source of truth for Vitest + post-deploy verify.
 * Do not change without updating worker/tests/landing-copy-contract.test.ts and running
 * `npm run verify:landing`.
 *
 * @see docs/DEVICE_HUB_AND_LOCAL_SEARCH.md § Landing story
 */

/** Bump when hero / launch doors copy or structure changes intentionally. */
export const LANDING_COPY_CONTRACT_VERSION = 3;

export const LANDING_STYLES_CACHE_BUST = "152";

export const LANDING_REQUIRED_SNIPPETS = [
  "An internet for physical places and objects.",
  "Print once. Update from your phone.",
  "live network endpoints communities can run",
  'id="landing-try-live-object"',
  "Try a live object",
  "These are live scan pages running today.",
  "Studio door",
  "Open · Thu–Sun until 9 PM",
  "Lost item relay",
  "House keys relay",
  "Tool library",
  "Live object · current hours",
  "/c/r4YyNEWJvVwWNMETzXfGjFyL?q=qr_8w7zHCPHisXvTnar",
  "/c/isLDJtqFMk3Ti9XaHe26xf14?q=qr_BBGB3VF7pCX5gy8t",
  "/c/mht4JbKX7Q9L5owpNw9wnAC8?q=qr_3JNFm4wMGyrcm1e9",
  "A website is online. A live object is attached to a door, bench, hoodie, tool, or public",
  "Public programmable objects",
  "The sticker stays.<br />The status changes.",
  'id="landing-hero-primitive"',
  "The printed link stays the same. The public state can change",
  'id="landing-live-networks-title"',
  "Connected public networks",
  'id="launch-doors"',
  "landing-launch-doors-list",
  "Start here",
  "Explore a live place",
  "Add an object to the network",
  "Wear a live object",
  "/create/?intent=deploy",
  "/shop/customize/?product=glitch_hoodie_v1",
  "/play/cedar-rapids/",
  "landing-hero-privacy",
  'id="landing-how-it-works-title"',
  "How a live sticker works",
  "Signed state means the current public status was published by the object",
  'id="one-use-title">Start with one object',
  `styles.css?v=${LANDING_STYLES_CACHE_BUST}`,
];

/** Reverted matrix copy — must never return on `/`. */
export const LANDING_FORBIDDEN_SNIPPETS = [
  "Live state<br />on real objects.",
  'class="hc-emphasis-card__cta landing-hero-btn-primary"',
  "One use · status plate",
  "Three ways in",
  "Live status on something",
  "Live status on you",
  "Play the city game",
  "Wear live status",
  "Create public networks in the physical world",
  "today\u2019s signed state",
];

/** Narrative sections must appear in document order. */
export const LANDING_SECTION_ORDER_MARKERS = [
  'id="landing-try-live-object"',
  'id="landing-hero-primitive"',
  'id="landing-live-networks-title"',
  'id="launch-doors"',
  'id="landing-how-it-works-title"',
];
