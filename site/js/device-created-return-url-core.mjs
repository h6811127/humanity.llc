/** Drop homepage return targets that would pull stewards off /created/ after Open controls. */
export function sanitizeCreatedReturnUrl(returnUrl) {
  if (!returnUrl || typeof returnUrl !== "string") return null;
  try {
    const u = new URL(returnUrl, "https://humanity.llc");
    const path = u.pathname.replace(/\/$/, "") || "/";
    if (path === "/" || path === "/index.html") return null;
    return u.href;
  } catch {
    return null;
  }
}
