const fs = require('fs');
const path = require('path');

/**
 * Anonymize IP for logs (Tech Spec v0.5 §8.2): last IPv4 octet zeroed.
 * @param {string | undefined} ip
 */
function anonymizeIp(ip) {
  if (!ip) return '0.0.0.0';
  const v = String(ip).replace(/^::ffff:/i, '');
  if (v === '127.0.0.1' || v === '::1') return v;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) {
    const p = v.split('.');
    return `${p[0]}.${p[1]}.${p[2]}.0`;
  }
  if (v.includes(':')) {
    const parts = v.split(':').filter(Boolean);
    if (parts.length >= 2) return `${parts.slice(0, 4).join(':')}::`;
    return v;
  }
  return 'unknown';
}

function logPath() {
  const p = process.env.LOG_FILE || path.join(__dirname, '..', 'data', 'access.log');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  return p;
}

/**
 * @param {import('express').Request} req
 * @param {number} status
 */
function logRequest(req, status) {
  if (process.env.LOG_ENABLED === '0') return;
  try {
    const ts = new Date().toISOString();
    const ip = anonymizeIp(req.ip || req.socket?.remoteAddress);
    const line = `${ts} ${req.method} ${req.originalUrl.split('?')[0]} ${status} ${ip}\n`;
    fs.appendFileSync(logPath(), line, { encoding: 'utf8' });
  } catch (e) {
    console.error('access log write failed', e.message);
  }
}

/** Express middleware: log after response finishes. */
function requestLogMiddleware(req, res, next) {
  res.on('finish', () => {
    logRequest(req, res.statusCode);
  });
  next();
}

module.exports = { anonymizeIp, logRequest, requestLogMiddleware };
