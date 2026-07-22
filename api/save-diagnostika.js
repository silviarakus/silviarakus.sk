// Vercel serverless function: ukladá výsledky diagnostiky do Notion.
// Env premenné (nastav vo Vercel → Project → Settings → Environment Variables):
//   NOTION_TOKEN     – secret internej Notion integrácie (ntn_...)
//   NOTION_DB_ID     – 6ddf856752374d7b8f013fff6f00ebef
//   ALLOWED_ORIGIN   – (voliteľné) napr. https://silviarakus.sk  (default "*")

const NOTION_VERSION = '2022-06-28';

// id metaprogramu -> názov stĺpca (select) v Notion databáze
const MP_COLS = {
  ref: 'Referenčný rámec',
  mot: 'Smer motivácie',
  act: 'Aktivita',
  rul: 'Prístup k pravidlám',
  chu: 'Veľkosť chunku',
  cmp: 'Porovnávanie',
  con: 'Presvedčovací kanál',
  evd: 'Dôkazový filter',
  foc: 'Zameranie pozornosti',
  ori: 'Orientácia',
  dep: 'Hĺbka spracovania',
  src: 'Zdroj istoty',
};

// id readiness dimenzie -> názov stĺpca (number) v Notion databáze
const RD_COLS = {
  mot2: 'Motivácia %',
  fin2: 'Financie %',
  act2: 'Akčnosť %',
  open2: 'Učenlivosť %',
  vis2: 'Vízia %',
  dec2: 'Rozhodovanie %',
};

module.exports = async (req, res) => {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_DB_ID;
  if (!token || !dbId) {
    return res.status(500).json({ error: 'Chýba NOTION_TOKEN alebo NOTION_DB_ID' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { name, dateISO, readinessTotal, tier, readiness = {}, metaprograms = {}, summary = '', raw = {} } = body || {};

    const props = {
      'Meno': { title: [{ text: { content: String(name || 'Neznámy klient').slice(0, 200) } }] },
      'Dátum': { date: { start: dateISO || new Date().toISOString().slice(0, 10) } },
    };

    if (typeof readinessTotal === 'number') props['Pripravenosť %'] = { number: readinessTotal };
    if (tier) props['Zaradenie'] = { select: { name: String(tier) } };

    for (const [id, col] of Object.entries(RD_COLS)) {
      if (typeof readiness[id] === 'number') props[col] = { number: readiness[id] };
    }
    for (const [id, col] of Object.entries(MP_COLS)) {
      if (metaprograms[id]) props[col] = { select: { name: String(metaprograms[id]) } };
    }

    if (summary) props['Metaprogramy — súhrn'] = { rich_text: [{ text: { content: String(summary).slice(0, 2000) } }] };
    props['Raw dáta'] = { rich_text: [{ text: { content: JSON.stringify(raw).slice(0, 2000) } }] };

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
    return res.status(500).json({ error: String(err && err.message || err) });
  }
};
