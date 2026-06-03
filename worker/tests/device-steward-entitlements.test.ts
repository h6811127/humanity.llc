import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../site/js/hc-sign.mjs", () => ({
  resolverApiOrigin: () => "https://resolver.test",
}));

vi.mock("../../site/js/device-keys.mjs", () => ({
  getTabSession: () => {
    const raw = sessionStorage.getItem("hc_created");
    return raw ? JSON.parse(raw) : null;
  },
}));

const HOSTED_BODY = {
  plan_id: "hosted_steward_v1",
  status: "active",
  entitlements: {
    "steward.hosted": true,
    "notify.push.live_proof": true,
    "poll.live_proof.auto_daily_cap": 4000,
    "poll.live_proof.idle_ms": 30_000,
    "poll.live_proof.active_ms": 5000,
    "poll.network.max_parallel": 5,
    "poll.network.manual_max_parallel": 3,
    "wallet.large_threshold": 25,
    "sw.periodic_min_ms": 300_000,
  },
};

const FREE_BODY = {
  plan_id: "reference_free",
  status: "active",
  entitlements: {
    "steward.hosted": false,
    "notify.push.live_proof": false,
    "poll.live_proof.auto_daily_cap": 400,
    "poll.live_proof.idle_ms": 60_000,
    "wallet.large_threshold": 10,
  },
};

function storageFor(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

function jsonResponse(body, init = {}) {
  const status = init.status ?? 200;
  const headers = new Map();
  if (init.etag) headers.set("etag", init.etag);
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name) => headers.get(String(name).toLowerCase()) ?? null,
    },
    json: async () => body,
  };
}

function mockStewardEntitlementsFetch(body, init = {}) {
  vi.mocked(fetch).mockImplementation(async (url) => {
    if (String(url).includes("city-game-seasons-index")) {
      return jsonResponse({ seasons: [] });
    }
    return jsonResponse(body, init);
  });
}

async function importEntitlements() {
  return import("../../site/js/device-steward-entitlements.mjs");
}

describe("refreshStewardEntitlements", () => {
  let sessionStore;
  let localStore;

  beforeEach(() => {
    vi.resetModules();
    sessionStore = storageFor();
    localStore = storageFor();
    vi.stubGlobal("sessionStorage", sessionStore);
    vi.stubGlobal("localStorage", localStore);
    vi.stubGlobal("crypto", { randomUUID: () => "device-test-12345678" });
    vi.stubGlobal("window", { dispatchEvent: vi.fn(), addEventListener: vi.fn() });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses reference_free policy without signing keys or steward session", async () => {
    const mod = await importEntitlements();

    const policy = await mod.refreshStewardEntitlements({ force: true });

    expect(policy).toEqual(mod.REFERENCE_FREE_POLICY);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches hosted entitlements with bearer, device id, and cache headers", async () => {
    sessionStorage.setItem("hc_created", JSON.stringify({ profile_id: "p1" }));
    modWriteSessionPlaceholder();
    mockStewardEntitlementsFetch(HOSTED_BODY, { etag: '"hosted-1"' });
    const mod = await importEntitlements();

    const policy = await mod.refreshStewardEntitlements({ force: true });

    expect(policy.stewardHosted).toBe(true);
    expect(policy.pollLiveProofAutoDailyCap).toBe(4000);
    expect(policy.pollLiveProofIdleMs).toBe(30_000);
    expect(policy.walletLargeThreshold).toBe(25);
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://resolver.test/.well-known/hc/v1/steward/entitlements",
      expect.objectContaining({
        method: "GET",
        credentials: "omit",
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
          "X-HC-Device-Id": "device-test-12345678",
        }),
      })
    );
    expect(JSON.parse(sessionStorage.getItem("hc_steward_entitlements_cache") ?? "{}")).toMatchObject({
      etag: '"hosted-1"',
      body: { plan_id: "hosted_steward_v1" },
    });
  });

  it("reuses a fresh cached policy without refetching", async () => {
    sessionStorage.setItem("hc_created", JSON.stringify({ profile_id: "p1" }));
    modWriteSessionPlaceholder();
    sessionStorage.setItem(
      "hc_steward_entitlements_cache",
      JSON.stringify({ fetchedAt: Date.now(), etag: '"hosted-1"', body: HOSTED_BODY })
    );
    const mod = await importEntitlements();

    const policy = await mod.refreshStewardEntitlements();

    expect(policy.stewardHosted).toBe(true);
    expect(policy.pollLiveProofAutoDailyCap).toBe(4000);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reuses cached entitlements on 304 and sends If-None-Match", async () => {
    sessionStorage.setItem("hc_created", JSON.stringify({ profile_id: "p1" }));
    modWriteSessionPlaceholder();
    sessionStorage.setItem(
      "hc_steward_entitlements_cache",
      JSON.stringify({ fetchedAt: 1, etag: '"hosted-1"', body: HOSTED_BODY })
    );
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (url, init) => {
      if (String(url).includes("city-game-seasons-index")) {
        return jsonResponse({ seasons: [] });
      }
      if (init?.headers && "If-None-Match" in init.headers) {
        return jsonResponse({}, { status: 304 });
      }
      return jsonResponse(HOSTED_BODY, { etag: '"hosted-1"' });
    });
    const mod = await importEntitlements();

    const policy = await mod.refreshStewardEntitlements({ force: true });

    expect(policy.stewardHosted).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ "If-None-Match": '"hosted-1"' }),
      })
    );
  });

  it("clears session and cached policy on 401", async () => {
    sessionStorage.setItem("hc_created", JSON.stringify({ profile_id: "p1" }));
    modWriteSessionPlaceholder();
    mockStewardEntitlementsFetch({}, { status: 401 });
    const mod = await importEntitlements();

    const policy = await mod.refreshStewardEntitlements({ force: true });

    expect(policy).toEqual(mod.REFERENCE_FREE_POLICY);
    expect(sessionStorage.getItem("hc_steward_session")).toBeNull();
    expect(sessionStorage.getItem("hc_steward_entitlements_cache")).toBeNull();
  });
});

describe("getStewardBillingReturnPendingLine", () => {
  let sessionStore: ReturnType<typeof storageFor>;

  beforeEach(() => {
    vi.resetModules();
    sessionStore = storageFor();
    vi.stubGlobal("sessionStorage", sessionStore);
    vi.stubGlobal("localStorage", storageFor());
    vi.stubGlobal("location", {
      search: "?hc_account_id=acc_TestHostedSteward1",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when steward session already exists", async () => {
    sessionStore.setItem("hc_steward_session", JSON.stringify({ token: "tok" }));
    const mod = await importEntitlements();
    expect(mod.getStewardBillingReturnPendingLine()).toBeNull();
  });

  it("returns import copy when checkout return is pending without keys", async () => {
    const mod = await importEntitlements();
    const line = mod.getStewardBillingReturnPendingLine();
    expect(line).toContain("open or import");
  });

  it("returns finishing copy when keys are loaded in tab", async () => {
    sessionStore.setItem(
      "hc_created",
      JSON.stringify({ profile_id: "p1", owner_private_key_b58: "priv" })
    );
    const mod = await importEntitlements();
    expect(mod.getStewardBillingReturnPendingLine()).toContain("Finishing hosted plan link");
  });
});

function modWriteSessionPlaceholder() {
  sessionStorage.setItem("hc_steward_session", JSON.stringify({ token: "token-1" }));
}
