const config = require('./config');
const db = require('./db');
const { generateProfile } = require('./generate');
const mail = require('./mail');
const notion = require('./notion');

/* Generovanie, ktoré beží dlhšie, považujeme za mŕtve (funkcia bola ukončená). */
const STALE_MS = 6 * 60 * 1000;

function staleBeforeIso() {
  return new Date(Date.now() - STALE_MS).toISOString();
}

async function deliver(row) {
  if (!row.email_sent_at) {
    try {
      await mail.sendReport(row);
      row = (await db.update(row.id, { email_sent_at: new Date().toISOString() })) || row;
    } catch (err) {
      console.error(`[zakaznik] e-mail s reportom zlyhal (${row.id}): ${err.message}`);
    }
  }
  try {
    await notion.pushLead(row, mail.reportUrl(row.token));
  } catch (err) {
    console.error(`[zakaznik] zápis do Notion zlyhal (${row.id}): ${err.message}`);
  }
  return row;
}

async function processSubmission(id) {
  const row = await db.getById(id);
  if (!row || row.status === 'done' || row.attempts >= config.maxAttempts) return row;

  const claimed = await db.claim(
    id,
    ['pending', 'failed', 'generating'],
    { status: 'generating', generation_started_at: new Date().toISOString(), attempts: row.attempts + 1, error: null },
    staleBeforeIso()
  );
  if (!claimed) return row;

  let result;
  try {
    result = await generateProfile(claimed.odpovede);
  } catch (err) {
    const message = String((err && err.message) || err).slice(0, 2000);
    console.error(`[zakaznik] generovanie zlyhalo (${id}): ${message}`);
    const failed = (await db.update(id, { status: 'failed', error: message })) || claimed;
    if (!failed.failure_notified_at) {
      await Promise.allSettled([mail.sendFailureToUser(failed), mail.notifyOwner(failed, message)]);
      await db.update(id, { failure_notified_at: new Date().toISOString() });
    }
    return failed;
  }

  const done = await db.update(id, {
    status: 'done',
    avatar: result.profile,
    model: result.model,
    tokens_in: result.tokensIn,
    tokens_out: result.tokensOut,
    generated_at: new Date().toISOString(),
    error: null
  });
  return deliver(done);
}

/* Či má zmysel generovanie znova odpáliť (napr. funkcia spadla uprostred). */
function needsKick(row) {
  if (row.attempts >= config.maxAttempts) return false;
  const age = Date.now() - new Date(row.created_at).getTime();
  if (row.status === 'pending') return age > 90 * 1000;
  if (row.status === 'generating') {
    return Date.now() - new Date(row.generation_started_at).getTime() > STALE_MS;
  }
  return false;
}

module.exports = { processSubmission, deliver, needsKick, staleBeforeIso };
