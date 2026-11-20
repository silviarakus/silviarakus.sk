const { waitUntil } = require('@vercel/functions');
const FORM = require('../../makler/form.js');
const config = require('../_lib/makler/config');
const auth = require('../_lib/makler/auth');
const db = require('../_lib/makler/db');
const { processAvatar } = require('../_lib/makler/pipeline');
const { newToken, clientIp, hashIp, readBody, json } = require('../_lib/makler/http');
const { povolenyPovod } = require('../_ochrana');

function cleanInputs(typ, raw) {
  const out = {};
  for (const field of FORM.fields(typ)) {
    out[field.id] = String(raw[field.id] == null ? '' : raw[field.id]).trim().slice(0, FORM.TEXT_MAX);
    const error = FORM.fieldError(field, out[field.id]);
    if (error) return { error, field: field.id };
  }
  return { vstupy: out };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!auth.isAuthorized(req)) return json(res, 401, { error: 'Prihlásenie vypršalo. Obnov stránku a prihlás sa znova.' });
  if (!povolenyPovod(req) && !config.mock) return json(res, 403, { error: 'Nepovolený pôvod požiadavky' });

  const body = readBody(req);
  const typ = String(body.typ || '');
  if (!FORM.TYPY[typ]) return json(res, 400, { error: 'Vyber, či robíš avatara predávajúceho alebo kupujúceho.', field: 'typ' });
  if (body.web) return json(res, 400, { error: 'Formulár sa nepodarilo odoslať.' });

  const cleaned = cleanInputs(typ, (body.vstupy && typeof body.vstupy === 'object') ? body.vstupy : {});
  if (cleaned.error) return json(res, 400, { error: cleaned.error, field: cleaned.field });
  const v = cleaned.vstupy;

  try {
    const ipHash = hashIp(clientIp(req));
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    if ((await db.countSince('ip_hash', ipHash, hourAgo)) >= config.limitPerHour) {
      return json(res, 429, { error: `Z tohto pripojenia prišlo za poslednú hodinu už ${config.limitPerHour} avatarov. Skús to o chvíľu.` });
    }

    const row = await db.insert({
      token: newToken(),
      typ,
      autor: v.autor,
      region: v.region.slice(0, 200),
      nehnutelnost: v.nehnutelnost,
      cena: v.cena,
      vstupy: v,
      status: 'pending',
      attempts: 0,
      ip_hash: ipHash
    });

    waitUntil(processAvatar(row.id).catch((err) => console.error(`[makler] pipeline ${row.id}: ${err.message}`)));
    return json(res, 200, { token: row.token });
  } catch (err) {
    console.error(`[makler] submit zlyhal: ${err.message}`);
    return json(res, 500, { error: 'Zadanie sa nepodarilo uložiť. Skús to o chvíľu znova, formulár ostáva vyplnený.' });
  }
};
