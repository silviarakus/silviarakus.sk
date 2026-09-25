const config = require('../_lib/zakaznik/config');
const db = require('../_lib/zakaznik/db');
const { processSubmission, deliver, staleBeforeIso } = require('../_lib/zakaznik/pipeline');
const { json } = require('../_lib/zakaznik/http');

/* Denný cron (vercel.json): retencia, dobehnutie zaseknutých generovaní a neodoslaných e-mailov. */
module.exports = async (req, res) => {
  if (!config.cronSecret || req.headers.authorization !== `Bearer ${config.cronSecret}`) {
    return json(res, 401, { error: 'unauthorized' });
  }

  const report = { deleted: 0, retried: 0, delivered: 0, errors: [] };
  try {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - config.retentionMonths);
    report.deleted = await db.deleteOlderThan(cutoff.toISOString());

    const unsent = await db.listUnsentDone();
    for (const { id } of unsent) {
      await deliver(await db.getById(id));
      report.delivered++;
    }

    const retry = await db.listForRetry(config.maxAttempts, staleBeforeIso());
    for (const { id } of retry.slice(0, 2)) {
      await processSubmission(id);
      report.retried++;
    }
  } catch (err) {
    report.errors.push(err.message);
  }
  return json(res, report.errors.length ? 500 : 200, report);
};
