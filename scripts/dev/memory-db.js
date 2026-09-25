/* Lokálna náhrada Supabase pre `npm run dev` (ZAKAZNIK_MOCK=1). */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = () => process.env.ZAKAZNIK_DEV_DATA || path.join(__dirname, '..', '..', '.dev-data');

function create() {
  const FILE = path.join(dataDir(), 'db.json');
  let rows = [];
  try { rows = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { rows = []; }
  const persist = () => {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(rows, null, 2));
  };
  const clone = (r) => (r ? JSON.parse(JSON.stringify(r)) : null);
  const find = (id) => rows.find((r) => r.id === id);

  return {
    async insert(row) {
      const full = {
        id: crypto.randomUUID(), created_at: new Date().toISOString(), status: 'pending', attempts: 0,
        avatar: null, model: null, tokens_in: null, tokens_out: null, error: null,
        generation_started_at: null, generated_at: null, email_sent_at: null, failure_notified_at: null,
        ...row
      };
      rows.push(full);
      persist();
      return clone(full);
    },
    async getByToken(token) { return clone(rows.find((r) => r.token === token)); },
    async getById(id) { return clone(find(id)); },
    async update(id, patch) {
      const r = find(id);
      if (!r) return null;
      Object.assign(r, patch);
      persist();
      return clone(r);
    },
    async claim(id, fromStatuses, patch, startedBefore) {
      const r = find(id);
      if (!r || !fromStatuses.includes(r.status)) return null;
      if (startedBefore && r.generation_started_at && r.generation_started_at >= startedBefore) return null;
      Object.assign(r, patch);
      persist();
      return clone(r);
    },
    async countSince(column, value, sinceIso) {
      return rows.filter((r) => r[column] === value && r.created_at >= sinceIso).length;
    },
    async remove(id) { rows = rows.filter((r) => r.id !== id); persist(); },
    async deleteOlderThan(iso) {
      const before = rows.length;
      rows = rows.filter((r) => r.created_at >= iso);
      persist();
      return before - rows.length;
    },
    async listForRetry(maxAttempts, staleBeforeIso) {
      return rows
        .filter((r) => r.attempts < maxAttempts && (r.status === 'pending' || r.status === 'failed' ||
          (r.status === 'generating' && r.generation_started_at < staleBeforeIso)))
        .slice(0, 5)
        .map((r) => ({ id: r.id }));
    },
    async listUnsentDone() {
      return rows.filter((r) => r.status === 'done' && !r.email_sent_at).map((r) => ({ id: r.id }));
    }
  };
}

module.exports = { create };
