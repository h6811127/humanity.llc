import { runInNewContext } from "node:vm";

import { describe, expect, it, vi } from "vitest";

import type { ScanContext } from "../src/db/scan";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { renderScanPage } from "../src/resolver/scan-html";
import {
  LOST_ITEM_RELAY_CREATE_HINT,
  LOST_ITEM_RELAY_CREATE_PATH,
  MERCH_SCAN_CUSTOMIZE_PATH,
} from "../src/resolver/scan-safety";
import {
  SCAN_OFFLINE_BANNER_TEXT,
  shouldShowScanOfflineBanner,
} from "../src/resolver/scan-offline";
import { BEARER_WARNING } from "../src/resolver/trust-copy";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { handleGetScan } from "../src/resolver/scan";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const LIVE_CHALLENGE = "lc_7Xk9mP2nQ4rT6vW8";

function card(overrides: Partial<CardRow> = {}): CardRow {
  return {
    profile_id: PROFILE,
    public_key: "pk",
    handle: "river_example",
    handle_normalized: "river_example",
    manifesto_line: "Open studio",
    status: "active",
    card_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

function qr(overrides: Partial<QrCredentialRow> = {}): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "card",
    print_artifact_id: null,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
    issued_at: "2026-05-16T17:00:00Z",
    expires_at: "2027-05-16T17:00:00Z",
    credential_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

function summary(): VerificationSummaryRow {
  return {
    profile_id: PROFILE,
    state: "registered",
    level: 1,
    label: "Registered",
    method: "registered",
    vouch_count: 0,
    latest_accepted_vouch_at: null,
    credential_ids_json: "[]",
    summary_document_json: null,
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function scanDbFor(challenge: Record<string, unknown> | null = null): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM cards")) return card();
          if (sql.includes("FROM qr_credentials")) return qr();
          if (sql.includes("FROM verification_summaries")) return summary();
          if (sql.includes("FROM live_control_challenges")) {
            if (sql.includes("ORDER BY proven_at DESC")) {
              const [profile_id, qr_id, provenAfter] = params;
              if (
                challenge &&
                challenge.status === "proven" &&
                challenge.profile_id === profile_id &&
                challenge.qr_id === qr_id &&
                String(challenge.proven_at) > String(provenAfter)
              ) {
                return challenge;
              }
              return null;
            }
            return params[0] === LIVE_CHALLENGE ? challenge : null;
          }
          return null;
        },
      }),
    }),
  } as unknown as D1Database;
}

function extractLiveControlScript(html: string): string {
  const match = html.match(
    /<script>\n\(function \(\) \{\n  var btn = document\.getElementById\("live-control-request"\);[\s\S]*?\n\}\)\(\);\n<\/script>/
  );
  expect(match).not.toBeNull();
  return match![0].replace(/^<script>\n/, "").replace(/\n<\/script>$/, "");
}

async function runLiveControlScriptWithStatus(body: Record<string, unknown>) {
  const vm = buildScanViewModel(
    PROFILE,
    QR,
    {
      card: card(),
      qr: qr(),
      verification: summary(),
    },
    "https://humanity.llc"
  );
  const html = await renderScanPage(vm, "https://humanity.llc");
  const script = extractLiveControlScript(html);
  type FakeElement = {
    disabled?: boolean;
    textContent?: string;
    addEventListener?: ReturnType<typeof vi.fn>;
    hidden?: boolean;
    href?: string;
  };
  const elements: Record<string, FakeElement> = {
    "live-control-request": {
      disabled: false,
      textContent: "Ask for live proof",
      addEventListener: vi.fn(),
    },
    "live-control-status": { textContent: "Not proven yet." },
    "live-control-owner-link": { hidden: true, href: "#" },
  };
  const fetchMock = vi.fn(async () => ({ json: async () => body }));
  const setTimeoutMock = vi.fn(() => 1);

  runInNewContext(script, {
    Date,
    Error,
    Number,
    URLSearchParams,
    encodeURIComponent,
    document: {
      getElementById: (id: string) => elements[id] ?? null,
    },
    fetch: fetchMock,
    location: {
      origin: "https://humanity.llc",
      search: `?q=${QR}&live_challenge=${LIVE_CHALLENGE}`,
    },
    window: {
      clearInterval: vi.fn(),
      clearTimeout: vi.fn(),
      setInterval: vi.fn(() => 1),
      setTimeout: setTimeoutMock,
    },
  });

  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();

  return {
    button: elements["live-control-request"],
    fetchMock,
    setTimeoutMock,
    status: elements["live-control-status"],
  };
}

