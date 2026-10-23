// Prihlásenie do zóny pre klientov. Porovná heslo s KLIENT_HESLO a nastaví cookie.
const crypto = require('crypto');
const { povolenyPovod, prilisVela } = require('./_ochrana');

const token = (heslo) =>
  crypto.createHash('sha256').update(heslo + '|silviarakus-klient').digest('hex');

const bezpecnyNext = (n) =>
  typeof n === 'string' && /^\/klient(\/[A-Za-z0-9_\-./]*)?$/.test(n) && !n.includes('..') ? n : '/klient/';

function parseBody(req) {
  const b = req.body;
  if (b && typeof b === 'object') return b;
  if (typeof b === 'string') return Object.fromEntries(new URLSearchParams(b));
  return {};
}

module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  if (!povolenyPovod(req)) return res.status(403).send('Forbidden');
  if (prilisVela(req, 'login', 8, 15 * 60 * 1000)) {
    res.setHeader('Location', '/klient/prihlasenie.html?chyba=limit');
    return res.status(303).end();
  }
  const body = parseBody(req);
  const next = bezpecnyNext(body.next);
  const heslo = process.env.KLIENT_HESLO;
  const zadane = String(body.heslo || '');

  const ok =
    heslo &&
    zadane.length === heslo.length &&
    crypto.timingSafeEqual(Buffer.from(zadane), Buffer.from(heslo));

  if (!ok) {
    res.setHeader('Location', '/klient/prihlasenie.html?chyba=1&next=' + encodeURIComponent(next));
    return res.status(303).end();
  }

  res.setHeader(
    'Set-Cookie',
    `klient=${token(heslo)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 90}`
  );
  res.setHeader('Location', next);
  return res.status(303).end();
};
