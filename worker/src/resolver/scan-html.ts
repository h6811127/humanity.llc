import { PRINT_ARTIFACT_NO_CALENDAR_EXPIRY_NOTE } from "./merch-qr-policy";
import type { ScanViewModel } from "./scan-state";
import {
  parseManifestoDisplay,
  resolveScanHeroDisplay,
} from "./manifesto-display";
import {
  findScanCapability,
  gameContributeModeFromCapability,
  isScanCapabilityAvailable,
  readHeroTemplate,
  shouldShowLiveControlTrustGroup,
  shouldShowCardTrustGroup,
  shouldShowHumanTrustGroup,
  shouldShowQrTrustGroup,
} from "../live-object/scan-capabilities";
import { publicReasonLabel } from "./revocation-display";
import { scanListIcon, type ScanIconId } from "./scan-icons";
import { BEARER_WARNING, OBJECT_PUBLIC_SNAPSHOT_LIMIT, OBJECT_STREAMS_LIMIT, AI_EXPLAIN_LIMIT } from "./trust-copy";
import { buildPublicObjectSnapshot } from "./object-snapshot";
import { SCAN_PASS_CSS } from "./scan-pass-styles";
import { scanLiveControlClientHelpersJs } from "./scan-live-control-client-helpers";
import {
  humanTrustDisplay,
  humanTrustListIcon,
} from "./verification-display";
import { governanceProcessUrls, originFromScanUrl } from "./scan-governance";
import { pagesJsOrigin, scanPageOrigin, type ScanPageOriginEnv } from "../http/resolver";
import { SCAN_OFFLINE_BANNER_TEXT } from "./scan-offline";
import {
  renderScanFreshnessBannerMarkup,
  renderScanFreshnessBannerScript,
  scanFreshnessForViewModel,
} from "./scan-freshness-banner";
import {
  GAME_CONTRIBUTE_LEAD,
  GAME_CONTRIBUTE_FIRST_SCAN_NOTE,
  GAME_CONTRIBUTE_PROGRESS_LABEL,
  GAME_CONTRIBUTE_SITE_CODE_LABEL,
  GAME_CONTRIBUTE_SUBMIT_LABEL,
  GAME_FRAGMENT_CONTRIBUTE_LEAD,
  GAME_FRAGMENT_CONTRIBUTE_SUBMIT_LABEL,
  GAME_CAPTURE_CONTRIBUTE_LEAD,
  GAME_CAPTURE_CONTRIBUTE_SUBMIT_LABEL,
  GAME_CAPTURE_REINFORCE_SUBMIT_LABEL,
  GAME_CAPTURE_FACTION_LABEL,
  GAME_CAPTURE_HELD_LABEL,
  GAME_PLEDGE_EYEBROW,
  GAME_PLEDGE_LEAD,
  GAME_PLEDGE_PRIVACY_NOTE,
  GAME_PLEDGE_SUBMIT_LABEL,
  GAME_SCARCITY_CONTRIBUTE_LEAD,
  GAME_SCARCITY_CONTRIBUTE_PROGRESS_LABEL,
  GAME_SCARCITY_CONTRIBUTE_SUBMIT_LABEL,
  GAME_NODE_SCAN_FOOT,
  GAME_NODE_SCAN_PRIVACY_NOTE,
  gameNodeContributeEyebrow,
  gameScanNextActionLine,
  type GameNodeScanContext,
} from "../city-game/scan-view";
import {
  factionControllerLabel,
  factionRelayStatusLabel,
  isGameFactionHold,
} from "../city-game/factions";
import {
  seasonWindowChip,
  seasonWindowOnboardingStatus,
  seasonWindowScanNote,
} from "../city-game/season-window";
import {
  gameScanPrivacyTagline,
  seasonBoardPathWithNode,
} from "../city-game/season-config";
import { resolveSeasonById } from "../city-game/season-loader";
import {
  credentialCodeFromScanUrl,
  deriveCredentialCodeSync,
} from "../../../site/js/qr-credential-code.mjs";
import {
  isChildObjectScope,
  qrNoCalendarExpirySubtitle,
  qrScopeRelationshipCopy,
  qrTrustGroupScopeSubtitle,
} from "../../../site/js/object-taxonomy-core.mjs";
import {
  LIVE_CONTROL_ASK_LABEL,
  LIVE_CONTROL_PROOF_EXPIRED_STATUS,
  LIVE_CONTROL_REQUEST_EXPIRED_STATUS,
  LIVE_CONTROL_SCANNER_LEAD,
  LIVE_CONTROL_SUCCESS_COPY,
  LIVE_CONTROL_SUCCESS_TITLE,
  SCAN_LIMITS_DISCLOSURE_TITLE,
  VOUCH_EXPLAINER_EYEBROW,
  VOUCH_EXPLAINER_INITIAL_COPY,
  VOUCH_EXPLAINER_TITLE,
  SCAN_OWNER_RESTORE_CTA_LABEL,
  SCAN_OWNER_RESTORE_CTA_HINT,
} from "../../../site/js/device-ownership-copy-core.mjs";
import {
  buildScanOwnerRestoreCreatedUrl,
  isScanOwnerRestoreCtaEligible,
} from "../../../site/js/scan-owner-restore-cta-core.mjs";
import { renderScanQrMarkup } from "./scan-qr";
import {
  EMPTY_SCAN_SAFETY,
  renderHeroStatusStrip,
  renderSafetyChips,
  renderScanSafetyHeaderScript,
  SCAN_HERO_LIVE_OBJECT_FOOT,
  SCAN_HERO_META_DETAILS_SUMMARY,
  SCAN_HERO_QR_DETAILS_SUMMARY,
  LOST_ITEM_RELAY_CREATE_HINT,
  LOST_ITEM_RELAY_CREATE_PATH,
  LOST_ITEM_OFFER_EYEBROW,
  LOST_ITEM_OFFER_FIELD_LABEL,
  LOST_ITEM_OFFER_LEAD,
  LOST_ITEM_OFFER_PRIVACY_NOTE,
  LOST_ITEM_OFFER_SUBMIT_LABEL,
  MERCH_SCAN_CREATE_PATH,
  MERCH_SCAN_CUSTOMIZE_PATH,
  MERCH_SCAN_FUNNEL_HINT,
  MERCH_SCAN_FUNNEL_REF,
  SCAN_SAFETY_RESOLVER_VERIFIED_COPY,
  type ScanSafetyModel,
} from "./scan-safety";
import { SCAN_PAGE_THEME_BOOTSTRAP } from "./scan-page-theme";
import {
  scanMalformedLead,
  scanMalformedPageTitle,
} from "./scan-malformed-hint";

function scanHeroDisplay(vm: ScanViewModel) {
  return resolveScanHeroDisplay({
    manifestoLine: vm.manifestoLine,
    qrScope: vm.qrScope,
    childObjectType: vm.childObjectType,
    childPublicLabel: vm.childPublicLabel,
    childPublicState: vm.childPublicState,
  });
}

function gameNodeMutedCopy(
  vm: ScanViewModel,
  gameNode: GameNodeScanContext
): string {
  const archive = findScanCapability(vm.capabilities, "archive");
  if (archive?.state === "care_pause") {
    return `<p class="scan-game-care-note" role="note">Game bulletins are muted while maintenance is live on the care stream.</p>`;
  }
  if (archive?.state === "season_not_open" || archive?.state === "season_ended") {
    const season = resolveSeasonById(gameNode.seasonId);
    const note = seasonWindowScanNote(gameNode.seasonWindowPhase, season ?? undefined);
    return note
      ? `<p class="scan-game-dormant-note" role="note">${escapeHtml(note)}</p>`
      : "";
  }
  if (archive?.state === "dormant") {
    return `<p class="scan-game-dormant-note" role="note">This temporary object is dormant. The QR still resolves — public state only.</p>`;
  }
  if (gameNode.vouchGate && !gameNode.vouchGate.met) {
    return `<p class="scan-game-vouch-note" role="note">Trust path still waiting on ${escapeHtml(gameNode.vouchGate.pending.join(", "))} — cooperation with nearby places opens the deeper route.</p>`;
  }
  return "";
}

/** Response header  -  confirms pass-card scan UI (not legacy .block layout). */
export const SCAN_UI_VERSION = "pass-v41";

/**
 * Public scan UI  -  flippable pass card (landing) + iOS grouped trust blocks below (spec §7).
 */
