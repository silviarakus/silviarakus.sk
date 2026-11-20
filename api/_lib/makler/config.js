function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

module.exports = {
  get mock() { return env('MAKLER_MOCK') === '1'; },
  get heslo() { return env('MAKLER_HESLO'); },
  get model() { return env('MAKLER_MODEL', 'claude-opus-5-5'); },
  get fallbackModel() { return env('MAKLER_FALLBACK_MODEL', 'claude-sonnet-5-5'); },
  get effort() { return env('MAKLER_EFFORT', 'medium'); },
  get modelTimeoutMs() { return Number(env('MAKLER_MODEL_TIMEOUT_MS', 170000)); },
  get fallbackTimeoutMs() { return Number(env('MAKLER_FALLBACK_TIMEOUT_MS', 110000)); },
  get anthropicKey() { return env('ANTHROPIC_API_KEY', '').trim(); },
  get supabaseUrl() { return env('SUPABASE_URL', '').replace(/\/$/, ''); },
  get supabaseKey() { return env('SUPABASE_SERVICE_ROLE_KEY'); },
  get limitPerHour() { return Number(env('MAKLER_LIMIT_ZA_HODINU', 20)); },
  maxAttempts: 2
};
