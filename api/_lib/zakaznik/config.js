function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

module.exports = {
  get mock() { return env('ZAKAZNIK_MOCK') === '1'; },
  get siteUrl() { return env('SITE_URL', 'https://silviarakus.sk').replace(/\/$/, ''); },
  get model() { return env('ZAKAZNIK_MODEL', 'claude-opus-5'); },
  get fallbackModel() { return env('ZAKAZNIK_FALLBACK_MODEL', 'claude-sonnet-5'); },
  get modelTimeoutMs() { return Number(env('ZAKAZNIK_MODEL_TIMEOUT_MS', 150000)); },
  get fallbackTimeoutMs() { return Number(env('ZAKAZNIK_FALLBACK_TIMEOUT_MS', 110000)); },
  get anthropicKey() { return env('ANTHROPIC_API_KEY'); },
  get supabaseUrl() { return env('SUPABASE_URL', '').replace(/\/$/, ''); },
  get supabaseKey() { return env('SUPABASE_SERVICE_ROLE_KEY'); },
  get resendKey() { return env('RESEND_API_KEY'); },
  get mailFrom() { return env('ZAKAZNIK_MAIL_FROM', 'Silvia Rakus <zakaznik@silviarakus.sk>'); },
  get mailReplyTo() { return env('ZAKAZNIK_MAIL_REPLY_TO', 'silvia@fenixos.sk'); },
  get notifyEmail() { return env('ZAKAZNIK_NOTIFY_EMAIL', 'silvia@fenixos.sk'); },
  get turnstileSiteKey() { return env('TURNSTILE_SITE_KEY'); },
  get turnstileSecret() { return env('TURNSTILE_SECRET_KEY'); },
  get ipHashSalt() { return env('IP_HASH_SALT', ''); },
  get cronSecret() { return env('CRON_SECRET'); },
  get notionToken() { return env('NOTION_TOKEN'); },
  get notionDbId() { return env('NOTION_ZAKAZNIK_DB_ID'); },
  get ctaLabel() { return env('ZAKAZNIK_CTA_LABEL', 'Pozri si FENIX Stratégiu hodnoty'); },
  get ctaUrl() { return env('ZAKAZNIK_CTA_URL', 'https://silviarakus.sk/fenix.html'); },
  get retentionMonths() { return Number(env('ZAKAZNIK_RETENTION_MONTHS', 24)); },
  maxAttempts: 3
};
