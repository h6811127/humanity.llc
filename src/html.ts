export function escapeHtml(s: unknown): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMemberSince(ts: number): string {
  try {
    return new Date(ts * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export type ProfileView = {
  handle: string;
  manifesto_line: string;
  badge?: { type: string; label: string };
  created_at: number;
  revoked: boolean;
};

export function profilePageHtml(
  profile: ProfileView,
  opts: { constitutionLink: string; governanceLink: string; servedAtIso: string }
): string {
  const handle = escapeHtml(profile.handle);
  const manifesto = escapeHtml(profile.manifesto_line);
  const badgeLabel = escapeHtml(profile.badge?.label ?? 'Early Builder');
  const badgeType = escapeHtml(profile.badge?.type ?? 'early_builder');
  const memberSince = formatMemberSince(profile.created_at);
  const revoked = Boolean(profile.revoked);
  const cLink = escapeHtml(opts.constitutionLink);
  const gLink = escapeHtml(opts.governanceLink);
  const asOf = escapeHtml(opts.servedAtIso);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profile: @${handle} — Humanity Commons</title>
  <link rel="stylesheet" href="/commons/style.css">
  <link rel="manifest" href="/commons/manifest.json">
</head>
<body data-server-as-of="${asOf}">
  <div id="offline-banner" class="offline-banner hidden" role="status"></div>
  <main class="profile-main">
    <div class="profile-header">
      <h1>@${handle}</h1>
      <span class="badge badge-${badgeType}">${badgeLabel}</span>
    </div>
    <div class="manifesto">
      <p>${manifesto}</p>
    </div>
    <div class="metadata">
      <p>Member since: ${memberSince}</p>
      ${revoked ? '<p class="revoked-notice">⛔ This profile has been revoked</p>' : ''}
    </div>
  </main>
  <footer class="site-footer">
    <p>This profile is part of the Humanity Commons. Profile data is hosted by independent resolvers. No data is sold.</p>
    <nav>
      <a href="${cLink}">Constitution</a> ·
      <a href="${gLink}">Governance</a>
    </nav>
  </footer>
  <script src="/commons/app.js"></script>
  <script>
    (function () {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(function () {});
      }
      function setOfflineBanner() {
        var el = document.getElementById('offline-banner');
        if (!el || navigator.onLine) return;
        var raw = document.body.getAttribute('data-server-as-of');
        var when = raw ? new Date(raw).toLocaleString() : 'last visit';
        el.textContent = 'Offline mode — viewing cached profile from ' + when;
        el.classList.remove('hidden');
      }
      window.addEventListener('load', setOfflineBanner);
      window.addEventListener('online', function () { location.reload(); });
    })();
  </script>
</body>
</html>`;
}
