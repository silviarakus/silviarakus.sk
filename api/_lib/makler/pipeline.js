const config = require('./config');
const db = require('./db');
const { generateAvatar } = require('./generate');

/* Generovanie, ktoré beží dlhšie, považujeme za mŕtve (funkcia bola ukončená). */
const STALE_MS = 6 * 60 * 1000;

async function processAvatar(id) {
  const row = await db.getById(id);
  if (!row || row.status === 'done' || row.attempts >= config.maxAttempts) return row;

  const claimed = await db.claim(
    id,
    ['pending', 'failed', 'generating'],
    { status: 'generating', generation_started_at: new Date().toISOString(), attempts: row.attempts + 1, error: null },
    new Date(Date.now() - STALE_MS).toISOString()
  );
  if (!claimed) return row;

  try {
    const result = await generateAvatar(claimed.typ, claimed.vstupy);
    return await db.update(id, {
      status: 'done',
      avatar: result.avatar,
      archetyp: result.avatar.archetyp.slice(0, 200),
      model: result.model,
      tokens_in: result.tokensIn,
      tokens_out: result.tokensOut,
      generated_at: new Date().toISOString(),
      error: null
    });
  } catch (err) {
    const message = String((err && err.message) || err).slice(0, 2000);
    console.error(`[makler] generovanie zlyhalo (${id}): ${message}`);
    return db.update(id, { status: 'failed', error: message });
  }
}

/* Či má zmysel generovanie znova odpáliť (funkcia spadla uprostred alebo vôbec nezačala). */
function needsKick(row) {
  if (row.attempts >= config.maxAttempts) return false;
  if (row.status === 'pending') return Date.now() - new Date(row.created_at).getTime() > 60 * 1000;
  if (row.status === 'generating') return Date.now() - new Date(row.generation_started_at).getTime() > STALE_MS;
  return false;
}

module.exports = { processAvatar, needsKick };
