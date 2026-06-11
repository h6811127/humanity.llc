import { describe, expect, it, vi } from "vitest";

import worker from "../src";
import type { CrSeasonConfig } from "../src/city-game/season-config";
import {
  defaultSeason,
  registerSeasonConfig,
  resetSeasonRegistryForTests,
} from "../src/city-game/season-loader";
import type { ScanContext } from "../src/db/scan";
import type {
  CardRow,
  ChildObjectRow,
  QrCredentialRow,
  VerificationSummaryRow,
} from "../src/db/types";
import {
  BEARER_WARNING,
  httpStatusForScanKind,
  scanStatusBodyForWeakEtag,
  scanStatusBodyFromViewModel,
} from "../src/resolver/scan-status";
import { weakEtagFromSerializedJson } from "../src/http/conditional-json";
import {
  buildCardOnlyScanViewModel,
  buildScanViewModel,
  malformedScanView,
} from "../src/resolver/scan-state";
import { d1WithRateLimitBuckets } from "./rate-limit-db-mock";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const GAME_PROFILE = PROFILE;
const GAME_QR = "qr_7Xk9mP2nQ4rT6vW8";
const GAME_OBJECT = "obj_cr_node_04_river";

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

function gameChild(): ChildObjectRow {
  return {
    object_id: GAME_OBJECT,
    parent_profile_id: GAME_PROFILE,
    object_type: "game_node",
    public_label: "Riverwalk River Lantern",
    public_state: "Seed clue live",
    status: "active",
    child_object_document_json: JSON.stringify({
      object_id: GAME_OBJECT,
      parent_profile_id: GAME_PROFILE,
      object_type: "game_node",
      public_label: "Riverwalk River Lantern",
      public_state: "Seed clue live",
      status: "active",
      season_id: "cr_season_01_wake",
      node_role: "temp_drop",
      district: "river_spine",
      object_streams: [
        { id: "care", class: "care", label: "Trail", value: "Open" },
      ],
      game_meta: {
        visible_until: null,
        compromised: false,
        collective_progress: 4,
        collective_target: 20,
        unlocked_by: [],
        vouch_requires: [],
        vouch_active_for: [],
        scarcity_remaining: null,
        fragment_id: null,
      },
      created_at: "2026-06-01T12:00:00.000Z",
      updated_at: "2026-06-01T12:05:00.000Z",
    }),
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:05:00.000Z",
  };
}

function registerGameStatusTestSeason(): void {
  const season: CrSeasonConfig = {
    ...defaultSeason(),
    season_id: "test_status_game_season",
    season_root_profile_id: GAME_PROFILE,
  };
  registerSeasonConfig(season);
}

