/**
 * Resolver health `build` field (Worker deploy stamp).
 * @see docs/SITE_BUILD_VERSIONING.md — Phase 3
 */
import {
  WORKER_BUILD_META,
  type WorkerBuildMeta,
} from "./generated/worker-build-meta";

export type ResolverHealthBuildField = {
  gitSha: string;
  builtAt: string;
  source: string;
};

export function resolverHealthBuildField(
  meta: WorkerBuildMeta = WORKER_BUILD_META
): ResolverHealthBuildField {
  return {
    gitSha: meta.gitSha,
    builtAt: meta.builtAt,
    source: meta.source,
  };
}
