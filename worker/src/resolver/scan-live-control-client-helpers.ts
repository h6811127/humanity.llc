/**
 * Inline JS helpers for scan live-control client (H-01, H-03).
 * @see docs/LIVE_CONTROL_USABILITY_HARDENING.md
 */
export function scanLiveControlClientHelpersJs(): string {
  return `
  function stripResolverUrlsFromMessage(raw) {
    var stripped = String(raw || "")
      .replace(/\\s*\\(https?:\\/\\/[^)]+\\)/gi, "")
      .replace(/\\s*\\([^)]*\\.well-known\\/[^)]*\\)/gi, "")
      .replace(/^\\s*https?:\\/\\/\\S+/gi, "")
      .replace(/\\s+https?:\\/\\/\\S+/gi, "")
      .trim();
    if (/^https?:\\/\\/\\S+$/i.test(stripped)) return "";
    return stripped;
  }
  function logResolverRequestFailure(requestUrl, detail) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[resolver]", requestUrl, detail || {});
    }
  }
  function liveControlUserErrorMessage(payload, options) {
    options = options || {};
    var status = options.status;
    var fallback = options.fallback;
    var requestUrl = options.requestUrl;
    var raw =
      typeof payload === "string"
        ? payload
        : String((payload && (payload.message || payload.error)) || "").trim();
    if (requestUrl) {
      logResolverRequestFailure(requestUrl, {
        status: status,
        error: typeof payload === "object" ? payload && payload.error : undefined,
        message: raw,
      });
    }
    var stripped = stripResolverUrlsFromMessage(raw);
    if (stripped) return stripped;
    if (typeof status === "number" && status >= 500) {
      return "Could not reach the resolver. Try again in a moment.";
    }
    return fallback || "Something went wrong. Try again.";
  }
  function parseLiveControlJsonResponse(res) {
    return res.text().then(function (text) {
      var body = {};
      var trimmed = String(text || "").trim();
      var contentType = (res.headers.get("content-type") || "").toLowerCase();
      var looksJson =
        contentType.indexOf("application/json") >= 0 ||
        trimmed.charAt(0) === "{" ||
        trimmed.charAt(0) === "[";
      if (looksJson && trimmed) {
        try {
          body = JSON.parse(trimmed);
        } catch (e) {
          body = {};
        }
      }
      return { ok: res.ok, status: res.status, body: body, text: text };
    });
  }
  function liveControlChallengeCreateError(result, requestUrl) {
    var body = result.body || {};
    logResolverRequestFailure(requestUrl, {
      status: result.status,
      error: body.error,
      message: body.message,
    });
    if (body.error === "RESOLVER_SCHEMA") {
      return "Live proof is temporarily unavailable. Try again shortly.";
    }
    if (body.error === "LIVE_CONTROL_UNAVAILABLE") {
      return (
        liveControlUserErrorMessage(body, {
          status: result.status,
          fallback: "Live proof is not available for this scan right now.",
        })
      );
    }
    if (result.status >= 500 || /error code:\\s*1101/i.test(result.text || "")) {
      return "Could not create live proof request. Try again in a moment.";
    }
    return liveControlUserErrorMessage(body, {
      status: result.status,
      fallback: "Could not create live proof request.",
    });
  }
`;
}
