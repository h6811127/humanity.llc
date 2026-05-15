const { isValidProfileId } = require('./validation');
const { profilePageHtml } = require('./html');

const DEFAULT_CONSTITUTION = 'https://humanity.llc/constitution';
const DEFAULT_GOVERNANCE = 'https://humanity.llc/governance';

/** Tech Spec v0.5 §4.4 — JSON if Accept prefers application/json; otherwise HTML. */
function wantsHtml(req) {
  const accept = req.get('accept');
  if (!accept) return true;
  if (accept.includes('text/html')) return true;
  if (accept.includes('application/json')) return false;
  return true;
}

function getProfileRow(db, profileId) {
  if (!isValidProfileId(profileId)) return null;
  return db.prepare('SELECT * FROM profiles WHERE profile_id = ?').get(profileId) ?? null;
}

/** Tech Spec v0.5 §4.3 response body (200). */
function profileJson(req, row) {
  const constitution_link = process.env.CONSTITUTION_LINK || DEFAULT_CONSTITUTION;
  const governance_link = process.env.GOVERNANCE_LINK || DEFAULT_GOVERNANCE;
  return {
    version: '0.5',
    profile_id: row.profile_id,
    handle: row.handle,
    manifesto_line: row.manifesto_line,
    badge: { type: 'early_builder', label: 'Early Builder' },
    created_at: row.created_at,
    revoked: Boolean(row.revoked),
    constitution_link,
    governance_link,
  };
}

/**
 * Tech Spec v0.5 §4.3–§4.4 GET /profile/:profileId
 * @param {import('better-sqlite3').Database} db
 */
function getProfileHandler(db) {
  return (req, res) => {
    res.set('X-Resolver-Version', '0.5');

    const row = getProfileRow(db, req.params.profileId);
    if (!row) {
      if (wantsHtml(req)) {
        return res
          .status(404)
          .type('html')
          .send(
            '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Not found</title></head><body><p>No profile exists with this ID. The QR code may be invalid or revoked.</p></body></html>'
          );
      }
      return res.status(404).json({ error: 'not_found', message: 'Profile not found' });
    }

    if (row.revoked) {
      if (wantsHtml(req)) {
        return res
          .status(410)
          .type('html')
          .send(
            '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Revoked</title></head><body><p class="revoked-notice">⛔ This profile has been revoked</p></body></html>'
          );
      }
      return res.status(410).json({ error: 'revoked', message: 'This profile has been revoked' });
    }

    const body = profileJson(req, row);
    const servedAtIso = new Date().toISOString();

    res.set('Cache-Control', 'public, max-age=3600');

    if (wantsHtml(req)) {
      return res.type('html').send(
        profilePageHtml(
          { ...body, revoked: false },
          {
            constitutionLink: body.constitution_link,
            governanceLink: body.governance_link,
            servedAtIso,
          }
        )
      );
    }

    return res.json(body);
  };
}

module.exports = {
  wantsHtml,
  getProfileRow,
  profileJson,
  getProfileHandler,
};
