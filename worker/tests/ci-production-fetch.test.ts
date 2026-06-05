import { describe, expect, it } from "vitest";

import {
  buildCiDeployVerifyHeaders,
  CI_DEPLOY_VERIFY_HEADER,
  CI_DEPLOY_VERIFY_USER_AGENT,
  isCloudflareBotChallengeBody,
  resolveCiSiteOrigins,
  shouldRetryCiProductionFetch,
} from "../scripts/ci-production-fetch.mjs";

describe("ci-production-fetch", () => {
  it("buildCiDeployVerifyHeaders sets CI user-agent and optional bypass header", () => {
    const prev = process.env.HC_CI_VERIFY_SECRET;
    delete process.env.HC_CI_VERIFY_SECRET;
    expect(buildCiDeployVerifyHeaders()).toEqual({
      "User-Agent": CI_DEPLOY_VERIFY_USER_AGENT,
    });
    process.env.HC_CI_VERIFY_SECRET = "test-secret";
    expect(buildCiDeployVerifyHeaders()).toEqual({
      "User-Agent": CI_DEPLOY_VERIFY_USER_AGENT,
      [CI_DEPLOY_VERIFY_HEADER]: "test-secret",
    });
    if (prev === undefined) delete process.env.HC_CI_VERIFY_SECRET;
    else process.env.HC_CI_VERIFY_SECRET = prev;
  });

  it("resolveCiSiteOrigins dedupes when primary matches fallback", () => {
    expect(
      resolveCiSiteOrigins("https://humanity.llc", "https://humanity.llc")
    ).toEqual(["https://humanity.llc"]);
    expect(resolveCiSiteOrigins("https://humanity.llc", "https://humanity-llc.pages.dev")).toEqual([
      "https://humanity.llc",
      "https://humanity-llc.pages.dev",
    ]);
  });

  it("isCloudflareBotChallengeBody detects challenge HTML", () => {
    expect(isCloudflareBotChallengeBody("<title>Just a moment...</title>")).toBe(true);
    expect(isCloudflareBotChallengeBody('{"ok":true}')).toBe(false);
  });

  it("shouldRetryCiProductionFetch retries 403 and challenge bodies", () => {
    expect(shouldRetryCiProductionFetch({ status: 403, ok: false } as Response, "")).toBe(true);
    expect(
      shouldRetryCiProductionFetch(
        { status: 503, ok: false } as Response,
        "<html>Just a moment</html>"
      )
    ).toBe(true);
    expect(shouldRetryCiProductionFetch({ status: 404, ok: false } as Response, "not found")).toBe(
      false
    );
  });
});
