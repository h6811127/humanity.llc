/**
 * Human-readable profile HTML (Tech Spec v0.5 §5.3 minimum structure + §7.2 offline banner hook).
 * Server-side rendering; escape all dynamic text.
 */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMemberSince(ts) {
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

/**
 * @param {object} profile — fields like JSON §4.3 (handle, manifesto_line, badge, created_at, revoked)
 * @param {{ constitutionLink: string, governanceLink: string, servedAtIso: string }} meta
 */
function profilePageHtml(profile, { constitutionLink, governanceLink, servedAtIso }) {
  const handle = escapeHtml(profile.handle);
  const manifesto = escapeHtml(profile.manifesto_line);
  const badgeLabel = escapeHtml(profile.badge?.label || 'Early Builder');
  const badgeType = escapeHtml(profile.badge?.type || 'early_builder');
  const memberSince = formatMemberSince(profile.created_at);
  const revoked = Boolean(profile.revoked);
  const cLink = escapeHtml(constitutionLink);
  const gLink = escapeHtml(governanceLink);
  const asOf = escapeHtml(servedAtIso || new Date().toISOString());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profile: @${handle} — Humanity Commons</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="manifest" href="/manifest.json">
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
      ${
        revoked
          ? '<p class="revoked-notice">⛔ This profile has been revoked</p>'
          : ''
      }
    </div>
  </main>
  <footer class="site-footer">
    <p>This profile is part of the Humanity Commons. Profile data is hosted by independent resolvers. No data is sold.</p>
    <nav>
      <a href="${cLink}">Constitution</a> ·
      <a href="${gLink}">Governance</a>
    </nav>
  </footer>
  <script src="/app.js"></script>
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

module.exports = { profilePageHtml, escapeHtml, formatMemberSince };
