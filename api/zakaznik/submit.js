const { z } = require('zod');
const { waitUntil } = require('@vercel/functions');
const FORM = require('../../assets/zakaznik/form.js');
const db = require('../_lib/zakaznik/db');
const security = require('../_lib/zakaznik/security');
const { processSubmission } = require('../_lib/zakaznik/pipeline');
const { readBody, json } = require('../_lib/zakaznik/http');

const requestSchema = z.object({
  odpovede: z.record(z.string(), z.unknown()),
  meno: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email()).refine((v) => v.length <= 254),
  firma: z.string().trim().max(200).optional().default(''),
  gdpr_suhlas: z.literal(true),
  marketing_suhlas: z.boolean().optional().default(false),
  turnstile_token: z.string().max(4000).optional().default(''),
  utm: z.record(z.string(), z.string().max(200)).optional().default({}),
  web: z.string().optional().default('')
});

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

function cleanAnswers(raw) {
  const out = {};
  for (const field of FORM.allFields()) {
    const value = raw[field.id];
    if (field.type === 'chips') {
      out[field.id] = FORM.cleanChips(value).slice(0, 20).map((v) => v.slice(0, FORM.CHIP_MAX_LENGTH));
    } else {
      out[field.id] = String(value == null ? '' : value).trim().slice(0, FORM.TEXT_MAX_LENGTH);
    }
    const error = FORM.fieldError(field, out[field.id]);
    if (error) return { error, field: field.id };
  }
  return { answers: out };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const parsed = requestSchema.safeParse(readBody(req));
  if (!parsed.success) {
    const field = parsed.error.issues[0] && parsed.error.issues[0].path[0];
    const messages = {
      meno: 'Napíš, ako ťa mám osloviť.',
      email: 'Skontroluj e-mail. Na túto adresu ti príde report.',
      gdpr_suhlas: 'Bez súhlasu so spracovaním údajov ti report nemôžem vytvoriť ani poslať.'
    };
    return json(res, 400, { error: messages[field] || 'Formulár sa nepodarilo odoslať. Skontroluj odpovede.', field });
  }
  const input = parsed.data;

  if (input.web) return json(res, 400, { error: 'Formulár sa nepodarilo odoslať.' });

  const cleaned = cleanAnswers(input.odpovede);
  if (cleaned.error) return json(res, 400, { error: cleaned.error, field: cleaned.field });

  const ip = security.clientIp(req);
  try {
    if (!(await security.verifyTurnstile(input.turnstile_token, ip))) {
      return json(res, 400, { error: 'Overenie, že nie si robot, neprešlo. Skús to znova.', field: 'turnstile' });
    }

    const ipHash = security.hashIp(ip);
    const limited = await security.checkRateLimit(ipHash, input.email);
    if (limited) return json(res, 429, { error: limited });

    const utm = {};
    for (const key of UTM_KEYS) if (input.utm[key]) utm[key] = input.utm[key];
    const now = new Date().toISOString();

    const row = await db.insert({
      token: security.newToken(),
      meno: input.meno,
      email: input.email,
      firma: input.firma || null,
      gdpr_suhlas: true,
      gdpr_cas: now,
      marketing_suhlas: input.marketing_suhlas,
      odpovede: cleaned.answers,
      segment_label: cleaned.answers.segment.slice(0, 200),
      cena_hladina: cleaned.answers.cena,
      status: 'pending',
      ip_hash: ipHash,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 400),
      utm: Object.keys(utm).length ? utm : null
    });

    waitUntil(
      processSubmission(row.id).catch((err) => console.error(`[zakaznik] pipeline ${row.id}: ${err.message}`))
    );
    return json(res, 200, { token: row.token });
  } catch (err) {
    console.error(`[zakaznik] submit zlyhal: ${err.message}`);
    return json(res, 500, { error: 'Odpovede sa nepodarilo uložiť. Skús to o chvíľu znova — tvoj rozpracovaný formulár ostáva uložený.' });
  }
};