describe("scan offline banner (F2-2)", () => {
  it("shows only when navigator reports offline", () => {
    expect(shouldShowScanOfflineBanner(false)).toBe(true);
    expect(shouldShowScanOfflineBanner(true)).toBe(false);
    expect(shouldShowScanOfflineBanner(undefined)).toBe(false);
  });

  it("renders offline banner markup and disclosure script on scan HTML", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain('id="scan-offline-banner"');
    expect(html).toContain(SCAN_OFFLINE_BANNER_TEXT);
    expect(html).toContain("navigator.onLine");
    expect(html).toContain('addEventListener("offline"');
  });
});

describe("buildScanViewModel", () => {
  it("active scan includes all trust blocks", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("active");
    expect(vm.showCardBlock).toBe(true);
    expect(vm.showHumanTrustBlock).toBe(true);
    expect(vm.showArtifactBlock).toBe(true);
    expect(vm.showLiveControlBlock).toBe(true);
    expect(vm.liveControlAvailable).toBe(false);
  });
});

describe("renderScanPage M3.2 trust blocks", () => {
  it("renders lost-item relay manifesto layout", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card({
          manifesto_line: "[relay] House keys\nLost  -  contact owner through relay",
        }),
        qr: qr(),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Lost item relay");
    expect(html).toContain("House keys");
    expect(html).toContain("contact owner through relay");
    expect(html).not.toContain("[relay]");
    expect(html).toContain("does not prove who holds the item");
    expect(html).toContain("scan-create-hint");
    expect(html).toContain(LOST_ITEM_RELAY_CREATE_HINT);
    expect(html).toContain(LOST_ITEM_RELAY_CREATE_PATH);
    expect(html).toMatch(/<p class="scan-create-hint"/);
  });

  it("does not show lost-item create hint on status plate scans", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card({
          manifesto_line: "Studio door\nOpen · Thu–Sun until 9 PM",
        }),
        qr: qr(),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Studio door");
    expect(html).toContain("Open · Thu–Sun until 9 PM");
    expect(html).not.toContain("This QR is active");
    expect(html).toContain("Controlled by");
    expect(html).toContain("scan-hero-title");
    expect(html).not.toContain('class="scan-state-row"');
    expect(html).not.toMatch(/<p class="scan-create-hint"/);
  });

  it("renders flat status panel with shared styles (no ID-style flip card)", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("scan-page-chrome");
    expect(html).toContain('id="scan-page-dot-btn"');
    expect(html).toContain('id="scan-page-dot"');
    expect(html).toContain('id="scan-page-dot-glance"');
    expect(html).toContain('id="scan-page-dot-explainer"');
    expect(html).toContain('id="scan-page-dot-home"');
    expect(html).toContain('class="hc-qr-finder-logo"');
    expect(html).not.toContain('class="hc-qr-brand-mark"');
    expect(html).not.toContain('class="hc-qr-center-logo"');
    expect(html).not.toContain('class="top-brand"');
    expect(html).not.toContain('<header class="top">');
    expect(html.match(/class="scan-hero-host scan-hero-wordmark"/g)?.length ?? 0).toBe(
      1
    );
    expect(html).toContain('class="scan-hero-host scan-hero-wordmark"');
    expect(html).not.toMatch(
      /class="scan-hero-host[^"]*"[^>]*>[\s\S]*?<span class="pass-dot"/
    );
    expect(html).toContain("scan-hero");
    expect(html).toContain('content="light dark"');
    expect(html).toContain('localStorage.getItem("hc_theme")');
    expect(html).toContain("scan-status-panel");
    expect(html).not.toMatch(/id="pass-scene"/);
    expect(html).not.toMatch(/class="pass-scene/);
    expect(html).not.toContain('id="pass-flip-btn"');
    expect(html).not.toMatch(/id="pass-tilt-wrap"/);
    expect(html).not.toContain('getElementById("pass-scene")');
    expect(html).not.toContain('class="block"');
    expect(html).not.toContain("HUMAN TRUST");
    expect(html).not.toContain("This QR is active");
    expect(html).not.toContain('class="section-kicker">Network status');
    expect(html).toContain("Valid until");
    expect(html).not.toContain('class="scan-state-row"');
    expect(html).not.toContain("pass-badge badge-live");
    expect(html).toContain("@river_example");
    expect(html).toContain("Card active");
    expect(html).toContain("QR active");
    expect(html).toContain("scan-safety-header");
    expect(html).toContain("scan-hero-limit");
    expect(html).toContain("scan-proves");
    expect(html).not.toMatch(/class="scan-does-not-prove"/);
    expect(html).toContain("scan-trust-details");
    expect(html).toContain("scan-hero-qr-details");
    expect(html).toContain("scan-limits-settings");
    expect(html).toContain("What this scan does not prove");
    const limitsIdx = html.indexOf('id="scan-limits-settings"');
    const provesIdx = html.indexOf('class="scan-proves"');
    expect(limitsIdx).toBeGreaterThan(-1);
    expect(provesIdx).toBeGreaterThan(-1);
    expect(limitsIdx).toBeGreaterThan(provesIdx);
    const bearerCount = html.split(BEARER_WARNING).length - 1;
    expect(bearerCount).toBe(1);
    expect(html).not.toContain("Does not prove");
    expect(html).toContain('class="pass-dot"');
    expect(html).toContain("pass-qr-slot");
    expect(html).toContain(`q=${QR}`);
    expect(html).toContain("pass-credential-code");
    expect(html).toMatch(/HC-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}/);
    expect(html).toContain("Show link");
    expect(html).toMatch(/<svg[^>]*viewBox="0 0 \d+ \d+"/);
    expect(html).toContain("list-icon-tone-red");
    expect(html).not.toContain('class="pass-qr"><img src="https://humanity.llc/assets/red_qr');
    expect(html).not.toContain("HUMAN TRUST");
  });

  it("uses @handle as H1 for personal card with short manifesto", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card({ manifesto_line: "Open studio" }),
        qr: qr({ scope: "card" }),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toMatch(
      /<h1 class="[^"]*scan-hero-title[^"]*">@river_example<\/h1>/
    );
    expect(html).toContain("scan-hero-trust");
    expect(html).toContain("Open studio");
    expect(html).not.toContain("Controlled by @river_example");
  });

  it("uses manifesto as H1 for live object print QR", async () => {
    const manifesto =
      "Neighborhood tool library · Closed for inventory until Tuesday";
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card({ manifesto_line: manifesto }),
        qr: qr({ scope: "print_artifact" }),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain(`scan-hero-title">${manifesto}</h1>`);
    expect(html).toContain("Controlled by @river_example");
    expect(html).not.toMatch(/<ul class="scan-hero-trust"/);
  });

  it("puts spec trust blocks in iOS groups below the card", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("scan-trust-stack");
    expect(html).toContain("scan-trust-layer");
    expect(html).toContain("scan-pass-layer");
    expect(html).toContain("Card status");
    expect(html).toContain("Human trust");
    expect(html).toContain("Live control");
    expect(html).toContain('id="live-control-request"');
    expect(html).toContain("live-control-cta");
    expect(html).toContain('id="vouch-row"');
    expect(html).toContain('id="vouch-explainer"');
    expect(html).toContain("hc-emphasis-card--info vouch-explainer");
    expect(html).toContain('id="vouch-ineligible"');
    expect(html).toContain("hc-emphasis-card--warn vouch-ineligible");
    expect(html).toContain('id="vouch-success"');
    expect(html).toContain("hc-emphasis-card--active vouch-success");
    expect(html).toContain("Signing key in this tab");
    expect(html).toContain("Saved cards");
    expect(html).toContain("Issue vouch");
    expect(html).toContain("vouch-explainer-actions");
    expect(html).toContain('id="scan-cross-tab-banner"');
    expect(html).toContain("scan-tab-keys.mjs?v=7");
    expect(html).toContain("vouch-issue.mjs?v=13");
    expect(html).not.toContain("Limitations");
    expect(html).toContain("scan-limits-settings");
    expect(html).toContain('class="list"');
  });

  it("renders recent live proof when returning with a proven challenge", async () => {
    const res = await handleGetScan(
      new Request(
        `https://humanity.llc/c/${PROFILE}?q=${QR}&live_challenge=${LIVE_CHALLENGE}`
      ),
      scanDbFor({
        challenge_id: LIVE_CHALLENGE,
        profile_id: PROFILE,
        qr_id: QR,
        nonce: "nonce",
        verifier_session_id: "verifier",
        status: "proven",
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        proven_at: new Date().toISOString(),
        signer_public_key: "pk",
        response_document_json: "{}",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
      PROFILE
    );
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(html).toContain("Control proven");
    expect(html).toContain("live-control-card-proven");
    expect(html).toContain('id="live-control-request-again"');
    expect(html).toContain("live-control-proven-ago");
    expect(html).toContain('id="live-control-owner-view"');
    expect(html).toContain('id="live-control-interactive" hidden');
    expect(html).toContain('id="live-control-request"');
  });

  it("does not render stale live proof as recently proven", async () => {
    const res = await handleGetScan(
      new Request(
        `https://humanity.llc/c/${PROFILE}?q=${QR}&live_challenge=${LIVE_CHALLENGE}`
      ),
      scanDbFor({
        challenge_id: LIVE_CHALLENGE,
        profile_id: PROFILE,
        qr_id: QR,
        nonce: "nonce",
        verifier_session_id: "verifier",
        status: "proven",
        issued_at: new Date(Date.now() - 600_000).toISOString(),
        expires_at: new Date(Date.now() - 540_000).toISOString(),
        proven_at: new Date(Date.now() - 301_000).toISOString(),
        signer_public_key: "pk",
        response_document_json: "{}",
        created_at: new Date(Date.now() - 600_000).toISOString(),
        updated_at: new Date(Date.now() - 301_000).toISOString(),
      }),
      PROFILE
    );
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).not.toContain("Control proven recently");
    expect(html).toContain('id="live-control-request"');
    expect(html).toContain("Not proven yet.");
  });

  it("does not let browser status checks revive stale live proof", async () => {
    const result = await runLiveControlScriptWithStatus({
      status: "proven",
      proof_expires_at: new Date(Date.now() - 1_000).toISOString(),
    });

    expect(result.status.textContent).toBe(
      "Live proof expired. Ask again to prove control now."
    );
    expect(result.button.textContent).toBe("Ask again");
    expect(result.setTimeoutMock).not.toHaveBeenCalled();
  });

  it("clears browser live proof status when the proof display window ends", async () => {
    const result = await runLiveControlScriptWithStatus({
      status: "proven",
      proof_expires_at: new Date(Date.now() + 60_000).toISOString(),
    });

    expect(result.status.textContent).toBe(
      "Control proven moments ago. This does not prove legal identity."
    );
    expect(result.button.textContent).toBe("Ask again");
    expect(result.setTimeoutMock).toHaveBeenCalledTimes(1);
    expect(result.setTimeoutMock.mock.calls[0][1]).toBeGreaterThan(0);
  });

  it("uses print_artifact scope copy when applicable", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr({ scope: "print_artifact", print_artifact_id: "art_001" }),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Printed item — revoke one artifact without killing the card");
    expect(html).toContain('data-merch-funnel="1"');
    expect(html).toContain(MERCH_SCAN_CUSTOMIZE_PATH);
  });

  it("renders Vouched Human with vouch recency on scan (V-001)", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: {
          ...summary(),
          state: "verified_human",
          level: 2,
          label: "Vouched Human",
          method: "vouch",
          vouch_count: 3,
          latest_accepted_vouch_at: "2026-05-21T12:00:00.000Z",
        },
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Vouched Human");
    expect(html).toContain("3 accepted vouches");
    expect(html).toContain("latest");
  });

  it("shows vouch progress below threshold (V-001)", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: {
          ...summary(),
          vouch_count: 2,
          latest_accepted_vouch_at: "2026-05-20T12:00:00.000Z",
        },
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("2 of 3 vouches accepted");
    expect(html).not.toContain(">Vouched Human<");
  });

  it("overrides Vouched Human when verification is revoked (V-001)", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: {
          ...summary(),
          state: "revoked",
          label: "Revoked",
          vouch_count: 4,
          latest_accepted_vouch_at: "2026-05-20T12:00:00.000Z",
        },
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Verification revoked");
    expect(html).not.toContain(">Vouched Human<");
  });

  it("renders suspended card with governance process links (F2-3)", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card({ status: "suspended" }),
        qr: qr(),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("card_suspended");
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("suspended under published rules");
    expect(html).toContain('href="https://humanity.llc/data-policy.html"');
    expect(html).toContain('href="https://humanity.llc/architecture.html"');
    expect(html).toContain("operator data policy");
  });

  it("renders card disabled state (M4.5)", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card({ status: "revoked" }),
        qr: qr(),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("card_revoked");
    expect(vm.minimalScan).toBe(true);
    expect(vm.showCardBlock).toBe(true);
    expect(vm.showArtifactBlock).toBe(true);
    expect(vm.showHumanTrustBlock).toBe(false);
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("This card has been disabled");
    expect(html).toContain("Show link");
    expect(html).toContain("scan-safety-header");
    expect(html).toContain("scan-safety-strip--bad");
    expect(html).toContain("Card status");
    expect(html).toContain("This QR");
    expect(html).not.toContain("Human trust");
  });

  it("renders QR expired minimal while card stays active (M4.6)", async () => {
    const expiredQr = "qr_expiredtest999";
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const vm = buildScanViewModel(
      PROFILE,
      expiredQr,
      {
        card: card(),
        qr: qr({
          qr_id: expiredQr,
          expires_at: past,
          payload: `https://humanity.llc/c/${PROFILE}?q=${expiredQr}`,
        }),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("qr_expired");
    expect(vm.minimalScan).toBe(true);
    expect(vm.showCardBlock).toBe(true);
    expect(vm.showArtifactBlock).toBe(true);
    expect(vm.showHumanTrustBlock).toBe(false);
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("This QR has expired");
    expect(html).toContain("scan-safety-header");
    expect(html).toContain("scan-safety-strip--warn");
    expect(html).toContain("Card status");
    expect(html).toContain("This QR");
    expect(html).not.toContain("Human trust");
    expect(html).not.toContain('id="pass-flip-btn"');
  });

  it("renders QR revoked minimal while card stays active (M4.5)", async () => {
    const revokedQr = "qr_revokedsibtest99";
    const vmRevoked = buildScanViewModel(
      PROFILE,
      revokedQr,
      {
        card: card(),
        qr: qr({
          qr_id: revokedQr,
          status: "revoked",
          payload: `https://humanity.llc/c/${PROFILE}?q=${revokedQr}`,
        }),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    expect(vmRevoked.kind).toBe("qr_revoked");
    expect(vmRevoked.minimalScan).toBe(true);
    expect(vmRevoked.showCardBlock).toBe(true);
    expect(vmRevoked.showArtifactBlock).toBe(true);
    expect(vmRevoked.showHumanTrustBlock).toBe(false);
    const htmlRevoked = await renderScanPage(vmRevoked, "https://humanity.llc");
    expect(htmlRevoked).toContain("This QR is no longer valid");
    expect(htmlRevoked).toContain("Show link");
    expect(htmlRevoked).toContain("scan-safety-header");
    expect(htmlRevoked).toContain("scan-safety-strip--bad");
    expect(htmlRevoked).toContain("Card status");
    expect(htmlRevoked).toContain("This QR");
    expect(htmlRevoked).not.toContain("Human trust");
    expect(htmlRevoked).not.toContain('id="pass-flip-btn"');

    const vmTombstone = buildScanViewModel(
      PROFILE,
      revokedQr,
      {
        card: card(),
        qr: qr({
          qr_id: revokedQr,
          status: "revoked",
          payload: `https://humanity.llc/c/${PROFILE}?q=${revokedQr}`,
        }),
        verification: summary(),
        revocationDisplay: {
          display_mode: "tombstone",
          public_reason: "event_ended",
        },
      },
      "https://humanity.llc"
    );
    expect(vmTombstone.minimalScan).toBe(false);
    const htmlTombstone = await renderScanPage(vmTombstone, "https://humanity.llc");
    expect(htmlTombstone).toContain("@river_example");
    expect(htmlTombstone).toContain("Event ended");
    expect(htmlTombstone).not.toContain('id="pass-flip-btn"');

    const vmSibling = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr({ status: "active" }),
        verification: summary(),
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    expect(vmSibling.kind).toBe("active");
  });
});
