// Prihlásenie do zóny pre maklérov. Porovná heslo s MAKLER_HESLO a nastaví cookie.
const { povolenyPovod, prilisVela } = require('./_ochrana');
const auth = require('./_lib/makler/auth');

const bezpecnyNext = (n) =>
  typeof n === 'string' && /^\/makler(\/[A-Za-z0-9_\-./]*)?$/.test(n) && !n.includes('..') ? n : '/makler/';

function parseBody(req) {
  const b = req.body;
  if (b && typeof b === 'object') return b;
  if (typeof b === 'string') return Object.fromEntries(new URLSearchParams(b));
  return {};
}

function redirect(res, location) {
  res.setHeader('Location', location);
  res.statusCode = 303;
  return res.end();
}

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }
  if (!povolenyPovod(req)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }
  if (prilisVela(req, 'makler-login', 8, 15 * 60 * 1000)) {
    return redirect(res, '/makler/prihlasenie.html?chyba=limit');
  }
  const body = parseBody(req);
  const next = bezpecnyNext(body.next);

  if (!auth.checkPassword(body.heslo)) {
    return redirect(res, '/makler/prihlasenie.html?chyba=1&next=' + encodeURIComponent(next));
  }
  res.setHeader('Set-Cookie', auth.sessionCookie());
  return redirect(res, next);
};
