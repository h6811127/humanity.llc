import { readFile } from "node:fs/promises";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface M6SmokeCase {
  name: string;
  profile_id: string;
  qr_id: string;
  expected: {
    kind: string;
    vouch_count: number;
    human_trust_label: string;
    status_http?: number;
    scan_http?: number;
    verification_state?: string | null;
    card_status?: string | null;
    qr_status?: string | null;
    scan_includes?: string[];
  };
}

export interface M6SmokeResult {
  name: string;
  status_url: string;
  scan_url: string;
  status_http: number;
  scan_http: number;
}

interface StatusBody {
  scan?: {
    kind?: string;
    verification?: {
      state?: string | null;
      vouch_count?: number;
    };
    human_trust?: {
      label?: string;
    };
    card?: {
      status?: string | null;
    } | null;
    qr?: {
      status?: string | null;
    } | null;
  };
}

interface CliOptions {
  origin: string;
  casesPath: string;
}

const DEFAULT_ORIGIN = "https://humanity.llc";

export async function runM6VouchSmoke(
  cases: M6SmokeCase[],
  options: { origin?: string; fetchImpl?: FetchLike } = {}
): Promise<M6SmokeResult[]> {
  const origin = normalizeOrigin(options.origin ?? DEFAULT_ORIGIN);
  const fetchImpl = options.fetchImpl ?? fetch;
  const results: M6SmokeResult[] = [];

  for (const testCase of cases) {
    validateCaseShape(testCase);
    const statusUrl = `${origin}/.well-known/hc/v1/cards/${encodeURIComponent(
      testCase.profile_id
    )}/status?q=${encodeURIComponent(testCase.qr_id)}`;
    const scanUrl = `${origin}/c/${encodeURIComponent(
      testCase.profile_id
    )}?q=${encodeURIComponent(testCase.qr_id)}`;

    const statusRes = await fetchImpl(statusUrl, {
      headers: { Accept: "application/json" },
    });
    const statusBody = (await statusRes.json()) as StatusBody;
    const scanRes = await fetchImpl(scanUrl, {
      headers: { Accept: "text/html" },
    });
    const scanHtml = await scanRes.text();

    assertEqual(
      testCase.name,
      "status HTTP",
      statusRes.status,
      testCase.expected.status_http ?? defaultHttpForKind(testCase.expected.kind)
    );
    assertEqual(
      testCase.name,
      "scan HTTP",
      scanRes.status,
      testCase.expected.scan_http ?? defaultHttpForKind(testCase.expected.kind)
    );
    assertEqual(testCase.name, "scan.kind", statusBody.scan?.kind, testCase.expected.kind);
    assertEqual(
      testCase.name,
      "scan.verification.vouch_count",
      statusBody.scan?.verification?.vouch_count,
      testCase.expected.vouch_count
    );
    assertEqual(
      testCase.name,
      "scan.human_trust.label",
      statusBody.scan?.human_trust?.label,
      testCase.expected.human_trust_label
    );

    if ("verification_state" in testCase.expected) {
      assertEqual(
        testCase.name,
        "scan.verification.state",
        statusBody.scan?.verification?.state,
        testCase.expected.verification_state
      );
    }
    if ("card_status" in testCase.expected) {
      assertEqual(
        testCase.name,
        "scan.card.status",
        statusBody.scan?.card?.status,
        testCase.expected.card_status
      );
    }
    if ("qr_status" in testCase.expected) {
      assertEqual(
        testCase.name,
        "scan.qr.status",
        statusBody.scan?.qr?.status,
        testCase.expected.qr_status
      );
    }

    for (const snippet of testCase.expected.scan_includes ?? []) {
      if (!scanHtml.includes(snippet)) {
        throw new Error(`${testCase.name}: scan HTML missing ${JSON.stringify(snippet)}`);
      }
    }

    results.push({
      name: testCase.name,
      status_url: statusUrl,
      scan_url: scanUrl,
      status_http: statusRes.status,
      scan_http: scanRes.status,
    });
  }

  return results;
}

export async function loadSmokeCases(path: string): Promise<M6SmokeCase[]> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Smoke case file must contain a JSON array.");
  }
  return parsed as M6SmokeCase[];
}

export function parseCliArgs(argv: string[]): CliOptions {
  let origin = DEFAULT_ORIGIN;
  let casesPath = "";

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      throw new Error(usage());
    }
    if (arg.startsWith("--origin=")) {
      origin = arg.slice("--origin=".length);
      continue;
    }
    if (arg.startsWith("--cases=")) {
      casesPath = arg.slice("--cases=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}\n\n${usage()}`);
  }

  if (!casesPath) {
    throw new Error(`Missing --cases path.\n\n${usage()}`);
  }
  return { origin: normalizeOrigin(origin), casesPath };
}

function validateCaseShape(testCase: M6SmokeCase): void {
  if (!testCase.name || !testCase.profile_id || !testCase.qr_id || !testCase.expected) {
    throw new Error("Each smoke case must include name, profile_id, qr_id, and expected.");
  }
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, "");
}

function defaultHttpForKind(kind: string): number {
  if (kind === "card_revoked") return 410;
  if (kind === "unknown_profile" || kind === "unknown_qr") return 404;
  if (kind === "malformed" || kind === "profile_qr_mismatch") return 400;
  return 200;
}

function assertEqual(
  caseName: string,
  field: string,
  actual: unknown,
  expected: unknown
): void {
  if (actual !== expected) {
    throw new Error(
      `${caseName}: expected ${field} ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function usage(): string {
  return [
    "Usage:",
    "  npm run worker:m6-vouch-smoke -- --origin=https://humanity.llc --cases=./m6-smoke-cases.json",
    "",
    "The cases file is a JSON array of { name, profile_id, qr_id, expected } records.",
  ].join("\n");
}

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const cases = await loadSmokeCases(options.casesPath);
  const results = await runM6VouchSmoke(cases, { origin: options.origin });
  for (const result of results) {
    console.log(
      `PASS ${result.name} status=${result.status_http} scan=${result.scan_http} ${result.scan_url}`
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
