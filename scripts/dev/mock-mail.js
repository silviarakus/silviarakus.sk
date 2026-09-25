/* Lokálna náhrada Resend: e-maily sa uložia do .dev-data/mail/. */
const fs = require('fs');
const path = require('path');

const dataDir = () => process.env.ZAKAZNIK_DEV_DATA || path.join(__dirname, '..', '..', '.dev-data');

async function send({ to, subject, html, text }) {
  const DIR = path.join(dataDir(), 'mail');
  fs.mkdirSync(DIR, { recursive: true });
  const base = `${Date.now()}-${String(to).replace(/[^a-z0-9]+/gi, '_')}`;
  fs.writeFileSync(path.join(DIR, `${base}.html`), html);
  fs.writeFileSync(path.join(DIR, `${base}.txt`), `To: ${to}\nSubject: ${subject}\n\n${text}`);
  console.log(`[mock-mail] ${to} — ${subject} → ${path.join(DIR, base)}.html`);
  return { id: base };
}

module.exports = { send };
