import { foreignKeyIntegrityOk, schemaReady } from "../db";
import {
  checkResolverHealthRateLimit,
  hashIp,
} from "../db/rate-limit";
import type { Env } from "../env";
import {
  clientIp,
  errorResponse,
  jsonResponse,
  OPERATOR_ID,
  PROTOCOL_VERSION,
} from "../http/resolver";
import {
  operatorHealthDegradedByBudget,
  readOperatorRequestBudget,
} from "../operator/request-budget";
import { resolverHealthBuildField } from "../resolver-health-build";

/**
 * GET /.well-known/hc/v1/health
 */
export async function handleGetResolverHealth(
  request: Request,
  env: Env
): Promise<Response> {
  if (env.DB) {
    const ipHash = await hashIp(clientIp(request));
    const rate = await checkResolverHealthRateLimit(env.DB, ipHash);
    if (!rate.allowed) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many health checks from this network. Try again later.",
        429,
        rate.retryAfterSec
          ? { "Retry-After": String(rate.retryAfterSec) }
          : undefined
      );
    }
  }

  const body: {
    version: string;
    operator: string;
    status: string;
    database: string;
    foreign_keys?: string;
    budget?: {
      state: string;
      count: number;
      soft_cap: number;
      hard_cap: number;
      window_key: string;
    };
    build: ReturnType<typeof resolverHealthBuildField>;
  } = {
    version: PROTOCOL_VERSION,
    operator: OPERATOR_ID,
    status: "ok",
    database: "unknown",
    build: resolverHealthBuildField(),
  };

  if (!env.DB) {
    body.database = "unconfigured";
    body.status = "degraded";
    return jsonResponse(body, 503);
  }

  try {
    const ready = await schemaReady(env.DB);
    body.database = ready ? "ok" : "schema_missing";
    if (!ready) {
      body.status = "degraded";
      return jsonResponse(body, 503);
    }
    const fkOk = await foreignKeyIntegrityOk(env.DB);
    body.foreign_keys = fkOk ? "ok" : "violation";
    if (!fkOk) {
      body.status = "degraded";
      return jsonResponse(body, 503);
    }

    const budget = await readOperatorRequestBudget(env, env.DB);
    if (budget.enabled) {
      body.budget = {
        state: budget.state,
        count: budget.count,
        soft_cap: budget.softCap,
        hard_cap: budget.hardCap,
        window_key: budget.windowKey,
      };
      if (operatorHealthDegradedByBudget(budget.state)) {
        body.status = "degraded";
        return jsonResponse(body, 200);
      }
    }
  } catch {
    body.database = "error";
    body.status = "degraded";
    return jsonResponse(body, 503);
  }

  return jsonResponse(body, 200);
}
