const config = require('./config');

const rich = (s) => ({ rich_text: [{ text: { content: String(s || '').slice(0, 2000) } }] });

/* Voliteľné: ak je nastavené NOTION_ZAKAZNIK_DB_ID, lead sa zapíše aj do Notion. */
async function pushLead(row, reportUrl) {
  if (config.mock || !config.notionToken || !config.notionDbId) return false;
  const properties = {
    'Meno': { title: [{ text: { content: String(row.meno).slice(0, 200) } }] },
    'E-mail': { email: row.email },
    'Firma': rich(row.firma),
    'Segment': rich(row.segment_label),
    'Archetyp': rich(row.avatar && row.avatar.archetyp),
    'Report': { url: reportUrl },
    'Marketing súhlas': { checkbox: !!row.marketing_suhlas },
    'Dátum': { date: { start: String(row.created_at).slice(0, 10) } }
  };
  if (row.cena_hladina) properties['Cena'] = { select: { name: row.cena_hladina.replace(/,/g, '') } };

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.notionToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ parent: { database_id: config.notionDbId }, properties })
  });
  if (!res.ok) throw new Error(`Notion ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return true;
}

module.exports = { pushLead };
