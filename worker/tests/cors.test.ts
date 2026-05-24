import { describe, expect, it } from "vitest";

import { corsHeaders } from "../src/http/resolver";

describe("resolver CORS headers", () => {
  it("allows local Pages to call local Worker private-network endpoints", () => {
    const headers = corsHeaders(
      new Request("http://127.0.0.1:8787/.well-known/hc/v1/cards/profile", {
        headers: {
          Origin: "http://localhost:8788",
          "Access-Control-Request-Private-Network": "true",
        },
      })
    ) as Record<string, string>;

    expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:8788");
    expect(headers["Access-Control-Allow-Private-Network"]).toBe("true");
  });
});
