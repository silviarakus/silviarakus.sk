const db = require('../_lib/zakaznik/db');
const security = require('../_lib/zakaznik/security');
const { readBody, json } = require('../_lib/zakaznik/http');

/* Výmaz na žiadosť: token z odkazu na report + e-mail, na ktorý report prišiel. */
module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const { token, email } = readBody(req);
  const notMatched = { error: 'E-mail nesedí s týmto reportom. Zadaj adresu, na ktorú ti report prišiel.' };
  if (!security.isValidToken(token) || typeof email !== 'string') return json(res, 400, notMatched);

  try {
    const row = await db.getByToken(token);
    if (!row || row.email !== email.trim().toLowerCase()) return json(res, 400, notMatched);
    await db.remove(row.id);
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error(`[zakaznik] výmaz zlyhal: ${err.message}`);
    return json(res, 500, { error: 'Výmaz sa nepodaril. Napíš mi na silvia@fenixos.sk a vymažem to ručne.' });
  }
};
