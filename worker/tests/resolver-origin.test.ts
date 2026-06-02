import { describe, expect, it } from "vitest";

import {
  localDevPagesOrigin,
  localDevResolverOrigin,
  pagesJsOrigin,
  requestOrigin,
  scanPageOrigin,
  type ScanPageOriginEnv,
} from "../src/http/resolver";

describe("requestOrigin", () => {
  it("uses local origin for direct 127.0.0.1 scan URLs", () => {
    const request = new Request("http://127.0.0.1:8787/c/profile?q=qr_test", {
      headers: { Host: "127.0.0.1:8787" },
    });
    expect(requestOrigin(request)).toBe("http://127.0.0.1:8787");
  });

  it("detects wrangler dev when route host is production but Host is local", () => {
    const request = new Request("https://humanity.llc/c/profile?q=qr_test", {
      headers: { Host: "127.0.0.1:8787" },
    });
    expect(requestOrigin(request)).toBe("http://127.0.0.1:8787");
    expect(localDevResolverOrigin(request)).toBe("http://127.0.0.1:8787");
    expect(localDevPagesOrigin(request)).toBe("http://127.0.0.1:8788");
  });

  it("detects wrangler dev when hostname embeds the port", () => {
    const request = new Request("http://127.0.0.1:8787/c/profile?q=qr_test");
    expect(localDevResolverOrigin(request)).toBe("http://127.0.0.1:8787");
    expect(localDevPagesOrigin(request)).toBe("http://127.0.0.1:8788");
  });

  it("returns production origin for real production requests", () => {
    const request = new Request("https://humanity.llc/c/profile?q=qr_test", {
      headers: { Host: "humanity.llc" },
    });
    expect(requestOrigin(request)).toBe("https://humanity.llc");
    expect(localDevPagesOrigin(request)).toBeNull();
  });

  it("uses SCAN_* env overrides when wrangler simulates production host", () => {
    const request = new Request("https://humanity.llc/c/profile?q=qr_test", {
      headers: { Host: "humanity.llc" },
    });
    const env: ScanPageOriginEnv = {
      SCAN_RESOLVER_ORIGIN: "http://127.0.0.1:8787",
      SCAN_PAGES_JS_ORIGIN: "http://127.0.0.1:8788",
    };
    expect(scanPageOrigin("https://humanity.llc", request, env)).toBe(
      "http://127.0.0.1:8787"
    );
    expect(pagesJsOrigin("https://humanity.llc", request, env)).toBe(
      "http://127.0.0.1:8788"
    );
  });
});
