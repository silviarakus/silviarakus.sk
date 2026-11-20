const auth = require('../_lib/makler/auth');
const db = require('../_lib/makler/db');
const { json } = require('../_lib/makler/http');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  if (!auth.isAuthorized(req)) return json(res, 401, { error: 'unauthorized' });
  try {
    const rows = await db.listRecent(60);
    return json(res, 200, { avatary: rows });
  } catch (err) {
    console.error(`[makler] zoznam zlyhal: ${err.message}`);
    return json(res, 500, { error: 'Zoznam avatarov sa nepodarilo načítať.' });
  }
};