describe("scan status JSON (M3.4)", () => {
  it("active scan with ?q matches scan view model kind and bearer limits", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      { card: card(), qr: qr(), verification: summary(), revocationDisplay: null },
      "https://humanity.llc"
    );
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.kind).toBe("active");
    expect(body.scan.error).toBeUndefined();
    expect(body.scan.scan_url).toBe(`https://humanity.llc/c/${PROFILE}?q=${QR}`);
    expect(body.scan.qr?.status).toBe("active");
    expect(body.scan.limits.bearer_warning).toBe(BEARER_WARNING);
    expect(body.scan.human_trust.label).toBe("Registered");
    expect(body.scan.human_trust.subtitle).toContain("No accepted vouches");
    expect(body.scan.limits.scan_analytics).toBe(false);
    expect(body.scan.verification.vouch_count).toBe(0);
    expect(httpStatusForScanKind(vm.kind)).toBe(200);
    expect(body.scan.freshness.max_age_seconds).toBe(30);
    expect(body.scan.succession.phase).toBe("live");
  });

  it("weak ETag ignores per-response freshness.fetched_at", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      { card: card(), qr: qr(), verification: summary(), revocationDisplay: null },
      "https://humanity.llc"
    );
    const a = scanStatusBodyForWeakEtag(
      scanStatusBodyFromViewModel(vm, new Date("2026-06-07T18:00:00.000Z"))
    );
    const b = scanStatusBodyForWeakEtag(
      scanStatusBodyFromViewModel(vm, new Date("2026-06-07T19:00:00.000Z"))
    );
    expect(a.scan.freshness.fetched_at).toBe("");
    expect(
      await weakEtagFromSerializedJson(JSON.stringify(a))
    ).toBe(await weakEtagFromSerializedJson(JSON.stringify(b)));
  });

  it("status JSON exposes vouch count and latest recency (V-001)", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: card(),
        qr: qr(),
        verification: {
          ...summary(),
          state: "verified_human",
          label: "Vouched Human",
          method: "vouch",
          vouch_count: 3,
          latest_accepted_vouch_at: "2026-05-21T12:00:00.000Z",
        },
      },
      "https://humanity.llc"
    );
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.verification.state).toBe("verified_human");
    expect(body.scan.verification.label).toBe("Vouched Human");
    expect(body.scan.verification.vouch_count).toBe(3);
    expect(body.scan.verification.latest_accepted_vouch_at).toBe(
      "2026-05-21T12:00:00.000Z"
    );
    expect(body.scan.human_trust.label).toBe("Vouched Human");
    expect(body.scan.human_trust.subtitle).toContain("3 accepted vouches");
    expect(body.scan.human_trust.pill_active).toBe(true);
  });

  it("unknown profile returns 404", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      { card: null, qr: null, verification: null, revocationDisplay: null },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("unknown_profile");
    expect(httpStatusForScanKind(vm.kind)).toBe(404);
  });

  it("maps scan.kind to contract error codes (F2-8)", () => {
    const suspended = scanStatusBodyFromViewModel(
      buildScanViewModel(
        PROFILE,
        QR,
        {
          card: card({ status: "suspended" }),
          qr: qr(),
          verification: summary(),
          revocationDisplay: null,
        },
        "https://humanity.llc"
      )
    );
    expect(suspended.scan.kind).toBe("card_suspended");
    expect(suspended.scan.error).toBe("CARD_SUSPENDED");

    const cardRevoked = scanStatusBodyFromViewModel(
      buildScanViewModel(
        PROFILE,
        QR,
        {
          card: card({ status: "revoked" }),
          qr: qr(),
          verification: summary(),
          revocationDisplay: null,
        },
        "https://humanity.llc"
      )
    );
    expect(cardRevoked.scan.error).toBe("CARD_REVOKED");

    const qrRevoked = scanStatusBodyFromViewModel(
      buildScanViewModel(
        PROFILE,
        QR,
        { card: card(), qr: qr({ status: "revoked" }), verification: summary(), revocationDisplay: null },
        "https://humanity.llc"
      )
    );
    expect(qrRevoked.scan.kind).toBe("qr_revoked");
    expect(qrRevoked.scan.error).toBe("QR_REVOKED");

    const printRevoked = scanStatusBodyFromViewModel(
      buildScanViewModel(
        PROFILE,
        QR,
        {
          card: card(),
          qr: qr({ status: "revoked", scope: "print_artifact" }),
          verification: summary(),
          revocationDisplay: null,
        },
        "https://humanity.llc"
      )
    );
    expect(printRevoked.scan.error).toBe("PRINT_QR_REVOKED");

    const qrExpired = scanStatusBodyFromViewModel(
      buildScanViewModel(
        PROFILE,
        QR,
        {
          card: card(),
          qr: qr({ status: "expired", expires_at: "2020-01-01T00:00:00Z" }),
          verification: summary(),
          revocationDisplay: null,
        },
        "https://humanity.llc"
      )
    );
    expect(qrExpired.scan.kind).toBe("qr_expired");
    expect(qrExpired.scan.error).toBe("QR_EXPIRED");
  });

  it("card suspended includes governance process URLs (F2-3)", () => {
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
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.governance?.data_policy_url).toBe(
      "https://humanity.llc/data-policy.html"
    );
    expect(body.scan.governance?.architecture_url).toBe(
      "https://humanity.llc/architecture.html"
    );
    expect(body.scan.governance?.appeal_url).toBe("https://humanity.llc/appeal/");
  });

  it("card revoked returns 410", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      { card: card({ status: "revoked" }), qr: qr(), verification: summary(), revocationDisplay: null },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("card_revoked");
    expect(httpStatusForScanKind(vm.kind)).toBe(410);
  });

  it("qr revoked returns 200 with qr_revoked kind (M4.2)", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      { card: card(), qr: qr({ status: "revoked" }), verification: summary(), revocationDisplay: null },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("qr_revoked");
    expect(httpStatusForScanKind(vm.kind)).toBe(200);
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.qr?.status).toBe("revoked");
  });

  it("malformed ids return 400", () => {
    const vm = malformedScanView("bad", QR, "https://humanity.llc");
    expect(vm.kind).toBe("malformed");
    expect(httpStatusForScanKind(vm.kind)).toBe(400);
  });

  it("malformed status response includes hint for invalid profile id", async () => {
    const { handleGetScanStatus } = await import("../src/resolver/scan-status");
    const db = d1WithRateLimitBuckets(() => ({
      bind: () => ({
        first: async () => null,
        run: async () => ({ meta: { changes: 0 } }),
      }),
    }));
    const res = await handleGetScanStatus(
      new Request("https://humanity.llc/.well-known/hc/v1/cards/not-valid/status?q=bad"),
      db,
      "not-valid"
    );
    const json = (await res.json()) as { scan: { kind: string }; hint?: string };
    expect(json.scan.kind).toBe("malformed");
    expect(json.hint).toMatch(/profile_id/);
    expect(res.status).toBe(400);
  });

  it("card-only status omits qr block fields", () => {
    const vm = buildCardOnlyScanViewModel(
      PROFILE,
      card(),
      summary(),
      "https://humanity.llc"
    );
    const body = scanStatusBodyFromViewModel(vm);
    expect(vm.kind).toBe("active");
    expect(body.scan.qr).toBeNull();
    expect(vm.showArtifactBlock).toBe(false);
    expect(body.scan.scan_url).toBeNull();
  });

  it("card-only unknown profile", () => {
    const vm = buildCardOnlyScanViewModel(
      PROFILE,
      null,
      null,
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("unknown_profile");
    expect(httpStatusForScanKind(vm.kind)).toBe(404);
  });

  it("active status returns ETag and 304 when If-None-Match matches", async () => {
    const ctx: ScanContext = {
      card: card(),
      qr: qr(),
      verification: summary(),
      revocationDisplay: null,
    };
    const db = d1WithRateLimitBuckets((sql: string) => ({
      bind: () => ({
        first: async () => {
          if (sql.includes("FROM cards")) return ctx.card;
          if (sql.includes("FROM qr_credentials")) return ctx.qr;
          if (sql.includes("verification_summaries")) return ctx.verification;
          return null;
        },
        run: async () => ({ meta: { changes: 0 } }),
      }),
    }));

    const { handleGetScanStatus } = await import("../src/resolver/scan-status");
    const url = `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/status?q=${QR}`;
    const first = await handleGetScanStatus(new Request(url), db, PROFILE);
    const etag = first.headers.get("ETag");
    expect(first.status).toBe(200);
    expect(etag).toBeTruthy();

    const second = await handleGetScanStatus(
      new Request(url, { headers: { "If-None-Match": etag! } }),
      db,
      PROFILE
    );
    expect(second.status).toBe(304);
    expect(second.headers.get("Cache-Control")).toContain("max-age=30");
  });

  it("GET status through worker.fetch includes CORS for Pages dev origin", async () => {
    const db = d1WithRateLimitBuckets(() => ({
      bind: () => ({
        first: async () => null,
        run: async () => ({ meta: { changes: 0 } }),
      }),
    }));
    const res = await worker.fetch(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/status?q=${QR}`,
        { headers: { Origin: "http://localhost:8788" } }
      ),
      { DB: db } as import("../src").Env,
      { waitUntil: () => {} } as ExecutionContext
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:8788"
    );
  });

  it("GET status through worker.fetch composes game node capabilities with city-game env", async () => {
    resetSeasonRegistryForTests();
    registerGameStatusTestSeason();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-07T18:00:00.000Z"));
    try {
      const ctx: ScanContext = {
        card: card({
          profile_id: GAME_PROFILE,
          handle: "season_root",
          handle_normalized: "season_root",
          manifesto_line: "Wake the city",
        }),
        qr: qr({
          qr_id: GAME_QR,
          profile_id: GAME_PROFILE,
          scope: "child_object",
          object_id: GAME_OBJECT,
          expires_at: null,
          payload: `https://humanity.llc/c/${GAME_PROFILE}?q=${GAME_QR}`,
        }),
        childObject: gameChild(),
        verification: { ...summary(), profile_id: GAME_PROFILE },
        revocationDisplay: null,
      };
      const db = d1WithRateLimitBuckets((sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes("FROM cards")) return ctx.card;
            if (sql.includes("FROM qr_credentials")) return ctx.qr;
            if (sql.includes("FROM child_objects")) return ctx.childObject;
            if (sql.includes("verification_summaries")) return ctx.verification;
            return null;
          },
          run: async () => ({ meta: { changes: 0 } }),
        }),
      }));

      const res = await worker.fetch(
        new Request(
          `https://humanity.llc/.well-known/hc/v1/cards/${GAME_PROFILE}/status?q=${GAME_QR}`
        ),
        { DB: db, CITY_GAME_ENABLED: "1" } as import("../src").Env,
        { waitUntil: () => {} } as ExecutionContext
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        scan: {
          capabilities: Array<{
            verb: string;
            available: boolean;
            kind?: string;
            state?: string;
          }>;
        };
      };
      expect(
        json.scan.capabilities.find((cap) => cap.verb === "contribute")
      ).toMatchObject({
        available: true,
        kind: "game_quorum",
      });
      expect(
        json.scan.capabilities.find((cap) => cap.verb === "archive")
      ).toMatchObject({
        available: false,
        state: "live",
      });
    } finally {
      vi.useRealTimers();
      resetSeasonRegistryForTests();
    }
  });
});
