/**
 * Deployed Pages smoke — Glitch product detail (no redirect loop, PDP shell).
 * @see docs/DEVICE_SHELL_E2E_CI_REMEDIATION.md § Step 1
 * @see docs/MERCH_HEADLESS_COMMERCE.md § Production rollout
 */
import {
  buildCiDeployVerifyHeaders,
  fetchCiProductionUrl,
  isCloudflareBotChallengeBody,
} from "./ci-production-fetch.mjs";

export const GLITCH_PDP_PATH = "/shop/products/glitch_hoodie_v1/";
export const LEGACY_GLITCH_PDP_PATH = "/shop/products/tier0_glitch_hoodie_v1/";

/**
 * @param {string} siteOrigin
 * @param {{ apiOrigin?: string }} [opts]
 */
export async function smokeShopGlitchProductPage(siteOrigin, opts = {}) {
  const base = siteOrigin.replace(/\/$/, "");
  const url = `${base}${GLITCH_PDP_PATH}`;
  console.log(`\n▶ Shop PDP (${url})`);

  const { res, text: html, url: fetchedUrl } = await fetchCiProductionUrl(GLITCH_PDP_PATH, {
    accept: "text/html",
    redirect: "manual",
  });
  if (fetchedUrl !== url) {
    console.log(`  fetched: ${fetchedUrl}`);
  }
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location") ?? "";
    if (/\/shop\/products\/detail\/?$/i.test(location)) {
      console.error(
        "✗ PDP redirects to /shop/products/detail — Pages splat loop; fix site/_redirects → /shop/product-detail/"
      );
      process.exit(1);
    }
    console.error(`✗ PDP returned redirect ${res.status} → ${location}`);
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`✗ PDP fetch failed (${res.status})`);
    process.exit(1);
  }

  if (!html.includes("shop-product-detail.mjs")) {
    console.error("✗ PDP HTML missing shop-product-detail.mjs");
    process.exit(1);
  }
  if (!html.includes('id="product-title"')) {
    console.error("✗ PDP HTML missing product-title shell");
    process.exit(1);
  }
  console.log("✓ Shop PDP shell OK (200, product detail module present)");

  const apiOrigin = (opts.apiOrigin ?? base).replace(/\/$/, "");
  const apiUrl = `${apiOrigin}/v1/store/products/glitch_hoodie_v1`;
  console.log(`\n▶ Store API (${apiUrl})`);
  const apiRes = await fetch(apiUrl, {
    headers: { Accept: "application/json", ...buildCiDeployVerifyHeaders() },
  });
  const apiText = await apiRes.text();
  const apiBody = (() => {
    try {
      return apiText ? JSON.parse(apiText) : {};
    } catch {
      return {};
    }
  })();
  if (apiRes.status === 403 && isCloudflareBotChallengeBody(apiText)) {
    console.warn(
      "⚠ Store product API blocked by Cloudflare bot challenge — PDP shell verified; API smoke skipped in CI."
    );
    return;
  }
  if (!apiRes.ok) {
    const err =
      apiBody && typeof apiBody === "object" && apiBody.error
        ? String(apiBody.error)
        : String(apiRes.status);
    console.error(
      `✗ Store product API failed (${apiRes.status}, error=${err}) — deploy Worker with GET /v1/store/products routes`
    );
    process.exit(1);
  }
  if (apiBody?.product_id !== "glitch_hoodie_v1") {
    console.error("✗ Store product API returned unexpected product_id");
    process.exit(1);
  }
  if (apiBody?.product_class !== "personalized") {
    console.error("✗ Glitch hoodie must be product_class personalized");
    process.exit(1);
  }
  console.log(`✓ Store product API OK (${apiBody.title ?? "Glitch hoodie"})`);

  const legacyUrl = `${apiOrigin}/v1/store/products/tier0_glitch_hoodie_v1`;
  console.log(`\n▶ Legacy redirect (${legacyUrl})`);
  const legacyRes = await fetch(legacyUrl, {
    headers: { Accept: "application/json", ...buildCiDeployVerifyHeaders() },
  });
  const legacyText = await legacyRes.text();
  const legacyBody = (() => {
    try {
      return legacyText ? JSON.parse(legacyText) : {};
    } catch {
      return {};
    }
  })();
  if (!legacyRes.ok || legacyBody?.redirect !== true) {
    console.error("✗ Legacy tier0_glitch_hoodie_v1 must redirect to Tier 1 Glitch SKU");
    process.exit(1);
  }
  if (!String(legacyBody.redirect_to ?? "").includes("glitch_hoodie_v1")) {
    console.error("✗ Legacy Glitch redirect_to must target /shop/customize/?product=glitch_hoodie_v1");
    process.exit(1);
  }
  console.log("✓ Legacy shared-batch Glitch id redirects to customize");
}