export async function renderScanPage(
  vm: ScanViewModel,
  origin: string,
  safety: ScanSafetyModel = EMPTY_SCAN_SAFETY,
  request?: Request,
  originEnv?: ScanPageOriginEnv
): Promise<string> {
  const pageOrigin = scanPageOrigin(origin, request, originEnv);
  const title = pageTitle(vm);
  const freshness = scanFreshnessForViewModel(vm);
  let qrMarkup = "";
  if (vm.scanUrl) {
    try {
      qrMarkup = await renderScanQrMarkup(vm.scanUrl);
    } catch {
      qrMarkup = "";
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="color-scheme" content="light dark" />
  <meta name="theme-color" content="#ffffff" />
  <title>${escapeHtml(title)} · humanity.llc</title>
  <meta name="description" content="${escapeHtml(scanLead(vm))}" />
  <link rel="icon" href="${escapeHtml(pageOrigin)}/assets/red_qr_transparent_bg.png" type="image/png" />
  ${SCAN_PAGE_THEME_BOOTSTRAP}
  <style>${SCAN_PASS_CSS}</style>
</head>
<body>
  <div class="page scan-page">
    ${renderScanPageChrome(pageOrigin)}
    <div class="scan-cross-tab-banner" id="scan-cross-tab-banner" role="status" hidden></div>
    <div class="scan-steward-preview-return" id="scan-steward-preview-return" hidden>
      <a id="scan-steward-preview-return-link" class="scan-steward-preview-return-link" href="#">Back</a>
    </div>
    <p class="scan-offline-banner" id="scan-offline-banner" role="status" hidden>${escapeHtml(SCAN_OFFLINE_BANNER_TEXT)}</p>
    <p class="scan-truth-unverified-banner" id="scan-truth-unverified-banner" role="alert" hidden></p>
    ${renderScanFreshnessBannerMarkup(freshness)}
    <main class="screen scan-screen">
      ${renderScanHeroSection(vm, safety, pageOrigin, qrMarkup)}
      ${renderScanActorBand(vm, pageOrigin)}
      ${renderScanPostHeroTrust(vm, safety, pageOrigin)}
      ${renderFooter(vm, pageOrigin)}
    </main>
  </div>
  ${renderScanTabKeysScript(vm, pageOrigin, request, originEnv)}
  ${renderLiveControlScript(vm, pageOrigin, request)}
  ${renderVouchIssuanceScript(vm, pageOrigin, request, originEnv)}
  ${renderQrFallbackScript(pageOrigin, vm.scanUrl)}
  ${renderScanOfflineBannerScript()}
  ${renderScanFreshnessBannerScript()}
  ${renderScanSafetyHeaderScript()}
  ${renderScanLiveCheckArriveScript(pageOrigin, request, originEnv)}
  ${renderScanActorBandScript(vm, pageOrigin, request, originEnv)}
  ${renderScanAiExplainScript(vm, pageOrigin, request, originEnv)}
  ${renderScanMerchFunnelScript(pageOrigin, request, originEnv)}
  ${renderScanGameContributeScript(vm, pageOrigin, request, originEnv)}
  ${renderScanGamePledgeScript(vm, pageOrigin, request, originEnv)}
  ${renderScanLostItemOfferScript(vm, pageOrigin, request, originEnv)}
  ${renderScanOwnerRestoreCtaScript(vm, pageOrigin, request, originEnv)}
  ${renderScanStewardPreviewReturnScript(pageOrigin, request, originEnv)}
</body>
</html>`;
}

/** Tag hero body blocks for staggered data-arriving reveal. */
function tagScanArriveItems(main: string): string {
  const hidden = "scan-arrive-item scan-arrive-item--hidden";
  return main
    .replace(/<h1 class="/g, `<h1 class="${hidden} `)
    .replace(/<p class="/g, `<p class="${hidden} `)
    .replace(/<ul class="/g, `<ul class="${hidden} `);
}

/** Flow 2 F2-2: disclose stale resolver HTML when the browser is offline. */
function renderScanOfflineBannerScript(): string {
  return `<script>
(function () {
  var el = document.getElementById("scan-offline-banner");
  if (!el) return;
  function apply() {
    el.hidden = navigator.onLine !== false;
  }
  apply();
  window.addEventListener("online", apply);
  window.addEventListener("offline", apply);
})();
</script>`;
}

/** Client fallback  -  same encoder as /created/ (`qr-render.mjs`). Never use brand PNG. */
function renderQrFallbackScript(
  origin: string,
  scanUrl: string | null
): string {
  if (!scanUrl) return "";
  const mod = JSON.stringify(`${origin}/js/qr-render.mjs?v=5`);
  return `<script type="module">
import { renderQrToImage } from ${mod};
var slot = document.getElementById("pass-qr-slot");
if (slot && !slot.querySelector("svg") && slot.dataset.scanUrl) {
  var img = document.createElement("img");
  img.alt = "QR code for this card scan link";
  slot.prepend(img);
  renderQrToImage(img, slot.dataset.scanUrl).catch(function () {});
}
</script>`;
}

/**
 * In-card host label only (Phase 8.4) — brand dot lives in page chrome, not here.
 * @see docs/SCAN_PAGE_DEVICE_DOT.md Phase 4
 */
function renderScanHeroHost(): string {
  return `<p class="scan-hero-host scan-hero-wordmark" translate="no">humanity.llc</p>`;
}

/** Page chrome: status dot only (docs/M3_SCAN_PAGE_UI.md Phase 7; progressive dot Phase 8). */
function renderScanPageChrome(origin: string): string {
  const home = `${escapeHtml(origin)}/`;
  return `<div class="scan-page-chrome">
  <div class="scan-page-status-cluster">
    <a class="scan-page-dot" id="scan-page-dot-btn" href="${home}" aria-label="humanity.llc home">
      <span class="pass-dot" id="scan-page-dot" aria-hidden="true"></span>
    </a>
    <div class="scan-page-dot-glance" id="scan-page-dot-glance" role="dialog" aria-label="Your device on this scan" hidden>
      <div class="scan-page-dot-explainer" id="scan-page-dot-explainer" aria-live="polite"></div>
      <a class="scan-page-dot-home" id="scan-page-dot-home" href="${home}">humanity.llc home</a>
    </div>
  </div>
</div>`;
}

function isGameNodeOnboardingScan(vm: ScanViewModel): boolean {
  return Boolean(vm.gameNode?.enabled && vm.gameNode.mode !== "fallback");
}

/** Game-first onboarding band — city-game nodes only (scan front door). */
function renderGameNodeOnboardingBand(
  vm: ScanViewModel,
  gameNode: GameNodeScanContext
): string {
  const season = resolveSeasonById(gameNode.seasonId);
  const rulesPath = season?.rules_path?.trim() || "/play/season/";
  const boardPath =
    seasonBoardPathWithNode(rulesPath, gameNode.nodeId) ??
    `${rulesPath.replace(/\/?$/, "/")}map/`;
  const identity = season?.title?.trim() || "Wake the city · Signal War";
  const { display } = scanHeroDisplay(vm);
  const locationName =
    display.kind === "status_plate"
      ? display.objectLabel
      : vm.manifestoLine?.split("\n")[0]?.trim() ?? "Game node";
  const stateLine =
    display.kind === "status_plate"
      ? display.statusLine
      : vm.manifestoLine?.split("\n").slice(1).join(" ").trim() ?? "";
  const seasonStatus = seasonWindowOnboardingStatus(
    gameNode.seasonWindowPhase,
    season ?? undefined
  );
  const consequence = gameNode.coopHint?.trim() ?? stateLine;
  const contributeCap = findScanCapability(vm.capabilities, "contribute");
  const nextAction = gameScanNextActionLine(gameNode, {
    contributeAvailable: Boolean(contributeCap?.available && contributeCap),
    pledgeAvailable: gameNode.showsPledge,
  });
  const tagline = gameScanPrivacyTagline(season);
  const stateBlock = stateLine && stateLine !== consequence
    ? `<p class="scan-game-onboarding-state">${escapeHtml(stateLine)}</p>`
    : "";
  return `<section class="scan-game-onboarding" aria-labelledby="scan-game-onboarding-heading">
  <p class="scan-game-onboarding-identity">${escapeHtml(identity)}</p>
  <p class="scan-game-onboarding-season">${escapeHtml(seasonStatus)}</p>
  <h1 class="scan-game-onboarding-location" id="scan-game-onboarding-heading">${escapeHtml(locationName)}</h1>
  <p class="scan-game-onboarding-role">${escapeHtml(gameNode.roleEyebrow)}</p>
  ${stateBlock}
  ${consequence ? `<p class="scan-game-onboarding-consequence" role="note">${escapeHtml(consequence)}</p>` : ""}
  <p class="scan-game-onboarding-next">${escapeHtml(nextAction)}</p>
  <div class="scan-game-onboarding-actions" role="navigation" aria-label="City game next steps">
    <a class="scan-game-onboarding-cta scan-game-onboarding-cta--primary" href="${escapeHtml(boardPath)}">Open city board</a>
    <a class="scan-game-onboarding-cta scan-game-onboarding-cta--secondary" href="${escapeHtml(rulesPath)}">Season rules</a>
  </div>
  <p class="scan-game-privacy-tagline" role="note">${escapeHtml(tagline)}</p>
</section>`;
}

function renderGameNodeCollapsedState(
  vm: ScanViewModel,
  gameNode: GameNodeScanContext
): string {
  const season = resolveSeasonById(gameNode.seasonId);
  const streams = renderObjectStreamsBlock(vm.objectStreams);
  const steward = renderStewardStrip(vm);
  const metaChips = renderGameNodeMetaChips(gameNode, season ?? undefined);
  const muted = gameNodeMutedCopy(vm, gameNode);
  const parts = [muted, streams, metaChips, steward].filter(Boolean);
  if (!parts.length) return "";
  return `<details class="scan-game-state-details">
  <summary class="scan-game-state-summary">Live object details</summary>
  <div class="scan-game-state-panel">
${parts.join("\n")}
  </div>
</details>`;
}

function renderScanHeroFootBlock(vm: ScanViewModel, foot: string): string {
  if (isGameNodeOnboardingScan(vm)) {
    return `<p class="scan-hero-foot">${escapeHtml(GAME_NODE_SCAN_FOOT)}</p>
  <p class="scan-game-privacy-note" role="note">${escapeHtml(GAME_NODE_SCAN_PRIVACY_NOTE)}</p>`;
  }
  return foot ? `<p class="scan-hero-foot">${escapeHtml(foot)}</p>` : "";
}

function renderScanPostHeroTrust(
  vm: ScanViewModel,
  safety: ScanSafetyModel,
  origin: string
): string {
  const blocks = [
    renderScanTrustModules(vm, safety),
    renderLimitsSettings(vm, origin),
    renderTrustGroups(vm, origin),
    renderScanUrlControl(vm),
  ]
    .filter(Boolean)
    .join("\n");
  if (!blocks) return "";
  if (isGameNodeOnboardingScan(vm)) {
    return `<details class="scan-game-trust-details">
  <summary class="scan-game-trust-summary">Trust &amp; privacy</summary>
  <div class="scan-game-trust-panel">
${blocks}
  </div>
</details>`;
  }
  return blocks;
}

function renderScanHeroSection(
  vm: ScanViewModel,
  safety: ScanSafetyModel,
  origin: string,
  qrMarkup: string
): string {
  const { main: rawMain, foot } = buildScanHeroMain(vm, origin);
  const main = tagScanArriveItems(rawMain);
  const profileAttr = vm.profileId
    ? ` data-profile-id="${escapeHtml(vm.profileId)}"`
    : "";
  const qrAttr = vm.qrId ? ` data-qr-id="${escapeHtml(vm.qrId)}"` : "";
  const scanActiveAttr = vm.kind === "active" ? ` data-scan-active="1"` : "";
  const ssrKindAttr = ` data-ssr-scan-kind="${escapeHtml(vm.kind)}"`;
  const merchFunnelAttr = isMerchFunnelScan(vm) ? ` data-merch-funnel="1"` : "";
  const objectAttr = vm.childObjectId
    ? ` data-object-id="${escapeHtml(vm.childObjectId)}"`
    : "";
  const contributeCap = findScanCapability(vm.capabilities, "contribute");
  const contributeMode = gameContributeModeFromCapability(contributeCap);
  const gameContributeAttr =
    contributeCap?.available && contributeMode && vm.gameNode
      ? ` data-game-contribute="1" data-game-contribute-mode="${escapeHtml(contributeMode)}" data-season-id="${escapeHtml(vm.gameNode.seasonId)}"`
      : "";
  const lostItemOfferAttr = isScanCapabilityAvailable(vm.capabilities, "offer")
    ? ` data-lost-item-offer="1"`
    : "";
  const resolverRow = safety.objectSignatureVerified
    ? `<p class="scan-safety-resolver scan-arrive-item scan-arrive-item--hidden">${escapeHtml(SCAN_SAFETY_RESOLVER_VERIFIED_COPY)}</p>`
    : "";
  const chipsBlock = isGameNodeOnboardingScan(vm)
    ? ""
    : renderScanHeroMetaDetails(vm, safety);
  const footBlock = renderScanHeroFootBlock(vm, foot);
  const lostItemCreateHint =
    isScanCapabilityAvailable(vm.capabilities, "offer")
      ? renderLostItemCreateHint(origin)
      : "";
  const merchFunnelHint = isMerchFunnelScan(vm) ? renderMerchFunnelHint(origin) : "";
  const gameContributeBlock = renderGameContributeBlock(vm);
  const gamePledgeBlock = vm.gameNode ? renderGamePledgeBlock(vm.gameNode) : "";
  const gamePledgeAttr =
    vm.gameNode?.showsPledge
      ? ` data-game-pledge="1" data-season-id="${escapeHtml(vm.gameNode.seasonId)}"`
      : "";
  const lostItemOfferBlock = renderLostItemOfferBlock(vm);
  const ownerRestoreCta = renderScanOwnerRestoreCta(vm, origin);
  const qrBlock = scanHeroQrBlock(vm, qrMarkup);
  const qrSection = qrBlock
    ? `<details class="scan-hero-qr-details">
  <summary class="scan-hero-qr-summary">${escapeHtml(SCAN_HERO_QR_DETAILS_SUMMARY)}</summary>
  ${qrBlock}
</details>`
    : "";

  return `<div class="scan-pass-layer">
<article class="scan-hero scan-status-panel scan-safety-header scan-live-check--pending" id="scan-safety-header" aria-label="Live check"${profileAttr}${qrAttr}${ssrKindAttr}${objectAttr}${scanActiveAttr}${merchFunnelAttr}${gameContributeAttr}${gamePledgeAttr}${lostItemOfferAttr}>
  <header class="scan-hero-head">
    ${renderScanHeroHost()}
    ${renderHeroStatusStrip(vm)}
  </header>
  <div class="scan-hero-body">
    ${main}
  </div>
  ${resolverRow}
  <p class="scan-hero-limit scan-arrive-limits scan-arrive-limits--hidden" role="note">${escapeHtml(BEARER_WARNING)}</p>
  ${chipsBlock}
  <p class="scan-safety-first-seen" id="scan-safety-first-seen" hidden></p>
  ${footBlock}
  ${gameContributeBlock}
  ${gamePledgeBlock}
  ${lostItemOfferBlock}
  ${lostItemCreateHint}
  ${merchFunnelHint}
  ${ownerRestoreCta}
  ${qrSection}
</article>
</div>`;
}

function renderScanHeroMetaDetails(
  vm: ScanViewModel,
  safety: ScanSafetyModel
): string {
  const chips = renderSafetyChips(vm, safety);
  if (!chips) return "";
  return `<details class="scan-hero-meta-details scan-arrive-item scan-arrive-item--hidden">
  <summary class="scan-hero-meta-summary">${escapeHtml(SCAN_HERO_META_DETAILS_SUMMARY)}</summary>
  ${chips}
</details>`;
}

function scanHeroQrBlock(vm: ScanViewModel, qrMarkup: string): string {
  if (!vm.scanUrl) return "";
  const qrSlotAttr = ` id="pass-qr-slot" data-scan-url="${escapeHtml(vm.scanUrl)}"`;
  const codeLine = renderCredentialCodeLine(credentialCodeForVm(vm));
  return `<div class="scan-hero-qr pass-qr scan-status-qr"${qrSlotAttr}>${qrMarkup}${codeLine}</div>`;
}

function credentialCodeForVm(vm: ScanViewModel): string | null {
  if (vm.scanUrl) {
    return credentialCodeFromScanUrl(vm.scanUrl);
  }
  if (vm.profileId && vm.qrId) {
    try {
      return deriveCredentialCodeSync(vm.profileId, vm.qrId);
    } catch {
      return null;
    }
  }
  return null;
}

function renderCredentialCodeLine(code: string | null): string {
  if (!code) return "";
  return `<p class="pass-credential-code mono" aria-label="Credential code for print verification">${escapeHtml(code)}</p>`;
}

function scanStatusMetaLine(vm: ScanViewModel): string {
  const parts: string[] = [];
  if (vm.handle) parts.push(`@${vm.handle}`);
  if (vm.profileId) parts.push(`${vm.profileId.slice(0, 14)}…`);
  return parts.join(" · ");
}

function formatQrExpiryLabel(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(t));
}

function renderStewardStrip(
  vm: ScanViewModel,
  opts: { omitHandle?: boolean } = {}
): string {
  const parts: string[] = [];
  if (vm.handle && !opts.omitHandle) {
    const relationship = qrScopeRelationshipCopy({
      scope: vm.qrScope,
      handle: vm.handle,
    });
    if (relationship) parts.push(relationship);
  }
  const expiry =
    isChildObjectScope(vm.qrScope)
      ? null
      : formatQrExpiryLabel(vm.qrExpiresAt);
  if (expiry && vm.kind === "active") {
    parts.push(`Valid until ${expiry}`);
  }
  if (!parts.length) return "";
  return `<p class="scan-hero-steward">${escapeHtml(parts.join(" · "))}</p>`;
}

function renderGovernanceProcessLinks(origin: string): string {
  const links = governanceProcessUrls(origin);
  return `<p class="scan-governance-links">Read the <a href="${escapeHtml(links.data_policy_url)}">operator data policy</a> and <a href="${escapeHtml(links.architecture_url)}">architecture overview</a> for published suspension rules. If this is your card, you can <a href="${escapeHtml(links.appeal_url)}">appeal the suspension</a>.</p>`;
}

function renderObjectStreamsBlock(
  streams: ScanViewModel["objectStreams"]
): string {
  if (!streams?.length) return "";
  const items = streams
    .map(
      (stream) =>
        `<li class="scan-object-stream">
  <span class="scan-object-stream-label">${escapeHtml(stream.label)}</span>
  <span class="scan-object-stream-value">${escapeHtml(stream.value)}</span>
</li>`
    )
    .join("\n");
  return `<ul class="scan-object-streams" aria-label="Object details">
${items}
</ul>
<p class="scan-object-streams-limit" role="note">${escapeHtml(OBJECT_STREAMS_LIMIT)}</p>`;
}

function renderPublicSnapshotBlock(
  manifestoLine: string | null,
  streams: ScanViewModel["objectStreams"]
): string {
  const snapshot = buildPublicObjectSnapshot(manifestoLine, streams ?? []);
  if (!snapshot) return "";
  const snapshotJson = JSON.stringify(snapshot).replace(/</g, "\\u003c");
  return `<section class="scan-public-snapshot" aria-labelledby="scan-public-snapshot-label" data-public-snapshot="${escapeHtml(snapshotJson)}">
  <p class="scan-public-snapshot-label" id="scan-public-snapshot-label">Signed snapshot</p>
  <p class="scan-public-snapshot-text">${escapeHtml(snapshot.text)}</p>
  <p class="scan-public-snapshot-limit" role="note">${escapeHtml(OBJECT_PUBLIC_SNAPSHOT_LIMIT)}</p>
  <button type="button" class="scan-ai-explain-btn" id="scan-ai-explain-btn">Explain in plain language</button>
  <div class="scan-ai-explain-panel" id="scan-ai-explain-panel" hidden>
    <p class="scan-ai-explain-label">Plain-language help</p>
    <p class="scan-ai-explain-text" id="scan-ai-explain-text"></p>
    <p class="scan-ai-explain-limit" role="note">${escapeHtml(AI_EXPLAIN_LIMIT)}</p>
  </div>
</section>`;
}

function renderLostItemCreateHint(origin: string): string {
  const href = `${origin.replace(/\/$/, "")}${LOST_ITEM_RELAY_CREATE_PATH}`;
  return `<p class="scan-create-hint" role="note"><a href="${escapeHtml(href)}">Create a lost-item tag</a> — ${escapeHtml(LOST_ITEM_RELAY_CREATE_HINT)}</p>`;
}

function renderLostItemOfferBlock(vm: ScanViewModel): string {
  if (
    !isScanCapabilityAvailable(vm.capabilities, "offer") ||
    !vm.profileId ||
    !vm.childObjectId
  ) {
    return "";
  }

  return `<section class="scan-lost-item-offer" id="scan-lost-item-offer" aria-labelledby="scan-lost-item-offer-label">
  <p class="scan-lost-item-offer-eyebrow">${escapeHtml(LOST_ITEM_OFFER_EYEBROW)}</p>
  <p class="scan-lost-item-offer-lead" id="scan-lost-item-offer-label">${escapeHtml(LOST_ITEM_OFFER_LEAD)}</p>
  <label class="scan-lost-item-offer-field-label" for="scan-lost-item-offer-message">${escapeHtml(LOST_ITEM_OFFER_FIELD_LABEL)}</label>
  <textarea class="scan-lost-item-offer-input" id="scan-lost-item-offer-message" name="message" rows="3" maxlength="280" autocomplete="off" spellcheck="true" placeholder="Where you found it and how to reach you — no account needed"></textarea>
  <p class="scan-lost-item-offer-note">${escapeHtml(LOST_ITEM_OFFER_PRIVACY_NOTE)}</p>
  <button type="button" class="scan-lost-item-offer-cta" id="scan-lost-item-offer-submit">${escapeHtml(LOST_ITEM_OFFER_SUBMIT_LABEL)}</button>
  <div class="scan-lost-item-offer-status-panel" id="scan-lost-item-offer-status-panel" hidden>
    <p class="scan-lost-item-offer-status" id="scan-lost-item-offer-status" aria-live="polite"></p>
  </div>
</section>`;
}

function renderGameNodeMetaChips(
  gameNode: GameNodeScanContext,
  season?: ReturnType<typeof resolveSeasonById>,
  opts: { omitVouch?: boolean } = {}
): string {
  const chips: string[] = [];
  const meta = gameNode.gameMeta;
  const windowChip = seasonWindowChip(gameNode.seasonWindowPhase, season ?? undefined);
  if (windowChip) chips.push(windowChip);

  if (gameNode.mode === "care_pause") {
    chips.push("Maintenance pause — care stream wins");
  }
  if (gameNode.mode === "dormant" && !windowChip) {
    chips.push("Object dormant — window ended");
  }
  if (meta.compromised) {
    chips.push("Compromised relay — rekey pending");
  }
  if (
    gameNode.nodeRole === "relay_gate" &&
    meta.held_by_faction &&
    isGameFactionHold(meta.held_by_faction)
  ) {
    chips.push(`Relay · ${factionRelayStatusLabel(meta.held_by_faction)}`);
  }
  if (meta.collective_target != null && meta.collective_progress != null) {
    chips.push(
      `Collective ${meta.collective_progress}/${meta.collective_target}`
    );
  }
  if (meta.scarcity_remaining != null) {
    chips.push(`${meta.scarcity_remaining} passes remaining`);
  }
  if (meta.fragment_id) {
    chips.push(`Fragment ${meta.fragment_id}`);
  }
  if (meta.unlocked_by.length) {
    chips.push(`Unlocked by ${meta.unlocked_by.join(", ")}`);
  }
  if (!opts.omitVouch) {
    if (gameNode.vouchGate) {
      if (gameNode.vouchGate.met) {
        chips.push(
          `Witness vouch live · ${gameNode.vouchGate.satisfied.join(", ")}`
        );
      } else if (gameNode.vouchGate.pending.length) {
        chips.push(
          `Vouch pending from ${gameNode.vouchGate.pending.join(", ")}`
        );
      }
    } else if (meta.vouch_requires.length) {
      chips.push(`Vouch required from ${meta.vouch_requires.join(", ")}`);
    }
  }
  if (!chips.length) return "";
  const items = chips
    .map(
      (chip) =>
        `<li class="scan-game-chip">${escapeHtml(chip)}</li>`
    )
    .join("\n");
  return `<ul class="scan-game-chips" aria-label="Game state">${items}</ul>`;
}

function renderGamePledgeBlock(gameNode: GameNodeScanContext): string {
  if (!gameNode.showsPledge) return "";
  const hqFaction = gameNode.pledgeFaction?.trim().toLowerCase();
  const factionOptions = ["red", "blue", "green", "yellow"] as const;
  const options = factionOptions
    .map((id) => {
      const selected = hqFaction === id ? " selected" : "";
      const label = id.charAt(0).toUpperCase() + id.slice(1);
      return `<option value="${escapeHtml(id)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join("\n    ");
  return `<section class="scan-game-pledge" id="scan-game-pledge" aria-labelledby="scan-game-pledge-label" data-season-id="${escapeHtml(gameNode.seasonId)}">
  <p class="scan-game-pledge-eyebrow">${escapeHtml(GAME_PLEDGE_EYEBROW)}</p>
  <p class="scan-game-pledge-lead" id="scan-game-pledge-label">${escapeHtml(GAME_PLEDGE_LEAD)}</p>
  <label class="scan-game-pledge-field-label" for="scan-game-pledge-faction">Faction</label>
  <select class="scan-game-contribute-input scan-game-contribute-select" id="scan-game-pledge-faction" name="pledge_faction">
    <option value="">Choose faction</option>
    ${options}
  </select>
  <p class="scan-game-pledge-note">${escapeHtml(GAME_PLEDGE_PRIVACY_NOTE)}</p>
  <button type="button" class="scan-game-contribute-cta" id="scan-game-pledge-submit">${escapeHtml(GAME_PLEDGE_SUBMIT_LABEL)}</button>
  <p class="scan-game-pledge-status" id="scan-game-pledge-status" hidden aria-live="polite"></p>
</section>`;
}

function renderGameContributeBlock(vm: ScanViewModel): string {
  const gameNode = vm.gameNode;
  const contributeCap = findScanCapability(vm.capabilities, "contribute");
  const contributeMode = gameContributeModeFromCapability(contributeCap);
  if (
    !contributeCap?.available ||
    !contributeMode ||
    !gameNode ||
    !vm.profileId ||
    !vm.childObjectId
  ) {
    return "";
  }

  const meta = gameNode.gameMeta;
  const progress = meta.collective_progress ?? 0;
  const target = meta.collective_target ?? 0;
  const isFragment = contributeMode === "fragment";
  const isScarcity = contributeMode === "scarcity";
  const isCapture = contributeMode === "capture" || contributeMode === "reinforce";
  const eyebrow = gameNodeContributeEyebrow(contributeMode, gameNode.district);
  const lead = isScarcity
    ? GAME_SCARCITY_CONTRIBUTE_LEAD
    : isFragment
      ? GAME_FRAGMENT_CONTRIBUTE_LEAD
      : isCapture
        ? GAME_CAPTURE_CONTRIBUTE_LEAD
        : GAME_CONTRIBUTE_LEAD;
  const submitLabel = isScarcity
    ? GAME_SCARCITY_CONTRIBUTE_SUBMIT_LABEL
    : isFragment
      ? GAME_FRAGMENT_CONTRIBUTE_SUBMIT_LABEL
      : isCapture
        ? GAME_CAPTURE_CONTRIBUTE_SUBMIT_LABEL
        : GAME_CONTRIBUTE_SUBMIT_LABEL;
  const progressBlock = isFragment
    ? ""
    : isCapture
      ? `<p class="scan-game-contribute-progress">
    <span class="scan-game-contribute-progress-label">${escapeHtml(GAME_CAPTURE_HELD_LABEL)}</span>
    <span class="scan-game-contribute-progress-value" id="scan-game-contribute-progress">${escapeHtml(factionControllerLabel(meta.held_by_faction))}${meta.held_until ? ` · until ${escapeHtml(meta.held_until.slice(0, 16).replace("T", " "))}` : ""}</span>
  </p>`
    : isScarcity
      ? `<p class="scan-game-contribute-progress">
    <span class="scan-game-contribute-progress-label">${escapeHtml(GAME_SCARCITY_CONTRIBUTE_PROGRESS_LABEL)}</span>
    <span class="scan-game-contribute-progress-value" id="scan-game-contribute-progress">${escapeHtml(String(meta.scarcity_remaining ?? 0))}</span>
  </p>`
      : `<p class="scan-game-contribute-progress">
    <span class="scan-game-contribute-progress-label">${escapeHtml(GAME_CONTRIBUTE_PROGRESS_LABEL)}</span>
    <span class="scan-game-contribute-progress-value" id="scan-game-contribute-progress">${escapeHtml(String(progress))} / ${escapeHtml(String(target))}</span>
  </p>`;
  const firstScanNote =
    !isFragment && !isScarcity
      ? `<p class="scan-game-contribute-note">${escapeHtml(GAME_CONTRIBUTE_FIRST_SCAN_NOTE)}</p>`
      : "";
  const sectionClass = isScarcity
    ? " scan-game-contribute--scarcity"
    : isFragment
      ? " scan-game-contribute--fragment"
      : isCapture
        ? " scan-game-contribute--capture"
        : "";
  const placeholder =
    gameNode.contributeSiteCodePlaceholder?.trim() || "From backing card";

  const factionBlock = isCapture
    ? `<label class="scan-game-contribute-field-label" for="scan-game-contribute-faction">${escapeHtml(GAME_CAPTURE_FACTION_LABEL)}</label>
  <select class="scan-game-contribute-input scan-game-contribute-select" id="scan-game-contribute-faction" name="faction">
    <option value="">Choose faction</option>
    <option value="red">Red</option>
    <option value="blue">Blue</option>
    <option value="green">Green</option>
    <option value="yellow">Yellow</option>
  </select>
  <div class="scan-game-contribute-actions">
    <button type="button" class="scan-game-contribute-cta" id="scan-game-contribute-submit" data-relay-action="capture">${escapeHtml(submitLabel)}</button>
    <button type="button" class="scan-game-contribute-cta scan-game-contribute-cta--secondary" id="scan-game-contribute-reinforce" data-relay-action="reinforce">${escapeHtml(GAME_CAPTURE_REINFORCE_SUBMIT_LABEL)}</button>
  </div>`
    : `<button type="button" class="scan-game-contribute-cta" id="scan-game-contribute-submit">${escapeHtml(submitLabel)}</button>`;

  return `<section class="scan-game-contribute${sectionClass}" id="scan-game-contribute" aria-labelledby="scan-game-contribute-label">
  <p class="scan-game-contribute-eyebrow">${escapeHtml(eyebrow)}</p>
  <p class="scan-game-contribute-lead" id="scan-game-contribute-label">${escapeHtml(lead)}</p>
  ${progressBlock}
  ${firstScanNote}
  <label class="scan-game-contribute-field-label" for="scan-game-contribute-code">${escapeHtml(GAME_CONTRIBUTE_SITE_CODE_LABEL)}</label>
  <input class="scan-game-contribute-input" id="scan-game-contribute-code" name="site_code" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="32" placeholder="${escapeHtml(placeholder)}" />
  ${factionBlock}
  <div class="scan-game-contribute-status-panel" id="scan-game-contribute-status-panel" hidden>
    <p class="scan-game-contribute-status" id="scan-game-contribute-status" aria-live="polite"></p>
  </div>
</section>`;
}

function buildGameNodeScanHero(vm: ScanViewModel): { main: string; foot: string } {
  const gameNode = vm.gameNode!;
  return {
    main: `${renderGameNodeOnboardingBand(vm, gameNode)}
    ${renderGameNodeCollapsedState(vm, gameNode)}`,
    foot: GAME_NODE_SCAN_FOOT,
  };
}

/** Active live-object / print_artifact scans — curiosity path to create + customize (M8 merch funnel). */
function renderChildTimePolicyNote(vm: ScanViewModel): string {
  const note = vm.childTimePolicy?.scanNote;
  if (!note) return "";
  return `<p class="scan-game-dormant-note scan-time-policy-note" role="note">${escapeHtml(note)}</p>`;
}

function renderChildCustodyBlock(vm: ScanViewModel): string {
  const custody = vm.childCustody;
  if (!custody || custody.phase === "unset") return "";
  const parts: string[] = [];
  if (custody.scanLine) {
    parts.push(
      `<p class="scan-custody-line" role="note">${escapeHtml(custody.scanLine)}</p>`
    );
  }
  if (custody.scanNote) {
    parts.push(
      `<p class="scan-custody-note" role="note">${escapeHtml(custody.scanNote)}</p>`
    );
  }
  return parts.join("\n    ");
}

function isMerchFunnelScan(vm: ScanViewModel): boolean {
  if (vm.kind !== "active") return false;
  if (vm.gameNode?.enabled && vm.gameNode.mode !== "fallback") return false;
  const readTemplate = readHeroTemplate(vm.capabilities);
  if (readTemplate === "status_plate" || readTemplate === "lost_item_relay") {
    return false;
  }
  if (vm.qrScope === "print_artifact") return true;
  return readTemplate === "live_object";
}

function renderMerchFunnelHint(origin: string): string {
  const base = origin.replace(/\/$/, "");
  const createHref = `${base}${MERCH_SCAN_CREATE_PATH}`;
  const customizeHref = `${base}${MERCH_SCAN_CUSTOMIZE_PATH}`;
  return `<p class="scan-create-hint scan-merch-hint" role="note"><a href="${escapeHtml(createHref)}">Create your live object</a> · <a href="${escapeHtml(customizeHref)}">Get yours on wear</a> — ${escapeHtml(MERCH_SCAN_FUNNEL_HINT)}</p>`;
}

/** print_artifact scans — owner path to /created/#restore (docs/SCAN_PAGE_OWNER_RESTORE_CTA.md). */
function renderScanOwnerRestoreCta(vm: ScanViewModel, origin: string): string {
  if (
    !isScanOwnerRestoreCtaEligible({
      kind: vm.kind,
      qrScope: vm.qrScope,
      profileId: vm.profileId,
    })
  ) {
    return "";
  }
  const href = buildScanOwnerRestoreCreatedUrl(
    origin,
    vm.profileId!,
    vm.qrId ?? undefined
  );
  return `<p class="scan-owner-restore-cta" id="scan-owner-restore-cta" role="note" data-scan-owner-restore="1">
  <a href="${escapeHtml(href)}">${escapeHtml(SCAN_OWNER_RESTORE_CTA_LABEL)}</a>
  — ${escapeHtml(SCAN_OWNER_RESTORE_CTA_HINT)}
</p>`;
}

function renderScanOwnerRestoreCtaScript(
  vm: ScanViewModel,
  origin: string,
  request?: Request,
  originEnv?: ScanPageOriginEnv
): string {
  if (
    !isScanOwnerRestoreCtaEligible({
      kind: vm.kind,
      qrScope: vm.qrScope,
      profileId: vm.profileId,
    })
  ) {
    return "";
  }
  const assetOrigin = pagesJsOrigin(origin, request, originEnv);
  const mod = JSON.stringify(`${assetOrigin}/js/scan-owner-restore-cta.mjs?v=1`);
  return `<script type="module" src=${mod}></script>`;
}

function buildScanHeroMain(
  vm: ScanViewModel,
  origin: string
): { main: string; foot: string } {
  if (vm.kind === "card_suspended") {
    const title = vm.handle
      ? `@${escapeHtml(vm.handle)}`
      : "Card suspended";
    return {
      main: `<p class="scan-hero-eyebrow">Scan result</p>
    <h1 class="scan-hero-title">${title}</h1>
    <p class="scan-hero-sub">${escapeHtml(scanLead(vm))}</p>
    ${renderGovernanceProcessLinks(origin)}`,
      foot: "Suspension is a network governance action under published rules.",
    };
  }

  if (vm.minimalScan) {
    const headline = minimalScanHeadline(vm.kind);
    return {
      main: `<p class="scan-hero-eyebrow">Scan result</p>
    <h1 class="scan-hero-title">${escapeHtml(headline)}</h1>
    <p class="scan-hero-sub">${escapeHtml(scanLead(vm))}</p>`,
      foot: "This is network state for a QR, not proof of who is holding it.",
    };
  }

  if (
    !vm.minimalScan &&
    (vm.kind === "qr_revoked" || vm.kind === "card_revoked")
  ) {
    const headline = minimalScanHeadline(vm.kind);
    const title = vm.handle
      ? `@${escapeHtml(vm.handle)}`
      : escapeHtml(headline);
    const statusLine = vm.handle
      ? `<p class="scan-hero-line">${escapeHtml(headline)}</p>`
      : "";
    const manifesto =
      vm.manifestoLine && vm.handle
        ? `<p class="scan-hero-sub">${escapeHtml(vm.manifestoLine)}</p>`
        : "";
    const meta = scanStatusMetaLine(vm);
    return {
      main: `<p class="scan-hero-eyebrow">Scan result</p>
    <h1 class="scan-hero-title">${title}</h1>
    ${statusLine}
    ${manifesto}
    ${meta ? `<p class="scan-hero-meta">${escapeHtml(meta)}</p>` : ""}
    <p class="scan-hero-sub">${escapeHtml(scanLead(vm))}</p>`,
      foot: "Holding a printed object does not prove ownership.",
    };
  }

  const isError =
    vm.kind !== "active" &&
    !vm.kind.startsWith("qr_") &&
    !vm.kind.startsWith("card_");

  if (isError) {
    return {
      main: `<p class="scan-hero-eyebrow">Scan result</p>
    <h1 class="scan-hero-title">${escapeHtml(vm.primaryBadge.label)}</h1>
    <p class="scan-hero-sub">${escapeHtml(scanLead(vm))}</p>`,
      foot: "This page shows resolver state only.",
    };
  }

  const { display } = scanHeroDisplay(vm);
  const readTemplate = readHeroTemplate(vm.capabilities);

  if (vm.gameNode?.enabled && vm.gameNode.mode !== "fallback") {
    return buildGameNodeScanHero(vm);
  }

  if (readTemplate === "status_plate" && display.kind === "status_plate") {
    const steward = renderStewardStrip(vm);
    const streams = renderObjectStreamsBlock(vm.objectStreams);
    const snapshot = renderPublicSnapshotBlock(vm.manifestoLine, vm.objectStreams);
    const timePolicyNote = renderChildTimePolicyNote(vm);
    const custodyBlock = renderChildCustodyBlock(vm);
    return {
      main: `<h1 class="scan-hero-title">${escapeHtml(display.objectLabel)}</h1>
    <p class="scan-hero-line">${escapeHtml(display.statusLine)}</p>
    ${custodyBlock}
    ${timePolicyNote}
    ${streams}
    ${snapshot}
    ${steward}`,
      foot: "Scan shows current status for this place - not who owns the door.",
    };
  }

  if (readTemplate === "lost_item_relay" && display.kind === "lost_item_relay") {
    const meta = scanStatusMetaLine(vm);
    const steward = renderStewardStrip(vm);
    const timePolicyNote = renderChildTimePolicyNote(vm);
    const custodyBlock = renderChildCustodyBlock(vm);
    return {
      main: `<p class="scan-hero-eyebrow">Lost item relay</p>
    <h1 class="scan-hero-title">${escapeHtml(display.objectLabel)}</h1>
    <p class="scan-hero-line">${escapeHtml(display.statusLine)}</p>
    ${custodyBlock}
    ${timePolicyNote}
    ${meta ? `<p class="scan-hero-meta">${escapeHtml(meta)}</p>` : ""}
    ${steward}`,
      foot: "This scan does not prove who holds the item.",
    };
  }

  if (readTemplate === "live_object") {
    const line =
      display.kind === "general" && display.line
        ? display.line
        : "Live on the network";
    const steward = renderStewardStrip(vm);
    const streams = renderObjectStreamsBlock(vm.objectStreams);
    const snapshot = renderPublicSnapshotBlock(vm.manifestoLine, vm.objectStreams);
    return {
      main: `<h1 class="scan-hero-title">${escapeHtml(line)}</h1>
    ${streams}
    ${snapshot}
    ${steward}`,
      foot: SCAN_HERO_LIVE_OBJECT_FOOT,
    };
  }

  const title = vm.handle ? `@${escapeHtml(vm.handle)}` : "Unknown card";
  const manifesto =
    display.kind === "general" && display.line
      ? `<p class="scan-hero-line">${escapeHtml(display.line)}</p>`
      : "";
  const pills = renderTrustPills(vm);
  const pillsBlock = pills
    ? `<ul class="scan-hero-trust" aria-label="Status at a glance">${pills}</ul>`
    : "";
  const steward = renderStewardStrip(vm, { omitHandle: true });
  return {
    main: `<h1 class="scan-hero-title">${title}</h1>
    ${manifesto}
    ${pillsBlock}
    ${steward}`,
    foot: "Scan shows current card state at scan time.",
  };
}

/** Zone D below hero — what this scan shows (limits live in `renderLimitsSettings`). */
function renderScanTrustModules(
  vm: ScanViewModel,
  safety: ScanSafetyModel
): string {
  if (vm.kind !== "active" || vm.minimalScan) return "";
  const proves = renderScanProvesModule(vm, safety);
  if (!proves) return "";
  return `<div class="scan-trust-modules scan-trust-layer">${proves}</div>`;
}

function renderScanProvesModule(
  vm: ScanViewModel,
  safety: ScanSafetyModel
): string {
  const items: string[] = [];
  if (vm.kind === "active") {
    items.push("Live status returned from humanity.llc at scan time");
  }
  if (safety.objectSignatureVerified) {
    items.push(SCAN_SAFETY_RESOLVER_VERIFIED_COPY);
  }
  if (vm.profileId && vm.qrId) {
    items.push("Revocable per card and per printed-item QR on the network");
  }
  if (!items.length) return "";
  const rows = items
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  return `<section class="scan-proves" aria-label="What this scan shows">
  <h2 class="scan-module-label">What this scan shows</h2>
  <ul class="scan-proves-list">${rows}</ul>
</section>`;
}

function minimalScanHeadline(kind: ScanViewModel["kind"]): string {
  switch (kind) {
    case "qr_revoked":
      return "This QR is no longer valid";
    case "qr_expired":
      return "This QR has expired";
    case "card_revoked":
      return "This card has been disabled";
    default:
      return "Scan result";
  }
}

function renderMinimalPassFront(
  vm: ScanViewModel,
  badgeClass: string
): string {
  const headline = minimalScanHeadline(vm.kind);
  return `<div class="pass-head">
  <div class="pass-brand">
    <span class="pass-dot" aria-hidden="true"></span>
    <span>humanity.llc</span>
  </div>
  <span class="${badgeClass}">${escapeHtml(vm.primaryBadge.label)}</span>
</div>
<p class="pass-type">Scan result</p>
<h1 class="pass-name">${escapeHtml(headline)}</h1>
<p class="pass-manifesto">${escapeHtml(scanLead(vm))}</p>`;
}

function renderScanUrlControl(vm: ScanViewModel): string {
  if (!vm.scanUrl) return "";
  const codeLine = vm.credentialCode
    ? `<p class="scan-credential-code">Credential code on print: <strong class="mono">${escapeHtml(vm.credentialCode)}</strong> — compare with the sticker or status JSON.</p>`
    : "";
  return `<details class="scan-show-link">
  <summary class="scan-show-link-summary">Show link</summary>
  <p class="pass-scan-url mono">${escapeHtml(vm.scanUrl)}</p>
  ${codeLine}
</details>`;
}

function renderRevokedTombstoneFront(
  vm: ScanViewModel,
  badgeClass: string
): string {
  const headline = minimalScanHeadline(vm.kind);
  const handleLine = vm.handle
    ? `<h1 class="pass-name">@${escapeHtml(vm.handle)}</h1>`
    : `<h1 class="pass-name">${escapeHtml(headline)}</h1>`;
  const statusLine = vm.handle
    ? `<p class="pass-manifesto pass-manifesto-status">${escapeHtml(headline)}</p>`
    : "";
  const manifesto =
    vm.manifestoLine && vm.handle
      ? `<p class="pass-manifesto">${escapeHtml(vm.manifestoLine)}</p>`
      : "";
  return `<div class="pass-head">
  <div class="pass-brand">
    <span class="pass-dot" aria-hidden="true"></span>
    <span>humanity.llc</span>
  </div>
  <span class="${badgeClass}">${escapeHtml(vm.primaryBadge.label)}</span>
</div>
<div class="pass-body">
  <div class="pass-main">
    <p class="pass-type">Scan result</p>
    ${handleLine}
    ${statusLine}
    ${manifesto}
    <p class="pass-manifesto">${escapeHtml(scanLead(vm))}</p>
  </div>
</div>`;
}

function renderPassFront(
  vm: ScanViewModel,
  badgeClass: string,
  qrMarkup: string
): string {
  if (
    !vm.minimalScan &&
    (vm.kind === "qr_revoked" || vm.kind === "card_revoked")
  ) {
    return renderRevokedTombstoneFront(vm, badgeClass);
  }

  const isError =
    vm.kind !== "active" &&
    !vm.kind.startsWith("qr_") &&
    !vm.kind.startsWith("card_");

  if (isError) {
    return `<div class="pass-head">
  <div class="pass-brand">
    <span class="pass-dot" aria-hidden="true"></span>
    <span>humanity.llc</span>
  </div>
  <span class="${badgeClass}">${escapeHtml(vm.primaryBadge.label)}</span>
</div>
<p class="pass-type">Scan result</p>
<h1 class="pass-name">${escapeHtml(vm.primaryBadge.label)}</h1>
<p class="pass-manifesto">${escapeHtml(scanLead(vm))}</p>`;
  }

  const display = parseManifestoDisplay(vm.manifestoLine);
  const handleMuted = vm.handle
    ? `<p class="pass-handle-muted">@${escapeHtml(vm.handle)}</p>`
    : "";
  const qrSlotAttr = vm.scanUrl
    ? ` id="pass-qr-slot" data-scan-url="${escapeHtml(vm.scanUrl)}"`
    : "";
  const qrBlock = vm.scanUrl
    ? `<div class="pass-qr"${qrSlotAttr}>${qrMarkup}</div>`
    : "";

  if (display.kind === "status_plate") {
    const passFoot =
      "Scan shows current status for this place - not who owns the door.";
    return `<div class="pass-head">
  <div class="pass-brand">
    <span class="pass-dot" aria-hidden="true"></span>
    <span>humanity.llc</span>
  </div>
  <span class="${badgeClass}">${escapeHtml(vm.primaryBadge.label)}</span>
</div>
<div class="pass-body">
  <div class="pass-main">
    <p class="pass-type">Status plate</p>
    <h1 class="pass-name">${escapeHtml(display.objectLabel)}</h1>
    <p class="pass-manifesto pass-manifesto-status">${escapeHtml(display.statusLine)}</p>
    ${handleMuted}
    <ul class="pass-trust" aria-label="Status at a glance">
      ${renderTrustPills(vm)}
    </ul>
  </div>
  ${qrBlock}
</div>
<p class="pass-foot">${escapeHtml(passFoot)}</p>`;
  }

  if (display.kind === "lost_item_relay") {
    const passFoot =
      "This scan does not prove who holds the item. It only shows whether the return relay is active.";
    return `<div class="pass-head">
  <div class="pass-brand">
    <span class="pass-dot" aria-hidden="true"></span>
    <span>humanity.llc</span>
  </div>
  <span class="${badgeClass}">${escapeHtml(vm.primaryBadge.label)}</span>
</div>
<div class="pass-body">
  <div class="pass-main">
    <p class="pass-type">Lost item relay</p>
    <h1 class="pass-name">${escapeHtml(display.objectLabel)}</h1>
    <p class="pass-manifesto pass-manifesto-status">${escapeHtml(display.statusLine)}</p>
    ${handleMuted}
    <ul class="pass-trust" aria-label="Status at a glance">
      ${renderTrustPills(vm)}
    </ul>
  </div>
  ${qrBlock}
</div>
<p class="pass-foot">${escapeHtml(passFoot)}</p>`;
  }

  const passFoot =
    "Scan shows live state. Holding the object does not prove ownership.";

  const handle = vm.handle ? `@${escapeHtml(vm.handle)}` : "Unknown card";
  const manifesto = vm.manifestoLine
    ? `<p class="pass-manifesto">${escapeHtml(vm.manifestoLine)}</p>`
    : "";

  return `<div class="pass-head">
  <div class="pass-brand">
    <span class="pass-dot" aria-hidden="true"></span>
    <span>humanity.llc</span>
  </div>
  <span class="${badgeClass}">${escapeHtml(vm.primaryBadge.label)}</span>
</div>
<div class="pass-body">
  <div class="pass-main">
    <p class="pass-type">Live object</p>
    <h1 class="pass-name">${handle}</h1>
    ${manifesto}
    <ul class="pass-trust" aria-label="Status at a glance">
      ${renderTrustPills(vm)}
    </ul>
  </div>
  ${qrBlock}
</div>
<p class="pass-foot">${escapeHtml(passFoot)}</p>`;
}

/** Back  -  status hints only; limits live in settings row below the card. */
function renderPassBack(origin: string): string {
  return `<div class="pass-back-accent" aria-hidden="true"></div>
<div class="pass-back-inner">
  <div class="pass-head">
    <div class="pass-brand">
      <span class="pass-dot" aria-hidden="true"></span>
      <span>At scan time</span>
    </div>
    <span class="pass-badge badge-neutral">Flip</span>
  </div>
  <ul class="pass-back-grid" aria-label="Network facts">
    <li>
      <span class="pass-back-label">Live</span>
      <span class="pass-back-value">status from the operator, not a frozen page</span>
    </li>
    <li>
      <span class="pass-back-label">Revocable</span>
      <span class="pass-back-value">per card and per printed-item QR</span>
    </li>
  </ul>
  <p class="pass-foot pass-foot-muted">Limits: open “What this scan does not prove” below.</p>
</div>`;
}

/** Spec §7 / roadmap §7  -  separate grouped blocks below the card. */
function renderTrustGroups(vm: ScanViewModel, origin: string): string {
  const sections: string[] = [];

  if (shouldShowCardTrustGroup(vm.capabilities)) {
    pushTrustGroup(sections, "Card status", cardGroupRows(vm), "card", vm);
  }

  if (shouldShowHumanTrustGroup(vm.capabilities)) {
    pushTrustGroup(sections, "Human trust", humanGroupRows(vm), "human", vm);
  }

  if (shouldShowQrTrustGroup(vm.capabilities)) {
    pushTrustGroup(sections, "This QR", qrGroupRows(vm), "qr", vm);
  }

  if (shouldShowLiveControlTrustGroup(vm.capabilities)) {
    pushTrustGroup(sections, "Live control", liveControlGroupRows(vm), "live", vm);
  }

  if (vm.kind === "active" && vm.profileId && shouldShowHumanTrustGroup(vm.capabilities)) {
    const vouch = renderVouchSection(vm, origin);
    if (vouch.trim()) sections.push(vouch);
  }

  if (!sections.length) return "";

  return `<section class="scan-trust-tools" aria-labelledby="scan-trust-tools-heading">
  <header class="scan-trust-tools-head">
    <h2 id="scan-trust-tools-heading" class="scan-trust-tools-title">Check at scan time</h2>
    <p class="scan-trust-tools-lead">Open a row for card, human trust, this QR, or live control.</p>
  </header>
  <div class="scan-trust-stack" aria-label="Trust details at scan time">
${sections.join("\n")}
  </div>
</section>`;
}

function pushTrustGroup(
  sections: string[],
  label: string,
  rows: string,
  mod: string,
  vm: ScanViewModel
): void {
  if (!rows.trim()) return;
  const icon = trustGroupIcon(mod, vm);
  sections.push(
    trustGroup(label, rows, mod, trustGroupPeek(vm, mod), icon.tone, icon.id)
  );
}

function trustGroupIcon(
  mod: string,
  vm: ScanViewModel
): { id: ScanIconId; tone: string } {
  switch (mod) {
    case "card":
      return { id: "status", tone: cardStatusIconTone(vm) };
    case "human":
      return humanTrustListIcon(humanTrustDisplay(vm));
    case "qr":
      return { id: "qr", tone: qrStatusIconTone(vm) };
    case "live":
      return vm.liveControlProvenAt
        ? { id: "key", tone: "green" }
        : { id: "lock", tone: "red" };
    default:
      return { id: "shield", tone: "slate" };
  }
}

function trustGroupPeek(vm: ScanViewModel, mod: string): string {
  switch (mod) {
    case "card":
      return vm.cardStatus ? formatCardStatus(vm.cardStatus) : "Unknown";
    case "human":
      return humanTrustDisplay(vm).label;
    case "qr":
      return vm.qrStatus ? `QR ${formatQrStatus(vm.qrStatus)}` : "Credential";
    case "live":
      if (vm.liveControlProvenAt) return "Control proven";
      if (vm.kind === "active" && vm.profileId && vm.qrId) {
        return "In-person check available";
      }
      return "Not shown on this scan";
    default:
      return "";
  }
}

function trustGroup(
  label: string,
  rows: string,
  mod: string,
  peek: string,
  iconTone: string,
  iconId: ScanIconId
): string {
  return `<details class="group scan-group scan-group-${mod} scan-trust-layer scan-trust-details">
  <summary class="scan-group-summary">
    ${scanListIcon(iconTone, iconId)}
    <span class="scan-group-summary-text">
      <span class="scan-group-summary-title">${escapeHtml(label)}</span>
      <span class="scan-group-summary-peek">${escapeHtml(peek)}</span>
    </span>
    <span class="scan-group-chevron" aria-hidden="true">›</span>
  </summary>
  <ul class="list">
    ${rows}
  </ul>
</details>`;
}

function listRow(
  icon: ScanIconId,
  tone: string,
  title: string,
  sub?: string
): string {
  const subHtml = sub
    ? `<span class="list-sub">${escapeHtml(sub)}</span>`
    : "";
  return `<li class="list-row">
  ${scanListIcon(tone, icon)}
  <span class="list-content">
    <span class="list-title">${escapeHtml(title)}</span>
    ${subHtml}
  </span>
</li>`;
}

function cardGroupRows(vm: ScanViewModel): string {
  const status = vm.cardStatus ? `Card ${vm.cardStatus}` : "Unknown";
  const rows = [
    listRow(
      "status",
      cardStatusIconTone(vm),
      status,
      vm.kind === "active"
        ? "Live public card fields at scan time"
        : scanLead(vm)
    ),
  ];
  if (vm.profileId) {
    rows.push(listRow("profile", "blue", "Profile ID", vm.profileId));
  }
  return rows.join("\n");
}

function humanGroupRows(vm: ScanViewModel): string {
  const display = humanTrustDisplay(vm);
  const icon = humanTrustListIcon(display);
  return `<li class="list-row" id="human-trust-row">
  ${scanListIcon(icon.tone, icon.id)}
  <span class="list-content">
    <span class="list-title" id="human-trust-row-title">${escapeHtml(display.label)}</span>
    <span class="list-sub" id="human-trust-row-sub">${escapeHtml(display.subtitle)}</span>
  </span>
</li>`;
}

function renderVouchSection(vm: ScanViewModel, origin: string): string {
  const walletUrl = `${origin.replace(/\/$/, "")}/wallet/`;
  const explainerCopy = VOUCH_EXPLAINER_INITIAL_COPY.replace(
    "WALLET_HREF",
    escapeHtml(walletUrl)
  );
  return `<section class="group scan-group scan-group-vouch scan-trust-layer" aria-label="Issue vouch">
  <h2 class="group-label">Vouch</h2>
  <div id="vouch-explainer" class="hc-emphasis-card hc-emphasis-card--info vouch-explainer">
    <div class="hc-emphasis-card__main">
      <span class="hc-emphasis-card__dot hc-emphasis-card__dot--info" aria-hidden="true"></span>
      <div class="hc-emphasis-card__copy">
        <p class="hc-emphasis-card__eyebrow">${escapeHtml(VOUCH_EXPLAINER_EYEBROW)}</p>
        <p class="hc-emphasis-card__title">${escapeHtml(VOUCH_EXPLAINER_TITLE)}</p>
        <p class="hc-emphasis-card__detail" id="vouch-explainer-copy">
          ${explainerCopy}
        </p>
      </div>
    </div>
    <div id="vouch-explainer-actions" class="hc-emphasis-card__actions vouch-explainer-actions" hidden></div>
  </div>
  <ul class="list vouch-list">
    ${vouchIssuanceGroupRows(vm)}
  </ul>
</section>`;
}

function qrGroupRows(vm: ScanViewModel): string {
  const status = vm.qrStatus ? `QR ${formatQrStatus(vm.qrStatus)}` : "QR unknown";
  const scope = qrTrustGroupScopeSubtitle(vm.qrScope);
  const rows = [listRow("qr", qrStatusIconTone(vm), status, scope)];
  const noCalendarExpirySubtitle = qrNoCalendarExpirySubtitle(vm.qrScope);
  if (noCalendarExpirySubtitle && vm.kind === "active") {
    rows.push(
      listRow(
        "qr",
        "green",
        "No calendar expiry",
        noCalendarExpirySubtitle
      )
    );
  }
  if (vm.qrId) {
    rows.push(listRow("profile", "blue", "Credential", vm.qrId));
  }
  const code = credentialCodeForVm(vm);
  if (code) {
    rows.push(
      listRow(
        "profile",
        "slate",
        code,
        "Compare with print sticker · not secret"
      )
    );
  }
  return rows.join("\n");
}

function liveControlGroupRows(vm: ScanViewModel): string {
  if (vm.kind === "active" && vm.profileId && vm.qrId) {
    return liveControlInteractiveRow(vm.liveControlProvenAt ?? null);
  }
  return listRow(
    "key",
    "slate",
    "Not shown",
    "Optional in-person key proof (M7)"
  );
}

function vouchIssuanceGroupRows(vm: ScanViewModel): string {
  const profileId = vm.profileId ?? "";
  return `<li class="list-row vouch-row" id="vouch-row" hidden data-vouchee-profile-id="${escapeHtml(profileId)}">
  <span class="list-content vouch-card-wrap">
    <div class="vouch-card" id="vouch-interactive" hidden>
      <div class="vouch-card-head">
        ${scanListIcon("green", "people")}
        <div class="vouch-card-head-text">
          <span class="vouch-eyebrow">Signed attestation</span>
          <span class="vouch-title">Issue vouch</span>
        </div>
      </div>
      <p class="vouch-lead">
        Publish a signed statement that you know this person as a distinct human. Not government ID; visible on this network and revocable by you.
      </p>
      <label class="vouch-field-label" for="vouch-statement">Statement (public, max 280)</label>
      <textarea class="vouch-statement" id="vouch-statement" maxlength="280" rows="4"></textarea>
      <label class="vouch-confirm-label">
        <input type="checkbox" id="vouch-confirm" />
        <span>I met them in person. This vouch is public, revocable, and not legal identity proof.</span>
      </label>
      <button type="button" class="vouch-cta" id="vouch-submit">Sign and submit</button>
      <div class="vouch-status-panel">
        <p class="vouch-status" id="vouch-status" aria-live="polite"></p>
      </div>
    </div>
    <div class="hc-emphasis-card hc-emphasis-card--warn vouch-ineligible" id="vouch-ineligible" hidden>
      <div class="hc-emphasis-card__main">
        <span class="hc-emphasis-card__dot hc-emphasis-card__dot--warn" aria-hidden="true"></span>
        <div class="hc-emphasis-card__copy">
          <p class="hc-emphasis-card__eyebrow">Unavailable</p>
          <p class="hc-emphasis-card__title">Cannot issue vouch</p>
          <p class="hc-emphasis-card__detail" id="vouch-ineligible-copy"></p>
        </div>
      </div>
    </div>
    <div class="hc-emphasis-card hc-emphasis-card--active vouch-success" id="vouch-success" hidden>
      <div class="hc-emphasis-card__main">
        <span class="hc-emphasis-card__dot hc-emphasis-card__dot--active" aria-hidden="true"></span>
        <div class="hc-emphasis-card__copy">
          <p class="hc-emphasis-card__eyebrow">Accepted</p>
          <p class="hc-emphasis-card__title">Vouch recorded</p>
          <p class="hc-emphasis-card__detail" id="vouch-success-copy">The signed vouch is on the network.</p>
        </div>
      </div>
    </div>
  </span>
</li>`;
}

function renderVouchIssuanceScript(
  vm: ScanViewModel,
  origin: string,
  request?: Request,
  originEnv?: ScanPageOriginEnv
): string {
  if (vm.kind !== "active" || !vm.profileId) return "";
  const assetOrigin = pagesJsOrigin(origin, request, originEnv);
  const mod = JSON.stringify(`${assetOrigin}/js/vouch-issue.mjs?v=15`);
  return `<script type="module" src=${mod}></script>`;
}

function renderScanTabKeysScript(
  vm: ScanViewModel,
  origin: string,
  request?: Request,
  originEnv?: ScanPageOriginEnv
): string {
  if (vm.kind !== "active" || !vm.profileId) return "";
  const assetOrigin = pagesJsOrigin(origin, request, originEnv);
  const mod = JSON.stringify(`${assetOrigin}/js/scan-tab-keys.mjs?v=9`);
  return `<script type="module" src=${mod}></script>`;
}

function renderScanLiveCheckArriveScript(
  origin: string,
  request?: Request,
  originEnv?: ScanPageOriginEnv
): string {
  const assetOrigin = pagesJsOrigin(origin, request, originEnv);
  const mod = JSON.stringify(`${assetOrigin}/js/scan-live-check-arrive.mjs?v=3`);
  return `<script type="module" src=${mod}></script>`;
}

function renderScanMerchFunnelScript(
  origin: string,
  request?: Request,
  originEnv?: ScanPageOriginEnv
): string {
  const assetOrigin = pagesJsOrigin(origin, request, originEnv);
  const mod = JSON.stringify(`${assetOrigin}/js/scan-merch-funnel.mjs?v=2`);
  return `<script type="module" src=${mod}></script>`;
}

function renderScanGameContributeScript(
  vm: ScanViewModel,
  origin: string,
  request?: Request,
  originEnv?: ScanPageOriginEnv
): string {
  const contributeCap = findScanCapability(vm.capabilities, "contribute");
  if (
    !contributeCap?.available ||
    !vm.profileId ||
    !vm.childObjectId
  ) {
    return "";
  }
  const assetOrigin = pagesJsOrigin(origin, request, originEnv);
  const mod = JSON.stringify(`${assetOrigin}/js/scan-game-contribute.mjs?v=3`);
  return `<script type="module" src=${mod}></script>`;
}

function renderScanGamePledgeScript(
  vm: ScanViewModel,
  origin: string,
  request?: Request,
  originEnv?: ScanPageOriginEnv
): string {
  if (!vm.gameNode?.showsPledge || !vm.profileId) return "";
  const assetOrigin = pagesJsOrigin(origin, request, originEnv);
  const mod = JSON.stringify(`${assetOrigin}/js/scan-game-signal-war-pledge.mjs?v=1`);
  return `<script type="module" src=${mod}></script>`;
}

function renderScanLostItemOfferScript(
  vm: ScanViewModel,
  origin: string,
  request?: Request,
  originEnv?: ScanPageOriginEnv
): string {
  if (
    !isScanCapabilityAvailable(vm.capabilities, "offer") ||
    !vm.profileId ||
    !vm.childObjectId
  ) {
    return "";
  }
  const assetOrigin = pagesJsOrigin(origin, request, originEnv);
  const mod = JSON.stringify(`${assetOrigin}/js/scan-lost-item-offer.mjs?v=1`);
  return `<script type="module" src=${mod}></script>`;
}

function renderScanStewardPreviewReturnScript(
  origin: string,
  request?: Request,
  originEnv?: ScanPageOriginEnv
): string {
  const assetOrigin = pagesJsOrigin(origin, request, originEnv);
  const mod = JSON.stringify(`${assetOrigin}/js/scan-steward-preview-return.mjs?v=1`);
  return `<script type="module" src=${mod}></script>`;
}

/** L3 actor band — markup only on active scans (docs/SCAN_PAGE_TRUST_UI.md S3). */
function renderScanActorBand(vm: ScanViewModel, origin: string): string {
  if (vm.kind !== "active" || !vm.profileId || !vm.qrId) return "";
  const walletUrl = `${escapeHtml(origin)}/wallet/`;
  return `<section id="scan-actor-band" class="scan-actor-band scan-actor-band--hidden" hidden aria-label="Your device on this scan">
  <h2 class="scan-actor-band-title">Saved control</h2>
  <p class="scan-actor-band-lead">You can vouch or open your cards from here.</p>
  <div class="scan-actor-band-actions">
    <button type="button" class="scan-actor-band-primary" id="scan-actor-band-restore" hidden>Restore control here</button>
    <button type="button" class="scan-actor-band-primary" id="scan-actor-band-vouch">Go to vouch</button>
    <a class="scan-actor-band-secondary" href="${walletUrl}">My objects</a>
  </div>
</section>`;
}

function renderScanActorBandScript(
  vm: ScanViewModel,
  origin: string,
  request?: Request,
  originEnv?: ScanPageOriginEnv
): string {
  if (vm.kind !== "active" || !vm.profileId) return "";
  const assetOrigin = pagesJsOrigin(origin, request, originEnv);
  const mod = JSON.stringify(`${assetOrigin}/js/scan-actor-band.mjs?v=3`);
  return `<script type="module" src=${mod}></script>`;
}

function renderScanAiExplainScript(
  vm: ScanViewModel,
  origin: string,
  request?: Request,
  originEnv?: ScanPageOriginEnv
): string {
  if (vm.kind !== "active" || !vm.objectStreams.length) return "";
  const snapshot = buildPublicObjectSnapshot(vm.manifestoLine, vm.objectStreams);
  if (!snapshot) return "";
  const assetOrigin = pagesJsOrigin(origin, request, originEnv);
  const mod = JSON.stringify(`${assetOrigin}/js/scan-ai-explain.mjs?v=1`);
  return `<script type="module" src=${mod}></script>`;
}

function liveControlInteractiveRow(provenAt: string | null): string {
  const isProven = !!provenAt;
  const interactiveHidden = isProven ? " hidden" : "";
  const rowClass = isProven ? " is-proven" : "";
  return `<li class="list-row live-control-row${rowClass}" id="live-control-row">
  <span class="list-content live-control-card-wrap">
    <div class="live-control-in-person-layout" id="live-control-in-person-layout">
      <div class="live-control-card live-control-scanner-pane" id="live-control-interactive"${interactiveHidden}>
        <div class="live-control-card-head">
          ${scanListIcon("red", "lock")}
          <div class="live-control-card-head-text">
            <span class="live-control-eyebrow">Scanner</span>
            <span class="live-control-title">Ask owner to prove control</span>
          </div>
        </div>
        <p class="live-control-lead">
          ${escapeHtml(LIVE_CONTROL_SCANNER_LEAD)}
        </p>
        <div class="live-control-same-device-banner" id="live-control-same-device-banner" hidden>
          <p class="live-control-same-device-copy">
            You're viewing your own QR on this device. For live proof, open
            <a class="live-control-same-device-link" id="live-control-same-device-created-link" href="#">My card</a>
            in another tab or use a second phone. Someone else should scan this code to ask for proof.
          </p>
        </div>
        <button type="button" class="live-control-cta" id="live-control-request">
          ${escapeHtml(LIVE_CONTROL_ASK_LABEL)}
        </button>
        <div class="live-control-status-panel" id="live-control-status-panel">
          <p class="live-control-status" id="live-control-status" aria-live="polite">Ready when you are.</p>
        </div>
        <button type="button" class="live-control-cta-secondary" id="live-control-poll-retry" hidden>
          Retry check
        </button>
      </div>
      <div class="live-control-owner-panel" id="live-control-owner-panel" hidden>
        <div class="live-control-card-head">
          ${scanListIcon("blue", "key")}
          <div class="live-control-card-head-text">
            <span class="live-control-eyebrow">Owner</span>
            <span class="live-control-title">Prove control on their device</span>
          </div>
        </div>
        <p class="live-control-owner-lead">
          Send this to the device that <strong>created the card</strong>. This page waits until they sign.
        </p>
        <p class="live-control-owner-handoff" id="live-control-owner-handoff">
          Show this to the card owner. They tap <strong>Prove control now</strong> on a device that has their keys.
        </p>
        <div class="live-control-owner-qr-wrap" id="live-control-owner-qr-wrap" hidden>
          <p class="live-control-owner-qr-label">Owner: scan this to prove control</p>
          <div class="live-control-owner-qr-slot" id="live-control-owner-qr-slot"></div>
        </div>
        <div class="live-control-owner-actions">
          <a class="live-control-owner-btn" id="live-control-owner-link" href="#" target="_blank" rel="noopener noreferrer">
            Open on owner device
          </a>
          <button type="button" class="live-control-owner-btn live-control-owner-btn-muted" id="live-control-copy-owner-link">
            Copy owner link
          </button>
        </div>
      </div>
    </div>
    ${renderLiveControlSuccessPanel(provenAt ?? "", isProven)}
    ${renderLiveControlOwnerView()}
  </span>
</li>`;
}

function renderLiveControlOwnerView(): string {
  return `<div class="live-control-card live-control-card-owner" id="live-control-owner-view" hidden>
  <div class="live-control-card-head">
    ${scanListIcon("blue", "key")}
    <div class="live-control-card-head-text">
      <span class="live-control-eyebrow">Your device</span>
      <span class="live-control-title">Live control</span>
    </div>
  </div>
  <p class="live-control-lead" id="live-control-owner-copy">
    This section is for someone else scanning your QR. When they ask for live proof, open your card page to sign.
  </p>
  <a class="live-control-owner-btn" id="live-control-owner-created-link" href="#">Open your card</a>
</div>`;
}

function renderLiveControlSuccessPanel(provenAt: string, visible: boolean): string {
  const hiddenAttr = visible ? "" : " hidden";
  const provenIsoAttr = provenAt
    ? ` data-proven-at="${escapeHtml(provenAt)}"`
    : "";
  const provenLabel = provenAt
    ? `Proven ${formatScanTimestamp(provenAt)}`
    : "";
  const agoInitial = provenAt ? "Live control proven just now" : "";
  return `<div class="live-control-card live-control-card-proven" id="live-control-success"${hiddenAttr}${provenIsoAttr}>
  <div class="live-control-card-head">
    ${scanListIcon("green", "key")}
    <div class="live-control-card-head-text">
      <span class="live-control-eyebrow">Live control</span>
      <div class="live-control-title-row">
        <span class="live-control-title">${escapeHtml(LIVE_CONTROL_SUCCESS_TITLE)}</span>
        <span class="live-control-proven-ago" id="live-control-proven-ago"${provenIsoAttr}>${escapeHtml(agoInitial)}</span>
      </div>
    </div>
  </div>
  <p class="live-control-success-copy">
    ${escapeHtml(LIVE_CONTROL_SUCCESS_COPY)}
  </p>
  <p class="live-control-proof-countdown" id="live-control-proof-countdown" hidden aria-live="polite"></p>
  <p class="live-control-proven-at" id="live-control-proven-at">${escapeHtml(provenLabel)}</p>
  <button type="button" class="live-control-cta-secondary" id="live-control-request-again">
    Ask again
  </button>
</div>`;
}

function formatScanTimestamp(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function renderLiveControlScript(vm: ScanViewModel, origin: string, _request?: Request): string {
  if (
    vm.kind !== "active" ||
    !vm.profileId ||
    !vm.qrId ||
    !shouldShowLiveControlTrustGroup(vm.capabilities)
  ) {
    return "";
  }
  const apiOrigin = liveControlApiOrigin(vm, origin);
  const challengeUrl = `${apiOrigin}/.well-known/hc/v1/cards/${encodeURIComponent(
    vm.profileId
  )}/live-control/challenges`;
  return `<script>
(function () {
${scanLiveControlClientHelpersJs()}
  var PROOF_TTL_MS = 5 * 60 * 1000;
  var POLL_FAILURE_MAX = 3;
  var btn = document.getElementById("live-control-request");
  var status = document.getElementById("live-control-status");
  var ownerPanel = document.getElementById("live-control-owner-panel");
  var ownerLink = document.getElementById("live-control-owner-link");
  var copyOwnerLink = document.getElementById("live-control-copy-owner-link");
  var interactive = document.getElementById("live-control-interactive");
  var success = document.getElementById("live-control-success");
  var provenAtEl = document.getElementById("live-control-proven-at");
  var provenAgoEl = document.getElementById("live-control-proven-ago");
  var proofCountdownEl = document.getElementById("live-control-proof-countdown");
  var askAgainBtn = document.getElementById("live-control-request-again");
  var pollRetryBtn = document.getElementById("live-control-poll-retry");
  var sameDeviceBanner = document.getElementById("live-control-same-device-banner");
  var sameDeviceCreatedLink = document.getElementById("live-control-same-device-created-link");
  var ownerQrWrap = document.getElementById("live-control-owner-qr-wrap");
  var ownerQrSlot = document.getElementById("live-control-owner-qr-slot");
  var row = document.getElementById("live-control-row");
  var statusPanel = document.getElementById("live-control-status-panel");
  var ownerView = document.getElementById("live-control-owner-view");
  var ownerCopy = document.getElementById("live-control-owner-copy");
  var ownerCreatedLink = document.getElementById("live-control-owner-created-link");
  var inPersonLayout = document.getElementById("live-control-in-person-layout");
  var profileId = ${JSON.stringify(vm.profileId)};
  var qrId = ${JSON.stringify(vm.qrId)};
  var challengeUrl = ${JSON.stringify(challengeUrl)};
  var COPY_ASK_LABEL = ${JSON.stringify(LIVE_CONTROL_ASK_LABEL)};
  var COPY_REQUEST_EXPIRED = ${JSON.stringify(LIVE_CONTROL_REQUEST_EXPIRED_STATUS)};
  var COPY_PROOF_EXPIRED = ${JSON.stringify(LIVE_CONTROL_PROOF_EXPIRED_STATUS)};
  var pollTimer = null;
  var countdownTimer = null;
  var proofDisplayCountdownTimer = null;
  var proofExpiryTimer = null;
  var relativeTimer = null;
  var activePollUrl = null;
  var activeChallengeExpiresAt = null;
  var pollFailureCount = 0;
  var waitingCountdownPrefix =
    "Waiting for the owner to tap Prove control on their key-holding device. If nothing happens, ask them to refresh this tab.";
  function pendingStorageKey() {
    return "hc_live_control_pending:" + profileId + ":" + qrId;
  }
  function readPendingFromStorage() {
    try {
      var raw = sessionStorage.getItem(pendingStorageKey());
      if (!raw) return null;
      var record = JSON.parse(raw);
      if (!record || !record.challenge_id || !record.status_url) return null;
      if (record.expires_at) {
        var remaining = Date.parse(record.expires_at) - Date.now();
        if (!Number.isFinite(remaining) || remaining <= 0) {
          clearPendingStorage();
          return null;
        }
      }
      return record;
    } catch (e) {
      return null;
    }
  }
  function writePendingToStorage(record) {
    try {
      sessionStorage.setItem(pendingStorageKey(), JSON.stringify(record));
    } catch (e) {
      /* private browsing / quota — degrade to in-memory poll only */
    }
  }
  function clearPendingStorage() {
    try {
      sessionStorage.removeItem(pendingStorageKey());
    } catch (e) {
      /* ignore */
    }
  }
  function clearRequestExpiredVisual() {
    if (statusPanel) statusPanel.classList.remove("is-request-expired");
    if (row) row.classList.remove("is-request-expired");
  }
  function showRequestExpiredVisual() {
    if (statusPanel) {
      statusPanel.classList.remove("is-waiting");
      statusPanel.classList.add("is-request-expired");
    }
    if (row) row.classList.add("is-request-expired");
  }
  function enterWaitingState() {
    clearRequestExpiredVisual();
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Waiting…";
    }
  }
  function isOwnerBrowser() {
    try {
      var raw = sessionStorage.getItem("hc_created");
      if (!raw) return false;
      var session = JSON.parse(raw);
      if (!session || session.profile_id !== profileId || session.qr_id !== qrId) {
        return false;
      }
      return typeof session.owner_private_key_b58 === "string" ||
        typeof session.recovery_private_key_b58 === "string";
    } catch (e) {
      return false;
    }
  }
  function formatProvenAt(iso) {
    try {
      var d = new Date(iso);
      if (!Number.isFinite(d.getTime())) return "";
      return d.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      });
    } catch (e) {
      return "";
    }
  }
  function formatProvenAgo(elapsedMs) {
    var sec = Math.max(0, Math.floor(elapsedMs / 1000));
    if (sec < 1) return "Live control proven just now";
    if (sec < 60) return "Live control proven " + sec + "s ago";
    var min = Math.floor(sec / 60);
    if (min < 60) return "Live control proven " + min + "m ago";
    var hr = Math.floor(min / 60);
    return "Live control proven " + hr + "h ago";
  }
  function stopRelativeTimer() {
    if (relativeTimer) window.clearInterval(relativeTimer);
    relativeTimer = null;
  }
  function startRelativeTimer(iso) {
    if (!provenAgoEl || !iso) return;
    stopRelativeTimer();
    provenAgoEl.setAttribute("data-proven-at", iso);
    if (success) success.setAttribute("data-proven-at", iso);
    function tick() {
      var elapsed = Date.now() - Date.parse(iso);
      if (!Number.isFinite(elapsed) || elapsed < 0) return;
      provenAgoEl.textContent = formatProvenAgo(elapsed);
      if (elapsed >= PROOF_TTL_MS) stopRelativeTimer();
    }
    tick();
    relativeTimer = window.setInterval(tick, 1000);
  }
  function getProvenIso() {
    if (success && success.getAttribute("data-proven-at")) {
      return success.getAttribute("data-proven-at");
    }
    if (provenAgoEl && provenAgoEl.getAttribute("data-proven-at")) {
      return provenAgoEl.getAttribute("data-proven-at");
    }
    return null;
  }
  function stopProofDisplayCountdown() {
    if (proofDisplayCountdownTimer) window.clearInterval(proofDisplayCountdownTimer);
    proofDisplayCountdownTimer = null;
    if (proofCountdownEl) {
      proofCountdownEl.hidden = true;
      proofCountdownEl.textContent = "";
    }
  }
  function startProofDisplayCountdown(proofExpiresAt) {
    if (!proofCountdownEl || !proofExpiresAt) return;
    stopProofDisplayCountdown();
    function tick() {
      var remaining = Date.parse(proofExpiresAt) - Date.now();
      if (!Number.isFinite(remaining) || remaining <= 0) {
        stopProofDisplayCountdown();
        return;
      }
      proofCountdownEl.hidden = false;
      proofCountdownEl.textContent =
        "Proof display expires in " + formatRemaining(remaining) + ".";
    }
    tick();
    proofDisplayCountdownTimer = window.setInterval(tick, 1000);
  }
  function proofExpiresAtFromProvenAt(provenAt) {
    if (!provenAt) return null;
    var provenMs = Date.parse(provenAt);
    if (!Number.isFinite(provenMs)) return null;
    return new Date(provenMs + PROOF_TTL_MS).toISOString();
  }
  function showProvenSuccess(provenAt, proofExpiresAt) {
    stopPolling();
    stopCountdown();
    stopProofExpiryTimer();
    stopProofDisplayCountdown();
    pollFailureCount = 0;
    hidePollRetry();
    clearPendingStorage();
    clearRequestExpiredVisual();
    if (ownerPanel) ownerPanel.hidden = true;
    if (inPersonLayout) inPersonLayout.classList.remove("is-owner-waiting");
    if (interactive) interactive.hidden = true;
    if (success) success.hidden = false;
    if (row) row.classList.add("is-proven");
    if (provenAtEl && provenAt) {
      provenAtEl.textContent = "Proven " + formatProvenAt(provenAt);
    }
    startRelativeTimer(provenAt);
    var displayExpiresAt = proofExpiresAt || proofExpiresAtFromProvenAt(provenAt);
    if (displayExpiresAt) startProofDisplayCountdown(displayExpiresAt);
  }
  function resetForNewRequest() {
    stopRelativeTimer();
    stopProofDisplayCountdown();
    stopProofExpiryTimer();
    stopPolling();
    stopCountdown();
    activePollUrl = null;
    activeChallengeExpiresAt = null;
    pollFailureCount = 0;
    hidePollRetry();
    clearPendingStorage();
    clearRequestExpiredVisual();
    if (interactive) interactive.hidden = false;
    if (success) success.hidden = true;
    if (row) row.classList.remove("is-proven");
    if (btn) {
      btn.disabled = false;
      btn.textContent = COPY_ASK_LABEL;
    }
    if (status) setStatus("Ready when you are.", false);
    if (ownerPanel) ownerPanel.hidden = true;
    if (ownerLink) ownerLink.href = "#";
    clearOwnerQr();
    if (inPersonLayout) inPersonLayout.classList.remove("is-owner-waiting");
  }
  function clearOwnerQr() {
    if (ownerQrWrap) ownerQrWrap.hidden = true;
    if (ownerQrSlot) ownerQrSlot.innerHTML = "";
  }
  function wireAskAgain() {
    if (!askAgainBtn) return;
    askAgainBtn.addEventListener("click", function () {
      resetForNewRequest();
    });
  }
  function showSameDeviceGuidanceIfNeeded() {
    if (!isOwnerBrowser()) return;
    if (sameDeviceBanner) sameDeviceBanner.hidden = false;
    if (sameDeviceCreatedLink && profileId && qrId) {
      sameDeviceCreatedLink.href =
        location.origin + "/created/?profile_id=" +
        encodeURIComponent(profileId) + "&qr_id=" + encodeURIComponent(qrId);
    }
  }
  function showOwnerPanel(url, qrMarkup) {
    if (ownerPanel) ownerPanel.hidden = false;
    if (inPersonLayout) inPersonLayout.classList.add("is-owner-waiting");
    if (ownerLink) ownerLink.href = url;
    if (ownerQrWrap && ownerQrSlot) {
      if (qrMarkup) {
        ownerQrSlot.innerHTML = qrMarkup;
        ownerQrWrap.hidden = false;
      } else {
        clearOwnerQr();
      }
    }
    if (copyOwnerLink) {
      copyOwnerLink.onclick = function () {
        navigator.clipboard.writeText(url).then(function () {
          copyOwnerLink.textContent = "Copied";
          window.setTimeout(function () {
            copyOwnerLink.textContent = "Copy owner link";
          }, 2000);
        }).catch(function () {
          copyOwnerLink.textContent = "Copy failed  -  use Open link";
        });
      };
    }
  }
  function setStatus(text, waiting) {
    if (!status) return;
    status.textContent = text;
    if (statusPanel) {
      statusPanel.classList.toggle("is-waiting", !!waiting);
    }
  }
  function hidePollRetry() {
    if (pollRetryBtn) pollRetryBtn.hidden = true;
  }
  function showPollRetry() {
    stopCountdown();
    setStatus("Having trouble checking proof status. Tap to retry.", false);
    if (pollRetryBtn) pollRetryBtn.hidden = false;
  }
  function recordPollFailure() {
    pollFailureCount += 1;
    if (pollFailureCount >= POLL_FAILURE_MAX) {
      showPollRetry();
    }
  }
  function resumePoll() {
    pollFailureCount = 0;
    hidePollRetry();
    if (!activePollUrl) return;
    if (activeChallengeExpiresAt) {
      startCountdown(activeChallengeExpiresAt, waitingCountdownPrefix);
    } else {
      setStatus("Waiting for the owner to sign…", true);
    }
    poll(activePollUrl);
  }
  function wirePollRetry() {
    if (!pollRetryBtn) return;
    pollRetryBtn.addEventListener("click", function () {
      resumePoll();
    });
  }
  function stopPolling() {
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = null;
  }
  function stopCountdown() {
    if (countdownTimer) window.clearInterval(countdownTimer);
    countdownTimer = null;
  }
  function stopProofExpiryTimer() {
    if (proofExpiryTimer) window.clearTimeout(proofExpiryTimer);
    proofExpiryTimer = null;
  }
  function showRequestExpired() {
    stopPolling();
    stopCountdown();
    stopProofDisplayCountdown();
    stopProofExpiryTimer();
    stopRelativeTimer();
    activePollUrl = null;
    activeChallengeExpiresAt = null;
    pollFailureCount = 0;
    hidePollRetry();
    clearPendingStorage();
    if (ownerPanel) ownerPanel.hidden = true;
    clearOwnerQr();
    if (interactive) interactive.hidden = false;
    if (success) success.hidden = true;
    if (row) row.classList.remove("is-proven");
    if (btn) {
      btn.disabled = false;
      btn.textContent = COPY_ASK_LABEL;
    }
    showRequestExpiredVisual();
    setStatus(COPY_REQUEST_EXPIRED, false);
    if (inPersonLayout) inPersonLayout.classList.remove("is-owner-waiting");
  }
  function showProofExpired() {
    stopPolling();
    stopCountdown();
    stopProofDisplayCountdown();
    stopProofExpiryTimer();
    stopRelativeTimer();
    activePollUrl = null;
    activeChallengeExpiresAt = null;
    pollFailureCount = 0;
    hidePollRetry();
    clearPendingStorage();
    clearRequestExpiredVisual();
    if (interactive) interactive.hidden = false;
    if (success) success.hidden = true;
    if (row) row.classList.remove("is-proven");
    if (btn) {
      btn.disabled = false;
      btn.textContent = COPY_ASK_LABEL;
    }
    setStatus(COPY_PROOF_EXPIRED, false);
    if (inPersonLayout) inPersonLayout.classList.remove("is-owner-waiting");
  }
  function freshProofMs(body) {
    if (body.status !== "proven" || !body.proof_expires_at) return null;
    var proofExpiresAt = Date.parse(body.proof_expires_at);
    if (!Number.isFinite(proofExpiresAt)) return null;
    var remaining = proofExpiresAt - Date.now();
    return remaining > 0 ? remaining : null;
  }
  function showProven(body) {
    var remaining = freshProofMs(body);
    if (remaining === null) {
      showProofExpired();
      return;
    }
    stopProofExpiryTimer();
    showProvenSuccess(body.proven_at, body.proof_expires_at);
    proofExpiryTimer = window.setTimeout(showProofExpired, remaining);
  }
  function formatRemaining(ms) {
    var total = Math.max(0, Math.ceil(ms / 1000));
    var minutes = Math.floor(total / 60);
    var seconds = String(total % 60).padStart(2, "0");
    return minutes + ":" + seconds;
  }
  function startCountdown(expiresAt, prefix) {
    stopCountdown();
    function tick() {
      var remaining = Date.parse(expiresAt) - Date.now();
      if (!Number.isFinite(remaining) || remaining <= 0) {
        showRequestExpired();
        return;
      }
      setStatus(prefix + " Expires in " + formatRemaining(remaining) + ".", true);
    }
    tick();
    countdownTimer = window.setInterval(tick, 1000);
  }
  function poll(url) {
    activePollUrl = url;
    pollFailureCount = 0;
    hidePollRetry();
    stopPolling();
    pollTimer = window.setInterval(function () {
      fetch(url, { cache: "no-store" })
        .then(function (res) {
          return parseLiveControlJsonResponse(res);
        })
        .then(function (result) {
          if (!result.ok) {
            recordPollFailure();
            return;
          }
          pollFailureCount = 0;
          hidePollRetry();
          var body = result.body;
          if (body.status === "proven") {
            showProven(body);
          } else if (body.status === "expired") {
            showRequestExpired();
          }
        })
        .catch(function () {
          recordPollFailure();
        });
    }, 2000);
  }
  function statusUrlForChallenge(id) {
    return ${JSON.stringify(apiOrigin)} + "/.well-known/hc/v1/cards/" +
      encodeURIComponent(${JSON.stringify(vm.profileId)}) +
      "/live-control/challenges/" + encodeURIComponent(id);
  }
  function handlePendingChallengeBody(body, statusUrl) {
    if (body.status === "proven") {
      showProven(body);
      return;
    }
    if (body.status === "expired") {
      showRequestExpired();
      return;
    }
    enterWaitingState();
    activeChallengeExpiresAt = body.expires_at || null;
    if (body.expires_at) {
      startCountdown(body.expires_at, waitingCountdownPrefix);
    } else {
      setStatus("Waiting for the owner to sign…", true);
    }
    if (body.owner_url) {
      showOwnerPanel(body.owner_url, body.owner_qr_markup);
    }
    poll(statusUrl);
  }
  function checkExistingProof() {
    var params = new URLSearchParams(location.search);
    var id = params.get("live_challenge");
    var statusUrl = null;
    var stored = null;
    if (id) {
      statusUrl = statusUrlForChallenge(id);
    } else {
      stored = readPendingFromStorage();
      if (!stored) return;
      id = stored.challenge_id;
      statusUrl = stored.status_url || statusUrlForChallenge(id);
    }
    setStatus("Checking live proof…", true);
    fetch(statusUrl, { cache: "no-store" })
      .then(function (res) {
        return parseLiveControlJsonResponse(res);
      })
      .then(function (result) {
        if (!result.ok) {
          if (stored) clearPendingStorage();
          setStatus(
            liveControlUserErrorMessage(result.body, {
              status: result.status,
              requestUrl: statusUrl,
              fallback: "Could not check live proof.",
            }),
            false
          );
          return;
        }
        var body = result.body;
        if (body.status === "pending" && stored && stored.owner_url && !body.owner_url) {
          body.owner_url = stored.owner_url;
          body.owner_qr_markup = stored.owner_qr_markup;
        }
        handlePendingChallengeBody(body, statusUrl);
      })
      .catch(function () {
        if (stored) clearPendingStorage();
        setStatus("Could not check live proof.", false);
      });
  }
  showSameDeviceGuidanceIfNeeded();
  wireAskAgain();
  wirePollRetry();
  var initialProven = getProvenIso();
  if (success && !success.hidden && initialProven) {
    var initialProofExpiresAt = proofExpiresAtFromProvenAt(initialProven);
    var initialProofRemaining = initialProofExpiresAt
      ? Date.parse(initialProofExpiresAt) - Date.now()
      : null;
    if (initialProofRemaining !== null && initialProofRemaining > 0) {
      startRelativeTimer(initialProven);
      startProofDisplayCountdown(initialProofExpiresAt);
      proofExpiryTimer = window.setTimeout(showProofExpired, initialProofRemaining);
    } else {
      showProofExpired();
    }
  }
  if (!btn || !status) return;
  btn.addEventListener("click", function () {
    btn.disabled = true;
    btn.textContent = "Waiting…";
    stopPolling();
    stopProofExpiryTimer();
    stopProofDisplayCountdown();
    activePollUrl = null;
    activeChallengeExpiresAt = null;
    pollFailureCount = 0;
    hidePollRetry();
    if (ownerPanel) ownerPanel.hidden = true;
    if (ownerLink) ownerLink.href = "#";
    if (inPersonLayout) inPersonLayout.classList.remove("is-owner-waiting");
    setStatus("Creating a live proof request…", true);
    fetch(challengeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qr_id: ${JSON.stringify(vm.qrId)},
        client_origin: location.origin
      })
    })
      .then(function (res) {
        return parseLiveControlJsonResponse(res);
      })
      .then(function (result) {
        if (!result.ok) {
          throw new Error(liveControlChallengeCreateError(result, challengeUrl));
        }
        var body = result.body;
        if (body.owner_url) {
          showOwnerPanel(body.owner_url, body.owner_qr_markup);
        }
        if (body.challenge_id && body.status_url) {
          writePendingToStorage({
            challenge_id: body.challenge_id,
            status_url: body.status_url,
            expires_at: body.expires_at || null,
            owner_url: body.owner_url || null,
            owner_qr_markup: body.owner_qr_markup || null,
          });
        }
        activeChallengeExpiresAt = body.expires_at || null;
        enterWaitingState();
        startCountdown(body.expires_at, waitingCountdownPrefix);
        poll(body.status_url);
      })
      .catch(function (err) {
        stopCountdown();
        btn.disabled = false;
        btn.textContent = COPY_ASK_LABEL;
        setStatus(err.message || "Could not create live proof request.", false);
      });
  });
  checkExistingProof();
})();
</script>`;
}

function liveControlApiOrigin(vm: ScanViewModel, fallback: string): string {
  if (vm.scanUrl) {
    try {
      const url = new URL(vm.scanUrl);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return url.origin;
      }
    } catch {
      /* Use fallback below. */
    }
  }
  return fallback;
}

/** iOS-style settings row  -  all “does not prove” copy in one place. */
function renderLimitsSettings(vm: ScanViewModel, origin: string): string {
  const policy = `${origin}/data-policy.html`;
  const architecture = `${origin}/architecture.html`;
  const artifactExpiryNote =
    vm.qrScope === "print_artifact" && vm.kind === "active"
      ? `<li>${escapeHtml(PRINT_ARTIFACT_NO_CALENDAR_EXPIRY_NOTE)}</li>`
      : "";
  const objectStreamsNote =
    vm.objectStreams.length > 0
      ? `<li>${escapeHtml(OBJECT_STREAMS_LIMIT)}</li>`
      : "";
  return `<details class="scan-limits-settings scan-trust-layer scan-limits-layer" id="scan-limits-settings">
  <summary class="scan-limits-summary">
    ${scanListIcon("orange", "shield")}
    <span class="scan-limits-summary-text">
      <span class="scan-limits-summary-title">${escapeHtml(SCAN_LIMITS_DISCLOSURE_TITLE)}</span>
      <span class="scan-limits-summary-sub">Tap for ownership, ID, KYC, employment, and age</span>
    </span>
    <span class="list-chevron" aria-hidden="true">›</span>
  </summary>
  <div class="scan-limits-panel">
    <ul class="scan-limits-list">
      <li>Legal identity, government ID, KYC, or background checks</li>
      <li>Employment eligibility, age verification, or a hidden trust score</li>
      <li>That social vouches were honest or complete</li>
      <li>Permanent ownership of a physical item (lifecycle transitions can change state)</li>
      <li>Who scanned, when, or where  -  this page returns object state, not a people trail</li>
      ${objectStreamsNote}
      ${artifactExpiryNote}
    </ul>
    <p class="scan-limits-meta">No scan analytics on this page. <a href="${escapeHtml(policy)}">Operator data policy</a> · <a href="${escapeHtml(architecture)}">Architecture</a></p>
  </div>
