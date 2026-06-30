import type { Page } from "@playwright/test";

export type CreatedResolverStubOpts = {
  profileId: string;
  qrId: string;
  handle?: string;
  manifestoLine?: string;
};

/** Keep resolver fetches same-origin so Playwright routes intercept Pages dev reliably. */
export function createdPageUrl(
  baseURL: string,
  profileId: string,
  qrId: string,
  opts: { hash?: string } = {}
) {
  const url = new URL("/created/", baseURL);
  url.searchParams.set("profile_id", profileId);
  url.searchParams.set("qr_id", qrId);
  url.searchParams.set("api", baseURL.replace(/\/$/, ""));
  if (opts.hash) url.hash = opts.hash.startsWith("#") ? opts.hash : `#${opts.hash}`;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function cardStatusBody(opts: CreatedResolverStubOpts) {
  return {
    version: "1.0",
    resolver: { operator: "humanity.llc", version: "1.0" },
    scan: {
      kind: "active",
      profile_id: opts.profileId,
      qr_id: opts.qrId,
      card: {
        status: "active",
        handle: opts.handle ?? "e2e_card",
        manifesto_line: opts.manifestoLine ?? "E2E card",
      },
    },
  };
}

export async function stubCreatedCardResolver(
  page: Page,
  opts: CreatedResolverStubOpts
) {
  const cardJson = {
    profile_id: opts.profileId,
    handle: opts.handle ?? "e2e_card",
    manifesto_line: opts.manifestoLine ?? "E2E card",
    created_at: "2026-05-25T12:00:00.000Z",
    status: "active",
    qr: { active_qr_id: opts.qrId },
  };
  const statusJson = cardStatusBody(opts);

  await page.route("**/.well-known/hc/v1/health**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: { status: "ok" } }),
    })
  );

  await page.route(
    `**/.well-known/hc/v1/cards/${opts.profileId}/live-control/**`,
    (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "NOT_FOUND" }),
      })
  );

  await page.route(
    `**/.well-known/hc/v1/cards/${opts.profileId}/objects**`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ objects: [] }),
      })
  );

  await page.route(
    `**/.well-known/hc/v1/cards/${opts.profileId}/status**`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(statusJson),
      })
  );

  await page.route(`**/.well-known/hc/v1/cards/${opts.profileId}`, (route) => {
    if (route.request().url().includes("/status")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(statusJson),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(cardJson),
    });
  });
}

export async function dismissShellIntroNotices(page: Page) {
  const notNow = page.getByRole("button", { name: "Not now" });
  if (await notNow.isVisible().catch(() => false)) {
    await notNow.click();
  }
}
