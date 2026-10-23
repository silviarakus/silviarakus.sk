// Vercel serverless function: ukladá žiadosti o stretnutie z úvodnej stránky do Notion.
// Env premenné (Vercel → Project → Settings → Environment Variables):
//   NOTION_TOKEN           – secret internej Notion integrácie (rovnaký ako pre diagnostiky)
//   NOTION_ZIADOSTI_DB_ID  – (voliteľné) ID databázy „Žiadosti o stretnutie — silviarakus.sk"
//   ALLOWED_ORIGIN         – (voliteľné) napr. https://www.silviarakus.sk (default "*")
// Integrácia musí mať v Notione prístup k databáze (Connections → pridať integráciu).

const NOTION_VERSION = '2022-06-28';
const DEFAULT_DB_ID = '404053f289bf4a998e2b6b20f5c7a6c9';

const CESTY = {
  klient: 'Klient',
  spolupracovnik: 'Spolupracovník',
  diagnostika: 'Diagnostika úzkeho hrdla',
  prednaska: 'Prednáška / rozhovor',
};
const OBLASTI = ['Reality', 'Financie', 'FENIX', 'Neviem / viac oblastí'];
const KONTAKTY = ['Telefón', 'E-mail', 'Osobne', 'Online'];

const txt = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const rich = (v) => ({ rich_text: [{ text: { content: v } }] });

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_ZIADOSTI_DB_ID || DEFAULT_DB_ID;
  if (!token) return res.status(500).json({ error: 'Chýba NOTION_TOKEN' });

  try {
    const b = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};

    // Honeypot proti robotom — ak je vyplnené, tvárime sa, že je všetko OK.
    if (b.web) return res.status(200).json({ ok: true });

    const meno = txt(b.meno, 200);
    const email = txt(b.email, 200);
    const telefon = txt(b.telefon, 50);
    if (!meno) return res.status(400).json({ error: 'Chýba meno' });
    if (!email && !telefon) return res.status(400).json({ error: 'Chýba e-mail alebo telefón' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Neplatný e-mail' });
    if (!b.suhlas) return res.status(400).json({ error: 'Chýba súhlas so spracovaním údajov' });

    const props = { 'Meno': { title: [{ text: { content: meno } }] } };
    if (CESTY[b.cesta]) props['Cesta'] = { select: { name: CESTY[b.cesta] } };
    if (OBLASTI.includes(b.oblast)) props['Oblasť'] = { select: { name: b.oblast } };
    if (KONTAKTY.includes(b.kontakt)) props['Preferovaný kontakt'] = { select: { name: b.kontakt } };
    if (email) props['E-mail'] = { email };
    if (telefon) props['Telefón'] = { phone_number: telefon };
    const sprava = txt(b.sprava, 2000);
    if (sprava) props['Správa'] = rich(sprava);
    props['Zdroj'] = rich(txt(b.zdroj, 200) || 'web');

    const r = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ parent: { database_id: dbId }, properties: props }),
    });
    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: 'Notion API zlyhalo', detail });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String((err && err.message) || err) });
  }
};
