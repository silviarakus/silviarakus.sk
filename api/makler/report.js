const { waitUntil } = require('@vercel/functions');
const auth = require('../_lib/makler/auth');
const db = require('../_lib/makler/db');
const { processAvatar } = require('../_lib/makler/pipeline');
const render = require('../_lib/makler/render');
const { isValidToken, readBody, html, queryParam } = require('../_lib/makler/http');

function redirect(res, location) {
  res.setHeader('Location', location);
  res.statusCode = 303;
  res.end();
}

module.exports = async (req, res) => {
  if (!auth.isAuthorized(req)) return redirect(res, '/makler/prihlasenie.html');
  const token = queryParam(req, 'token');
  if (!isValidToken(token)) return html(res, 404, render.renderNotFound());

  try {
    const row = await db.getByToken(token);
    if (!row) return html(res, 404, render.renderNotFound());

    if (req.method === 'POST') {
      const akcia = readBody(req).akcia;
      if (akcia === 'vymazat') {
        await db.removeByToken(token);
        return redirect(res, '/makler/?vymazane=1');
      }
      if (akcia === 'znova' && row.status === 'failed') {
        await db.update(row.id, { status: 'pending', attempts: 0, error: null, generation_started_at: null });
        waitUntil(processAvatar(row.id).catch((err) => console.error(`[makler] znova ${row.id}: ${err.message}`)));
      }
      return redirect(res, `/makler/avatar/${token}`);
    }
    if (req.method !== 'GET') return html(res, 405, render.renderNotFound());

    if (row.status === 'done' && row.avatar) return html(res, 200, render.renderAvatar(row));
    if (row.status === 'failed') return html(res, 200, render.renderFailed(row));
    return html(res, 200, render.renderPending(row));
  } catch (err) {
    console.error(`[makler] report zlyhal: ${err.message}`);
    return html(res, 500, render.page({ title: 'Chyba', body: '<section class="state"><h1>Avatar sa nepodarilo načítať</h1><p class="lead">Skús obnoviť stránku o chvíľu.</p></section>' }));
  }
};
