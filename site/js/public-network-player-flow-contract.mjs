/**
 * Agent D player flow contract — discover → board → scan shell surfaces.
 * Single source for local Vitest + post-deploy production HTML verify.
 *
 * @see site/js/public-network-player-nav-core.mjs
 * @see npm run verify:public-network-player-flow:production
 */

import {
  PUBLIC_NETWORK_OPEN_BOARD_CTA,
  PUBLIC_NETWORKS_CATALOG_LABEL,
  PUBLIC_NETWORKS_CATALOG_PATH,
  PUBLIC_NETWORK_RULES_PROVE_CTA,
} from "./public-networks-portal-core.mjs";

/** Bump when player-flow shell copy or cross-links change intentionally. */
export const PLAYER_FLOW_CONTRACT_VERSION = 4;

/** Stale copy that must not return on player discovery surfaces. */
export const PLAYER_FLOW_FORBIDDEN_SNIPPETS = [
  "About Wake the City first",
  "All city games",
  'data-public-network-secondary="About this network"',
  "Open city board",
  "weekend city board",
];

/**
 * @typedef {{ path: string; label: string; required: string[]; forbidden?: string[] }} PlayerFlowPageCheck
 */

/** @type {PlayerFlowPageCheck[]} */
export const PLAYER_FLOW_PAGE_CHECKS = [
  {
    path: "/",
    label: "Home",
    required: [
      'href="/play/season/"',
      "See all listed public networks",
      'href="/play/cedar-rapids/#rules-prove-title"',
      PUBLIC_NETWORK_RULES_PROVE_CTA,
      'id="public-networks-results"',
      "public-networks-portal.mjs?v=10",
    ],
  },
  {
    path: "/play/season/",
    label: "Public networks catalog",
    required: [
      "player-flow-breadcrumb",
      "<h1>Find public networks</h1>",
      'id="public-networks-search"',
      'id="public-networks-results"',
      "Home dashboard",
      "not live networks",
      "public-networks-portal.mjs?v=10",
    ],
    forbidden: ['>About this network</a>'],
  },
  {
    path: "/play/cedar-rapids/",
    label: "Rules charter",
    required: [
      "player-flow-breadcrumb",
      'href="/play/season/">Public networks</a>',
      PUBLIC_NETWORKS_CATALOG_LABEL,
      'href="/play/cedar-rapids/map/">Open public state board</a>',
      'id="rules-prove-title"',
      PUBLIC_NETWORK_RULES_PROVE_CTA,
      "city-game-rules-player-footnote",
      'href="/discover/cedar-rapids-iowa/"',
      "Browse places near me",
      "Home dashboard",
      "player-flow-field-walk.html",
    ],
    forbidden: ["weekend city board"],
  },
  {
    path: "/play/cedar-rapids/map/",
    label: "Network board shell",
    required: [
      "player-flow-breadcrumb",
      "Wake the city board",
      'id="city-game-map-first-visit-mount"',
      'id="city-game-map-root"',
      "city-game-map-page.mjs?v=5",
      `href="${PUBLIC_NETWORKS_CATALOG_PATH}"`,
      PUBLIC_NETWORKS_CATALOG_LABEL,
      'href="/discover/cedar-rapids-iowa/"',
      "Browse places near me",
    ],
  },
  {
    path: "/discover/cedar-rapids-iowa/",
    label: "Discover region browse",
    required: [
      "player-flow-breadcrumb",
      "discovery-region-player-footnote",
      'href="/play/cedar-rapids/map/">Open board</a>',
      'href="/play/cedar-rapids/#rules-prove-title"',
      `href="${PUBLIC_NETWORKS_CATALOG_PATH}"`,
    ],
  },
  {
    path: "/discover/",
    label: "Discover hub",
    required: [
      "<h1>Browse live places</h1>",
      "Listed regions",
      `href="${PUBLIC_NETWORKS_CATALOG_PATH}"`,
      "Home dashboard",
      "discovery-regions-hub.mjs",
    ],
  },
  {
    path: "/play/cedar-rapids/comprehension/",
    label: "C2 comprehension hub",
    required: [
      "noindex,nofollow",
      "GT comprehension",
      "player-flow-field-walk.html",
      "PD-1–PD-5",
      "gt8-field-walk.html",
    ],
  },
  {
    path: "/play/cedar-rapids/comprehension/player-flow-field-walk.html",
    label: "Player flow field walk",
    required: [
      "noindex,nofollow",
      "Agent D · Player flow field walk",
      "PD-1",
      "PD-5",
      PUBLIC_NETWORK_RULES_PROVE_CTA,
      PUBLIC_NETWORK_OPEN_BOARD_CTA,
      "/play/cedar-rapids/map/",
      "/play/season/",
    ],
  },
];

/** Local static sources keyed by production path (Vitest only). */
export const PLAYER_FLOW_LOCAL_HTML_BY_PATH = {
  "/": "site/index.html",
  "/play/season/": "site/play/season/index.html",
  "/play/cedar-rapids/": "site/play/cedar-rapids/index.html",
  "/play/cedar-rapids/map/": "site/play/cedar-rapids/map/index.html",
  "/discover/cedar-rapids-iowa/": "site/discover/cedar-rapids-iowa/index.html",
  "/discover/": "site/discover/index.html",
  "/play/cedar-rapids/comprehension/": "site/play/cedar-rapids/comprehension/index.html",
  "/play/cedar-rapids/comprehension/player-flow-field-walk.html":
    "site/play/cedar-rapids/comprehension/player-flow-field-walk.html",
};
