const QRCode = require('qrcode');
const { buildQrPayload } = require('./qr-payload');
const { isValidProfileId } = require('./validation');

/**
 * Tech Spec v0.5 §4.5 GET /qr/{profile_id}.png
 * QR encodes `hc://resolve/{profile_id}` (§4.5). Error correction minimum M (Technical Standards §8.2).
 * @param {import('better-sqlite3').Database} db
 */
function getQrPngHandler(db) {
  return async (req, res) => {
    res.set('X-Resolver-Version', '0.5');
    const m = String(req.params.filename || '').match(/^([1-9A-HJ-NP-Za-km-z]{20})\.png$/i);
    if (!m) {
      return res.status(400).type('text/plain').send('Invalid QR path');
    }
    const profileId = m[1];
    if (!isValidProfileId(profileId)) {
      return res.status(400).type('text/plain').send('Invalid profile id');
    }

    const row = db.prepare('SELECT profile_id, revoked FROM profiles WHERE profile_id = ?').get(profileId);
    if (!row) {
      return res.status(404).type('text/plain').send('Not found');
    }
    if (row.revoked) {
      return res.status(410).type('text/plain').send('Revoked');
    }

    const size = Math.min(1000, Math.max(100, Number(req.query.size) || 300));
    const margin = Math.min(10, Math.max(1, Number(req.query.margin) || 4));

    let payload;
    try {
      payload = buildQrPayload(profileId);
    } catch {
      return res.status(400).type('text/plain').send('Invalid profile id');
    }

    try {
      const png = await QRCode.toBuffer(payload, {
        type: 'png',
        width: size,
        margin,
        errorCorrectionLevel: 'M',
      });
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(png);
    } catch (e) {
      console.error(e);
      return res.status(500).type('text/plain').send('QR generation failed');
    }
  };
}

module.exports = { getQrPngHandler };
