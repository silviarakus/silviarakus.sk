// Spoločná ochrana API: povolený pôvod požiadavky a obmedzenie počtu požiadaviek z jednej IP.
const POVOLENE = [/^https:\/\/(www\.)?silviarakus\.sk$/, /^https:\/\/silviarakus-[a-z0-9-]+\.vercel\.app$/];
const zasahy = new Map();

function ip(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
}

// true = pôvod je v poriadku (alebo chýba – napr. odoslanie klasického formulára)
function povolenyPovod(req) {
  const o = req.headers.origin;
  if (!o) return true;
  return POVOLENE.some((r) => r.test(o));
}

// Jednoduchý limit v pamäti funkcie: max `max` požiadaviek za `okno` ms z jednej IP.
function prilisVela(req, kluc, max, okno) {
  const k = kluc + '|' + ip(req);
  const teraz = Date.now();
  const zoznam = (zasahy.get(k) || []).filter((t) => teraz - t < okno);
  zoznam.push(teraz);
  zasahy.set(k, zoznam);
  if (zasahy.size > 5000) zasahy.clear();
  return zoznam.length > max;
}

function nastavCors(req, res) {
  const o = req.headers.origin;
  if (o && povolenyPovod(req)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = { povolenyPovod, prilisVela, nastavCors };
