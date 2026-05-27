import { describe, expect, it } from "vitest";

import {
  classifyCardLookupStatus,
  createdInvalidLinkMessage,
  createdRouteNeedsProfileLookup,
  evaluateCreatedEarlyBootstrap,
  isCreatedSessionProfileMismatch,
  parseCreatedUrlSearch,
  parseHcCreatedSession,
  resolveCreatedQrId,
  shouldRedirectCreatedToWallet,
} from "../../site/js/created-route-gate-core.mjs";
import {
  createdRouteHeroTitle,
  createdRouteShellState,
  gateCreatedRoute,
} from "../../site/js/created-route-gate.mjs";

describe("created-route-gate-core", () => {
  it("classifies card lookup HTTP statuses", () => {
    expect(classifyCardLookupStatus(200)).toBe("ok");
    expect(classifyCardLookupStatus(404)).toBe("not_found");
    expect(classifyCardLookupStatus(400)).toBe("bad_request");
    expect(classifyCardLookupStatus(422)).toBe("bad_request");
    expect(classifyCardLookupStatus(503)).toBe("unreachable");
  });

  it("parses created URL params", () => {
    expect(parseCreatedUrlSearch("?profile_id=p1&qr_id=qr_1")).toEqual({
      profileIdParam: "p1",
      qrIdParam: "qr_1",
    });
    expect(parseCreatedUrlSearch("")).toEqual({
      profileIdParam: null,
      qrIdParam: null,
    });
  });

  it("parses hc_created session JSON", () => {
    expect(parseHcCreatedSession(null)).toBeNull();
    expect(parseHcCreatedSession("{")).toBeNull();
    expect(parseHcCreatedSession('{"profile_id":"p1"}')).toEqual({ profile_id: "p1" });
  });

  it("evaluates early bootstrap for bare /created/", () => {
    expect(
      evaluateCreatedEarlyBootstrap({ locationSearch: "", session: null })
    ).toEqual({ action: "redirect_wallet" });
    expect(
      evaluateCreatedEarlyBootstrap({
        locationSearch: "?profile_id=p1",
        session: null,
      })
    ).toEqual({ action: "pending_shell" });
    expect(
      evaluateCreatedEarlyBootstrap({
        locationSearch: "",
        session: { qr_id: "qr_tab" },
      })
    ).toEqual({ action: "pending_shell" });
  });

  it("redirects wallet when no params and no session", () => {
    expect(shouldRedirectCreatedToWallet({ profileIdParam: null, qrIdParam: null, session: null })).toBe(
      true
    );
    expect(
      shouldRedirectCreatedToWallet({
        profileIdParam: "abc",
        qrIdParam: null,
        session: null,
      })
    ).toBe(false);
    expect(
      shouldRedirectCreatedToWallet({
        profileIdParam: null,
        qrIdParam: null,
        session: { profile_id: "p1", qr_id: "qr_1" },
      })
    ).toBe(false);
  });

  it("detects session profile mismatch", () => {
    expect(
      isCreatedSessionProfileMismatch({
        profileIdParam: "a",
        sessionProfileId: "b",
      })
    ).toBe(true);
    expect(
      isCreatedSessionProfileMismatch({
        profileIdParam: "a",
        sessionProfileId: "a",
      })
    ).toBe(false);
  });

  it("resolves qr id from param, session, then card", () => {
    expect(
      resolveCreatedQrId({
        qrIdParam: "qr_param",
        sessionQrId: "qr_sess",
        cardActiveQrId: "qr_card",
      })
    ).toBe("qr_param");
    expect(
      resolveCreatedQrId({
        qrIdParam: null,
        sessionQrId: "qr_sess",
        cardActiveQrId: "qr_card",
      })
    ).toBe("qr_sess");
    expect(
      resolveCreatedQrId({
        qrIdParam: null,
        sessionQrId: null,
        cardActiveQrId: "qr_card",
      })
    ).toBe("qr_card");
  });

  it("needs profile lookup when profile id present", () => {
    expect(createdRouteNeedsProfileLookup("nSVXWPqgRFEhGPjxyRzidF6s")).toBe(true);
    expect(createdRouteNeedsProfileLookup("")).toBe(false);
  });

  it("maps invalid link messages", () => {
    expect(createdInvalidLinkMessage("not_found")).toMatch(/not found/i);
    expect(createdInvalidLinkMessage("bad_request")).toMatch(/invalid profile/i);
  });
});

describe("gateCreatedRoute", () => {
  it("returns redirect_wallet for bare /created/ with no session", async () => {
    const gate = await gateCreatedRoute({
      profileIdParam: null,
      qrIdParam: null,
      loadSession: () => null,
    });
    expect(gate.action).toBe("redirect_wallet");
  });

  it("returns invalid_link when card lookup fails", async () => {
    const gate = await gateCreatedRoute({
      profileIdParam: "fakeprofileid123456789012345",
      qrIdParam: "qr_x",
      loadSession: () => null,
      fetchCard: async () =>
        new Response(JSON.stringify({ error: "INVALID_PROFILE_ID" }), { status: 400 }),
    });
    expect(gate.action).toBe("invalid_link");
    expect(gate.message).toMatch(/invalid profile/i);
  });

  it("returns ok and fills qr from card when URL omits q", async () => {
    const gate = await gateCreatedRoute({
      profileIdParam: "profile_abc",
      qrIdParam: null,
      loadSession: () => null,
      fetchCard: async () =>
        new Response(
          JSON.stringify({
            profile_id: "profile_abc",
            handle: "river",
            qr: { active_qr_id: "qr_from_card" },
          }),
          { status: 200 }
        ),
      fetchStatus: async () => new Response("{}", { status: 200 }),
    });
    expect(gate.action).toBe("ok");
    expect(gate.profileId).toBe("profile_abc");
    expect(gate.qrId).toBe("qr_from_card");
  });

  it("returns incomplete_link when card has no qr and URL lacks q", async () => {
    const gate = await gateCreatedRoute({
      profileIdParam: "profile_abc",
      qrIdParam: null,
      loadSession: () => null,
      fetchCard: async () =>
        new Response(JSON.stringify({ profile_id: "profile_abc", handle: "river" }), {
          status: 200,
        }),
    });
    expect(gate.action).toBe("incomplete_link");
  });

  it("returns session_mismatch when URL profile differs from tab keys", async () => {
    const gate = await gateCreatedRoute({
      profileIdParam: "profile_url",
      qrIdParam: "qr_1",
      loadSession: () => ({
        profile_id: "profile_tab",
        qr_id: "qr_tab",
        owner_private_key_b58: "k",
      }),
      fetchCard: async () => new Response("{}", { status: 200 }),
    });
    expect(gate.action).toBe("session_mismatch");
  });
});

describe("createdRouteShellState", () => {
  it("maps actions to shell dataset values", () => {
    expect(createdRouteShellState({ action: "ok" })).toBe("ok");
    expect(createdRouteShellState({ action: "invalid_link" })).toBe("invalid");
    expect(createdRouteShellState({ action: "incomplete_link" })).toBe("blocked");
  });

  it("sets blocked hero titles", () => {
    expect(createdRouteHeroTitle({ action: "invalid_link" })).toBe("Link not valid");
    expect(createdRouteHeroTitle({ action: "ok" })).toBeNull();
  });
});
