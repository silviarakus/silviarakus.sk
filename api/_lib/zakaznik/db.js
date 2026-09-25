const config = require('./config');

const TABLE = 'zakaznik_submissions';

let memoryDb = null;
function backend() {
  if (config.mock) {
    memoryDb = memoryDb || require('../../../scripts/dev/memory-db').create();
    return memoryDb;
  }
  return supabase;
}

async function rest(method, query, { body, prefer } = {}) {
  if (!config.supabaseUrl || !config.supabaseKey) {
    throw new Error('Chýba SUPABASE_URL alebo SUPABASE_SERVICE_ROLE_KEY');
  }
  const headers = {
    apikey: config.supabaseKey,
    Authorization: `Bearer ${config.supabaseKey}`,
    'Content-Type': 'application/json'
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${config.supabaseUrl}/rest/v1/${TABLE}?${query}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    throw new Error(`Supabase ${method} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  if (res.status === 204) return [];
  return res.json();
}

const enc = encodeURIComponent;

const supabase = {
  async insert(row) {
    const rows = await rest('POST', 'select=*', { body: row, prefer: 'return=representation' });
    return rows[0];
  },
  async getByToken(token) {
    const rows = await rest('GET', `token=eq.${enc(token)}&select=*&limit=1`);
    return rows[0] || null;
  },
  async getById(id) {
    const rows = await rest('GET', `id=eq.${enc(id)}&select=*&limit=1`);
    return rows[0] || null;
  },
  async update(id, patch) {
    const rows = await rest('PATCH', `id=eq.${enc(id)}&select=*`, { body: patch, prefer: 'return=representation' });
    return rows[0] || null;
  },
  /* Atomický „claim“: aktualizuje riadok len vtedy, ak je v očakávanom stave. */
  async claim(id, fromStatuses, patch, startedBefore) {
    let q = `id=eq.${enc(id)}&status=in.(${fromStatuses.join(',')})&select=*`;
    if (startedBefore) {
      q += `&or=(generation_started_at.is.null,generation_started_at.lt.${enc(startedBefore)})`;
    }
    const rows = await rest('PATCH', q, { body: patch, prefer: 'return=representation' });
    return rows[0] || null;
  },
  async countSince(column, value, sinceIso) {
    const rows = await rest('GET', `${column}=eq.${enc(value)}&created_at=gte.${enc(sinceIso)}&select=id&limit=20`);
    return rows.length;
  },
  async remove(id) {
    await rest('DELETE', `id=eq.${enc(id)}`);
  },
  async deleteOlderThan(iso) {
    const rows = await rest('DELETE', `created_at=lt.${enc(iso)}&select=id`, { prefer: 'return=representation' });
    return rows.length;
  },
  async listForRetry(maxAttempts, staleBeforeIso) {
    const q = [
      `attempts=lt.${maxAttempts}`,
      `or=(status.eq.pending,status.eq.failed,and(status.eq.generating,generation_started_at.lt.${enc(staleBeforeIso)}))`,
      'select=id',
      'order=created_at.asc',
      'limit=5'
    ].join('&');
    return rest('GET', q);
  },
  async listUnsentDone() {
    return rest('GET', 'status=eq.done&email_sent_at=is.null&select=id&order=created_at.asc&limit=10');
  }
};

module.exports = new Proxy({}, { get: (_, key) => backend()[key] });
