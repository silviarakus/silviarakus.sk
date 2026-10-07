const crypto = require('crypto');
const config = require('./config');
const db = require('./db');

const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

function newToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function isValidToken(token) {
  return typeof token === 'string' && TOKEN_RE.test(token);
}

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || String(req.headers['x-real-ip'] || '') || (req.socket && req.socket.remoteAddress) || '';
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(`${ip}${config.ipHashSalt}`).digest('hex');
}

async function verifyTurnstile(token, ip) {
  if (!config.turnstileSecret) {
    if (!config.mock) console.warn('[zakaznik] TURNSTILE_SECRET_KEY nie je nastavený — overenie preskočené');
    return true;
  }
  if (!token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: config.turnstileSecret, response: token, remoteip: ip })
  });
  const data = await res.json().catch(() => ({}));
  return data.success === true;
}

const LIMITS = {
  ipPerHour: 3,
  emailWindowMinutes: 10
};

/* Vráti null, ak je všetko v poriadku, inak text pre používateľa. */
async function checkRateLimit(ipHash, email) {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const windowAgo = new Date(Date.now() - LIMITS.emailWindowMinutes * 60 * 1000).toISOString();
  const [byIp, byEmail] = await Promise.all([
    db.countSince('ip_hash', ipHash, hourAgo),
    db.countSince('email', email, windowAgo)
  ]);
  if (byEmail >= 1) {
    return 'Profil pre tento e-mail sa práve pripravuje. Ďalší môžeš odoslať o 10 minút.';
  }
  if (byIp >= LIMITS.ipPerHour) {
    return 'Z tohto pripojenia prišli za poslednú hodinu už tri profily. Skús to znova neskôr.';
  }
  return null;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { newToken, isValidToken, clientIp, hashIp, verifyTurnstile, checkRateLimit, escapeHtml, LIMITS };