</details>`;
}

function renderTrustPills(vm: ScanViewModel): string {
  return [pillForCard(vm), pillForHuman(vm), pillForQr(vm)].join("\n");
}

function pillForCard(vm: ScanViewModel): string {
  const label = vm.cardStatus
    ? `Card ${formatCardStatus(vm.cardStatus)}`
    : "Card unknown";
  const on = vm.cardStatus === "active" ? "trust-on" : "";
  return `<li class="${on}">${escapeHtml(label)}</li>`;
}

function pillForHuman(vm: ScanViewModel): string {
  const display = humanTrustDisplay(vm);
  const on = display.pillActive ? "trust-on" : "";
  return `<li class="${on}">${escapeHtml(display.label)}</li>`;
}

function pillForQr(vm: ScanViewModel): string {
  const label = vm.qrStatus
    ? `QR ${formatQrStatus(vm.qrStatus)}`
    : "QR unknown";
  const on = vm.qrStatus === "active" ? "trust-on" : "";
  return `<li class="${on}">${escapeHtml(label)}</li>`;
}

function cardStatusIconTone(vm: ScanViewModel): string {
  if (vm.cardStatus === "revoked" || vm.kind === "card_revoked") return "red";
  if (vm.cardStatus === "suspended" || vm.kind === "card_suspended") return "orange";
  if (vm.cardStatus === "expired" || vm.kind === "card_expired") return "orange";
  if (vm.cardStatus === "active") return "green";
  return "slate";
}

function qrStatusIconTone(vm: ScanViewModel): string {
  if (vm.qrStatus === "revoked" || vm.kind === "qr_revoked") return "red";
  if (vm.qrStatus === "expired" || vm.kind === "qr_expired") return "orange";
  if (vm.qrStatus === "replaced" || vm.kind === "qr_replaced") return "orange";
  if (vm.qrStatus === "active" && vm.kind === "active") return "green";
  return "slate";
}

function renderFooter(vm: ScanViewModel, origin: string): string {
  const base = origin.replace(/\/$/, "");
  const jsonLink =
    vm.profileId && vm.kind === "active"
      ? `<a class="scan-footer-link" href="${escapeHtml(base)}/.well-known/hc/v1/cards/${encodeURIComponent(vm.profileId)}">Public card JSON</a>`
      : "";
  let createCta: string;
  if (vm.kind === "unknown_profile" || vm.kind === "malformed") {
    createCta = `<a class="dock-btn dock-btn-primary" href="${escapeHtml(base)}/create/">Create a live object</a>`;
  } else if (isMerchFunnelScan(vm)) {
    createCta = `<a class="dock-btn dock-btn-primary" href="${escapeHtml(`${base}${MERCH_SCAN_CREATE_PATH}`)}">Create a live object</a>
  <a class="dock-btn dock-btn-secondary" href="${escapeHtml(`${base}${MERCH_SCAN_CUSTOMIZE_PATH}`)}">Get yours on wear</a>`;
  } else if (vm.kind === "active") {
    createCta = `<a class="dock-btn dock-btn-primary" href="${escapeHtml(base)}/create/">Create a live object</a>
  <a class="dock-btn dock-btn-secondary" href="${escapeHtml(base)}/">About humanity.llc</a>`;
  } else {
    createCta = `<a class="dock-btn dock-btn-secondary" href="${escapeHtml(base)}/">About humanity.llc</a>`;
  }

  return `<footer class="scan-footer">
  ${createCta}
  ${jsonLink}
