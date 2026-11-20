// Prístup do zóny /makler: heslo v MAKLER_HESLO, po prihlásení cookie `makler`.
// Rovnaký token počíta aj middleware.js, preto sa nesmie meniť formát.
const crypto = require('crypto');
const config = require('./config');

const COOKIE = 'makler';

const token = (heslo) => crypto.createHash('sha256').update(heslo + '|silviarakus-makler').digest('hex');

function cookie(req, name) {
  const raw = String(req.headers.cookie || '');
  const m = raw.split(/;\s*/).find((c) => c.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : '';
}

function isAuthorized(req) {
  if (config.mock && !config.heslo) return true;
  const heslo = config.heslo;
  if (!heslo) return false;
  const expected = Buffer.from(token(heslo));
  const got = Buffer.from(cookie(req, COOKIE));
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

function checkPassword(zadane) {
  const heslo = config.heslo;
  if (!heslo) return false;
  const a = Buffer.from(String(zadane || ''));
  const b = Buffer.from(heslo);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sessionCookie() {
  const secure = config.mock ? '' : ' Secure;';
  return `${COOKIE}=${token(config.heslo)}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${60 * 60 * 24 * 90}`;
}

function clearCookie() {
  const secure = config.mock ? '' : ' Secure;';
  return `${COOKIE}=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0`;
}

module.exports = { isAuthorized, checkPassword, sessionCookie, clearCookie, token };
