import { describe, expect, it } from "vitest";

import {
  parseCliArgs,
  runM6VouchSmoke,
  type M6SmokeCase,
} from "../scripts/m6-vouch-smoke";

function response(body: unknown, status = 200): Response {
  return new Response(
    typeof body === "string" ? body : JSON.stringify(body),
    { status }
  );
}

describe("M6 vouch production smoke runner", () => {
  it("checks status JSON and scan HTML for each configured case", async () => {
    const seen: string[] = [];
    const cases: M6SmokeCase[] = [
      {
        name: "0 vouches",
        profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
        qr_id: "qr_zero_vouches",
        expected: {
          kind: "active",
          vouch_count: 0,
          human_trust_label: "Registered",
          verification_state: "registered",
          card_status: "active",
          qr_status: "active",
          scan_includes: ["Registered"],
        },
      },
      {
        name: "revoked override",
        profile_id: "8Ym8nQ3pR5sU7wX9zA2bC4dE6",
        qr_id: "qr_revoked_card",
        expected: {
          kind: "card_revoked",
          vouch_count: 3,
          human_trust_label: "Disabled",
          card_status: "revoked",
          scan_includes: ["This card has been disabled"],
        },
      },
    ];

    const results = await runM6VouchSmoke(cases, {
      origin: "https://example.test/",
      fetchImpl: async (url) => {
        seen.push(url);
        if (url.includes("/status")) {
          if (url.includes("qr_revoked_card")) {
            return response(
              {
                scan: {
                  kind: "card_revoked",
                  verification: { state: "verified_human", vouch_count: 3 },
                  human_trust: { label: "Disabled" },
                  card: { status: "revoked" },
                  qr: { status: "active" },
                },
              },
              410
            );
          }
          return response({
            scan: {
              kind: "active",
              verification: { state: "registered", vouch_count: 0 },
              human_trust: { label: "Registered" },
              card: { status: "active" },
              qr: { status: "active" },
            },
          });
        }
        if (url.includes("qr_revoked_card")) {
          return response("This card has been disabled", 410);
        }
        return response("Registered");
      },
    });

    expect(results).toHaveLength(2);
    expect(seen).toEqual([
      "https://example.test/.well-known/hc/v1/cards/7Xk9mP2nQ4rT6vW8yZ1aB3cD5/status?q=qr_zero_vouches",
      "https://example.test/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_zero_vouches",
      "https://example.test/.well-known/hc/v1/cards/8Ym8nQ3pR5sU7wX9zA2bC4dE6/status?q=qr_revoked_card",
      "https://example.test/c/8Ym8nQ3pR5sU7wX9zA2bC4dE6?q=qr_revoked_card",
    ]);
  });

  it("fails clearly when a configured expectation does not match", async () => {
    await expect(
      runM6VouchSmoke(
        [
          {
            name: "wrong count",
            profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
            qr_id: "qr_wrong_count",
            expected: {
              kind: "active",
              vouch_count: 2,
              human_trust_label: "Registered",
            },
          },
        ],
        {
          fetchImpl: async (url) =>
            url.includes("/status")
              ? response({
                  scan: {
                    kind: "active",
                    verification: { vouch_count: 0 },
                    human_trust: { label: "Registered" },
                  },
                })
              : response("Registered"),
        }
      )
    ).rejects.toThrow(
      'wrong count: expected scan.verification.vouch_count 2, got 0'
    );
  });

  it("parses required CLI arguments", () => {
    expect(
      parseCliArgs([
        "--origin=https://humanity.llc/",
        "--cases=./m6-smoke-cases.json",
      ])
    ).toEqual({
      origin: "https://humanity.llc",
      casesPath: "./m6-smoke-cases.json",
    });
  });
});