</footer>`;
}

function scanLead(vm: ScanViewModel): string {
  switch (vm.kind) {
    case "active": {
      const display = parseManifestoDisplay(vm.manifestoLine);
      if (display.kind === "status_plate") {
        return "Current status for this place on the network.";
      }
      if (display.kind === "lost_item_relay") {
        return "Return instructions for this item  -  relay active or revoked at scan time.";
      }
      return "The network returned current status for this card and QR.";
    }
    case "unknown_profile":
      return "No Humanity Card is registered for this link.";
    case "unknown_qr":
      return "This QR credential is not recognized for this card.";
    case "profile_qr_mismatch":
      return "This QR does not belong to the profile in the URL.";
    case "malformed":
      return scanMalformedLead(vm.malformedReason ?? "invalid_profile_id");
    case "card_revoked": {
      const base =
        "Object state: card disabled. Printed QRs still exist; card details are hidden.";
      const reason = publicReasonLabel(vm.publicReason);
      return reason ? `${base} ${reason}.` : base;
    }
    case "card_suspended":
      return "This card is suspended under published rules. See the process links below.";
    case "card_expired":
      return "This card has expired.";
    case "qr_revoked": {
      const base =
        "Object state: this pointer is off. The sticker is unchanged; only live rules changed.";
      const reason = publicReasonLabel(vm.publicReason);
      return reason ? `${base} ${reason}.` : base;
    }
    case "qr_expired":
      return "Object state: validity ended. The card may still be active for other QRs.";
    case "qr_replaced":
      return "This QR was replaced by a newer credential.";
    default:
      return "Trust details at scan time.";
  }
}

function pageTitle(vm: ScanViewModel): string {
  if (vm.minimalScan) {
    switch (vm.kind) {
      case "qr_revoked":
        return "QR no longer valid";
      case "qr_expired":
        return "QR expired";
      case "card_revoked":
        return "Card disabled";
      default:
        return "Scan result";
    }
  }
  if (vm.kind === "malformed") {
    return scanMalformedPageTitle(vm.malformedReason ?? "invalid_profile_id");
  }
  if (vm.handle) return `@${vm.handle}`;
  return vm.primaryBadge.label;
}

function formatCardStatus(s: string): string {
  return s;
}

function formatQrStatus(s: string): string {
  return s.replace("_", " ");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}