const db = require('../_lib/zakaznik/db');
const security = require('../_lib/zakaznik/security');
const { renderReport, webCss } = require('../_lib/zakaznik/render');
const { formatDate } = require('../_lib/zakaznik/mail');
const { html, queryParam } = require('../_lib/zakaznik/http');

const esc = security.escapeHtml;

const PAGE_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{background:#0B0D10;color:#F5F1E8;font-family:Manrope,system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
:focus-visible{outline:2px solid #C66A2B;outline-offset:3px;border-radius:2px}
.bar{border-bottom:1px solid rgba(245,241,232,.10);background:#11151A}
.bar-inner{max-width:760px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.crumb{display:flex;gap:8px;align-items:center;font-size:14px;font-weight:600}
.crumb a{color:#8E8E8E;text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
.crumb a:hover{color:#F5F1E8}
.crumb span{color:#8E8E8E}
.actions{display:flex;gap:8px}
.btn-ghost{min-height:44px;padding:0 16px;border:1px solid rgba(198,106,43,.28);background:transparent;color:#F5F1E8;font:600 14px Manrope,system-ui,sans-serif;border-radius:4px;cursor:pointer}
.btn-ghost:hover{border-color:#FF7A1A;color:#FF7A1A}
main{max-width:760px;margin:0 auto;padding:24px 16px 48px}
.rk-btn:hover{background-color:#FF7A1A !important}
.rk-link:hover{color:#FF7A1A}
.erase{max-width:760px;margin:0 auto;padding:0 16px 56px;font-size:14px;color:#8E8E8E}
.erase summary{cursor:pointer;min-height:44px;display:inline-flex;align-items:center}
.erase summary:hover{color:#F5F1E8}
.erase form{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.erase label{width:100%}
.erase input{flex:1 1 220px;min-height:44px;padding:0 12px;background:#1C2128;border:1px solid rgba(245,241,232,.10);color:#F5F1E8;font:16px Manrope,system-ui,sans-serif;border-radius:4px}
.erase input:focus{outline:none;border-color:rgba(198,106,43,.28)}
.erase .msg{width:100%;margin-top:6px}
.erase .msg.err{color:#E84A1A}
.state{max-width:560px;margin:0 auto;padding:72px 16px;text-align:center}
.state h1{font-family:Sora,system-ui,sans-serif;font-weight:700;font-size:28px;line-height:1.2;margin:14px 0 12px}
.state p{color:#8E8E8E;line-height:1.7}
.state .k{font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#C66A2B}
.state a{color:#C66A2B}
@media print{
  body{background:#F5F1E8 !important;color:#0B0D10 !important}
  .bar,.erase{display:none !important}
  main{padding:0;max-width:none}
}`;

function page({ title, body, refresh }) {
  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
${refresh ? '<meta http-equiv="refresh" content="15">' : ''}
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${PAGE_CSS}\n${webCss()}</style>
</head>
<body>
<header class="bar"><div class="bar-inner">
<nav class="crumb" aria-label="Omrvinková navigácia"><a href="/">Domov</a><span aria-hidden="true">›</span><a href="/kto-je-moj-zakaznik">Kto je môj zákazník?</a></nav>
<div class="actions">${refresh ? '' : '<button type="button" class="btn-ghost" onclick="window.print()">Vytlačiť alebo uložiť PDF</button>'}</div>
</div></header>
${body}
</body>
</html>`;
}

function statePage(kicker, title, text, refresh) {
  return page({
    title,
    refresh,
    body: `<main class="state"><p class="k">${esc(kicker)}</p><h1>${esc(title)}</h1><p>${text}</p></main>`
  });
}

const ERASE_SCRIPT = `
document.getElementById('erase-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  var msg = document.getElementById('erase-msg');
  var btn = this.querySelector('button');
  btn.disabled = true;
  msg.className = 'msg';
  msg.textContent = 'Mažem…';
  try {
    var r = await fetch('/api/zakaznik/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: this.dataset.token, email: this.email.value })
    });
    var data = await r.json();
    if (r.ok) {
      document.querySelector('main').innerHTML = '<div class="state"><p class="k">Hotovo</p><h1>Údaje sú vymazané</h1><p>Odpovede, profil aj tvoj e-mail sme z databázy odstránili. Tento odkaz už nefunguje.</p></div>';
      document.querySelector('.erase').remove();
      document.querySelector('.actions').remove();
    } else {
      msg.className = 'msg err';
      msg.textContent = data.error;
      btn.disabled = false;
    }
  } catch (err) {
    msg.className = 'msg err';
    msg.textContent = 'Nepodarilo sa spojiť so serverom. Skús to znova.';
    btn.disabled = false;
  }
});`;

module.exports = async (req, res) => {
  const notFound = () =>
    html(res, 404, statePage('404', 'Report sa nenašiel', 'Odkaz je neplatný alebo bol report vymazaný. <a href="/kto-je-moj-zakaznik">Vytvor si nový profil zákazníka.</a>'));

  const token = queryParam(req, 'token');
  if (!security.isValidToken(token)) return notFound();

  let row;
  try {
    row = await db.getByToken(token);
  } catch (err) {
    console.error(`[zakaznik] report zlyhal: ${err.message}`);
    return html(res, 503, statePage('Chvíľku', 'Report sa teraz nedá načítať', 'Skús stránku obnoviť o pár sekúnd.'));
  }
  if (!row) return notFound();

  if (row.status !== 'done' || !row.avatar) {
    const failed = row.status === 'failed';
    return html(res, 200, statePage(
      failed ? 'Skúšame znova' : 'Pripravuje sa',
      failed ? 'Profil sa napoprvé nepodarilo dokončiť' : 'Profil tvojho zákazníka sa ešte skladá',
      failed
        ? 'Tvoje odpovede máme uložené. Skúsime to znova a hotový report ti príde na e-mail.'
        : 'Zvyčajne to trvá 1–2 minúty. Stránka sa obnoví sama a report ti príde aj na e-mail.',
      !failed
    ));
  }

  const report = renderReport(row.avatar, { segment: row.segment_label, date: formatDate(row.generated_at) }, 'web');
  return html(res, 200, page({
    title: `${row.avatar.archetyp} — Kto je môj zákazník?`,
    body:
      `<main><div class="rk-page">${report}</div></main>` +
      `<section class="erase"><details><summary>Vymazať moje údaje</summary>` +
      `<form id="erase-form" data-token="${esc(token)}"><label for="erase-email">Zadaj e-mail, na ktorý ti report prišiel. Odpovede aj profil sa natrvalo vymažú.</label>` +
      `<input id="erase-email" name="email" type="email" autocomplete="email" required>` +
      `<button type="submit" class="btn-ghost">Natrvalo vymazať</button><p id="erase-msg" class="msg" role="status"></p></form>` +
      `</details></section><script>${ERASE_SCRIPT}</script>`
  }));
};
