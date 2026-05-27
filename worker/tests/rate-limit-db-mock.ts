/**
 * In-memory rate_limit_buckets mock for Vitest D1 stubs.
 */
export class RateLimitBucketStore {
  private readonly buckets = new Map<string, { count: number; window_start: string }>();

  prepare(sql: string) {
    const buckets = this.buckets;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("SELECT count FROM rate_limit_buckets WHERE bucket_key = ?")) {
              const key = args[0] as string;
              const row = buckets.get(key);
              return (row ? { count: row.count } : null) as T | null;
            }
            return null as T | null;
          },
          async run() {
            if (sql.includes("UPDATE rate_limit_buckets SET count = count + 1")) {
              const key = args[0] as string;
              const existing = buckets.get(key);
              if (existing) existing.count += 1;
              return { meta: { changes: existing ? 1 : 0 } };
            }
            if (sql.includes("INSERT INTO rate_limit_buckets")) {
              const [key, windowStart] = args as [string, string];
              buckets.set(key, { count: 1, window_start: windowStart });
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

type PrepareFn = (sql: string) => {
  bind: (...args: unknown[]) => {
    first?: () => Promise<unknown>;
    run?: () => Promise<unknown>;
    all?: () => Promise<unknown>;
  };
};

/** Merge rate_limit_buckets support into an existing D1 prepare stub. */
export function d1WithRateLimitBuckets(basePrepare: PrepareFn): D1Database {
  const store = new RateLimitBucketStore();
  return {
    prepare(sql: string) {
      if (sql.includes("rate_limit_buckets")) {
        return store.prepare(sql);
      }
      return basePrepare(sql);
    },
  } as unknown as D1Database;
}
