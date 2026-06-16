/**
 * Canonical landing copy contract — single source of truth for Vitest + post-deploy verify.
 * Do not change without updating worker/tests/landing-copy-contract.test.ts and running
 * `npm run verify:landing`.
 *
 * @see docs/DEVICE_HUB_AND_LOCAL_SEARCH.md § Landing story
 */

/** Bump when hero / discovery dashboard copy or structure changes intentionally. */
export const LANDING_COPY_CONTRACT_VERSION = 6;

export const LANDING_STYLES_CACHE_BUST = "157";

export const LANDING_REQUIRED_SNIPPETS = [
  "Check what's true right now before you knock, pick up, or show up.",
  "Current public truth on real doors, tags, and places",
  'id="landing-entry-shelves"',
  "Live now",
  "Open or paused",
  "Return, relay, hours",
  'id="landing-shelf-live-now"',
  'id="landing-shelf-open-paused"',
  'id="landing-shelf-return-hours"',
  "Search live places and boards",
  'id="public-networks-search"',
  "Public live boards",
  'id="public-networks-results"',
  "About Wake the City",
  "reference public network",
  'id="landing-start-object-cta"',
  "Start with one live object",
  'href="/create/"',
  "landing-trust-chips",
  "No account",
  "Community-run boards",
  "No scan surveillance",
  "No scan trails",
  "No behavioral dossiers",
  "The sticker stays — the status changes.",
  'id="landing-learn-trust"',
  "public-networks-portal.css?v=6",
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
  "An internet for physical places and objects.",
  'id="landing-try-live-object"',
  "Try a live object",
  'id="launch-doors"',
  "landing-launch-doors-list",
  "Start here",
  "Explore a live place",
  "Wear a live object",
  'id="founder-note-title"',
  "Why humanity.llc?",
  'id="landing-merch-preview-title"',
  "landing-final-cta",
  "<h1>Find public networks</h1>",
  "Listed networks",
  "Search public networks",
  "Community-run networks",
  "Open public networks that expose live places",
];

/** Narrative sections must appear in document order. */
export const LANDING_SECTION_ORDER_MARKERS = [
  "Check what's true right now before you knock, pick up, or show up.",
  'id="landing-entry-shelves"',
  'id="public-networks-search"',
  'id="public-networks-results"',
  'id="landing-start-object-cta"',
];
