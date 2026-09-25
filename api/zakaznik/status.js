const { waitUntil } = require('@vercel/functions');
const db = require('../_lib/zakaznik/db');
const security = require('../_lib/zakaznik/security');
const { processSubmission, needsKick } = require('../_lib/zakaznik/pipeline');
const { json, queryParam } = require('../_lib/zakaznik/http');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const token = queryParam(req, 'token');
  if (!security.isValidToken(token)) return json(res, 404, { error: 'not_found' });

  try {
    const row = await db.getByToken(token);
    if (!row) return json(res, 404, { error: 'not_found' });

    if (needsKick(row)) {
      waitUntil(processSubmission(row.id).catch((err) => console.error(`[zakaznik] retry ${row.id}: ${err.message}`)));
    }
    return json(res, 200, { status: row.status, email_sent: !!row.email_sent_at });
  } catch (err) {
    console.error(`[zakaznik] status zlyhal: ${err.message}`);
    return json(res, 500, { error: 'unavailable' });
  }
};
