import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resolverApiOrigin } = vi.hoisted(() => ({
  resolverApiOrigin: vi.fn(() => "https://humanity.llc"),
}));

vi.mock("../../site/js/hc-sign.mjs", () => ({
  decodePrivateKeyBase58: vi.fn(),
  resolverApiOrigin,
  signDocument: vi.fn(),
  withProtocolFields: vi.fn((doc: unknown) => doc),
}));

vi.mock("../../site/js/created-delegated-capability-core.mjs", () => ({
  buildDelegatedCapabilityIssueUnsigned: vi.fn(),
  buildDelegatedCapabilityRevokeUnsigned: vi.fn(),
  PAYLOAD_TYPE_DELEGATED_CAPABILITY: "delegated_capability",
}));

import {
  fetchDelegatedCapabilityList,
  postDelegatedCapabilityIssue,
  postDelegatedCapabilityRevoke,
} from "../../site/js/delegated-capability-sign.mjs";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const CAPABILITY_ID = "dc_testCapability01";

describe("delegated-capability-sign fetch/error mapping", () => {
  beforeEach(() => {
    resolverApiOrigin.mockReturnValue("https://humanity.llc");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("fetchDelegatedCapabilityList returns JSON on success", async () => {
    const body = { capabilities: [{ capability_id: CAPABILITY_ID }] };
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchDelegatedCapabilityList(PROFILE)).resolves.toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/delegated-capabilities`,
      { cache: "no-store" }
    );
  });

  it("fetchDelegatedCapabilityList maps resolver errors without leaking URLs", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: "FORBIDDEN",
            message: "Not allowed (https://humanity.llc/.well-known/hc/v1/cards/x)",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await expect(fetchDelegatedCapabilityList(PROFILE)).rejects.toThrow("Not allowed");
    warn.mockRestore();
  });

  it("postDelegatedCapabilityIssue posts capability and surfaces fallback on empty body", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("not-json", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      postDelegatedCapabilityIssue(PROFILE, { capability_id: CAPABILITY_ID })
    ).rejects.toThrow("Could not reach humanity.llc. Try again in a moment.");

    expect(fetchMock.mock.calls[0][0]).toContain(`/cards/${PROFILE}/delegated-capabilities`);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
    warn.mockRestore();
  });

  it("postDelegatedCapabilityRevoke posts to revoke path and returns body", async () => {
    const body = { ok: true, revoked: CAPABILITY_ID };
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      postDelegatedCapabilityRevoke(PROFILE, CAPABILITY_ID, { capability_id: CAPABILITY_ID })
    ).resolves.toEqual(body);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/delegated-capabilities/${CAPABILITY_ID}/revoke`
    );
  });

  it("encodes profile and capability ids in API paths", async () => {
    const weirdProfile = "prof/with space";
    const weirdCap = "dc/a b";
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await postDelegatedCapabilityRevoke(weirdProfile, weirdCap, {});
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://humanity.llc/.well-known/hc/v1/cards/prof%2Fwith%20space/delegated-capabilities/dc%2Fa%20b/revoke"
    );
  });
});
