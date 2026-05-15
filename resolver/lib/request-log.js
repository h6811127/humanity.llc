const fs = require('fs');
const path = require('path');

/**
 * Anonymize client IP (Tech Spec v0.5 §8.2): IPv4 last octet zeroed.
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

/** ISO 8601 to second precision, e.g. 2026-05-14T10:30:00Z (matches §8.2 examples). */
function isoTimestamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function logFilePath() {
  const p = process.env.LOG_FILE || path.join(__dirname, '..', 'data', 'access.log');
  return path.resolve(p);
}

/**
 * @param {import('express').Request} req
 * @param {number} status
 */
function logRequest(req, status) {
  if (process.env.LOG_ENABLED === '0') return;
  try {
    const filePath = logFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const ip = anonymizeIp(req.ip || req.socket?.remoteAddress);
    const urlPath = String(req.originalUrl || req.url || '').split('?')[0];
    const line = `${isoTimestamp()} ${req.method} ${urlPath} ${status} ${ip}\n`;
    fs.appendFileSync(filePath, line, { encoding: 'utf8' });
  } catch (e) {
    console.error('access log write failed', e.message);
  }
}

/** Express middleware: log after response finishes (Tech Spec v0.5 §8.2). */
function requestLogMiddleware(req, res, next) {
  res.on('finish', () => {
    logRequest(req, res.statusCode);
  });
  next();
}

module.exports = { anonymizeIp, isoTimestamp, logRequest, requestLogMiddleware };
