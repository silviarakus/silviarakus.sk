const { waitUntil } = require('@vercel/functions');
const auth = require('../_lib/makler/auth');
const db = require('../_lib/makler/db');
const { processAvatar, needsKick } = require('../_lib/makler/pipeline');
const { isValidToken, json, queryParam } = require('../_lib/makler/http');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  if (!auth.isAuthorized(req)) return json(res, 401, { error: 'unauthorized' });
  const token = queryParam(req, 'token');
  if (!isValidToken(token)) return json(res, 404, { error: 'not_found' });

  try {
    const row = await db.getByToken(token);
    if (!row) return json(res, 404, { error: 'not_found' });
    if (needsKick(row)) {
      waitUntil(processAvatar(row.id).catch((err) => console.error(`[makler] retry ${row.id}: ${err.message}`)));
    }
    return json(res, 200, { status: row.status });
  } catch (err) {
    console.error(`[makler] status zlyhal: ${err.message}`);
    return json(res, 500, { error: 'unavailable' });
  }
};
