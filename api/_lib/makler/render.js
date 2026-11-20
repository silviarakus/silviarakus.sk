const FORM = require('../../../makler/form.js');
const { escapeHtml: esc } = require('./http');

const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);

function formatDate(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Europe/Bratislava' });
}

function page({ title, body, script = '' }) {
  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} — Moderný maklér</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/makler/makler.css">
</head>
<body>
<header class="topbar"><div class="wrap">
  <a class="brand" href="/makler/">Moderný maklér<span>Avatar zákazníka</span></a>
  <nav class="top-links"><a href="/makler/">Prehľad</a><a href="/api/makler-logout">Odhlásiť sa</a></nav>
</div></header>
<main><div class="wrap">${body}</div></main>
<footer><div class="wrap">Interný nástroj pre maklérov Moderného makléra · Silvia Rakus</div></footer>
${script}
</body>
</html>`;
}

function copyBtn(text, label = 'Kopírovať') {
  return `<button type="button" class="copy" data-copy="${esc(text)}">${esc(label)}</button>`;
}

function renderAvatar(row) {
  const a = row.avatar;
  const typ = FORM.TYPY[row.typ] || FORM.TYPY.predavajuci;
  const v = row.vstupy || {};
  const p = a.a_profil;
  const b = a.b_psychologia;
  const j = a.d_jazyk;
  const c = a.f_cenova_strategia;
  const s = a.g_socialne_siete;

  const ul = (items, cls = '') => `<ul class="list ${cls}">${list(items).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  const ol = (items) => `<ol class="list steps">${list(items).map((i) => `<li>${esc(i)}</li>`).join('')}</ol>`;
  const chips = (items, cls = '') => `<p class="chips">${list(items).map((i) => `<span class="chip ${cls}">${esc(i)}</span>`).join('')}</p>`;
  const quotes = (items) => list(items).map((q) => `<blockquote>${esc(q)}</blockquote>`).join('');
  const section = (id, letter, eyebrow, title, inner) =>
    `<section class="block" id="${id}"><p class="eyebrow">${letter} · ${esc(eyebrow)}</p><h2>${esc(title)}</h2>${inner}</section>`;
  const copyRow = (items) => list(items).map((t) => `<div class="copy-row"><p>${esc(t)}</p>${copyBtn(t)}</div>`).join('');

  const nav = [
    ['profil', 'Profil'], ['psychologia', 'Psychológia'], ['dialog', 'Vnútorný dialóg'], ['jazyk', 'Jazyk'],
    ['namietky', 'Námietky'], ['cena', 'Cenová stratégia'], ['siete', 'Sociálne siete'], ['overit', 'Overiť']
  ].map(([id, label]) => `<a href="#${id}">${label}</a>`).join('');

  const head = `
<section class="report-head">
  <p class="kicker">${esc(typ.title)} · ${esc(v.region)} · ${esc(v.nehnutelnost)} · ${esc(v.cena)}</p>
  <h1>${esc(a.archetyp)}</h1>
  <p class="lead">${esc(a.esencia)}</p>
  <p class="meta">Vytvoril(a) ${esc(row.autor)} · ${formatDate(row.generated_at || row.created_at)} · cielenie: ${esc(v.kanal)}</p>
  <div class="actions no-print">
    <button type="button" class="btn" id="copy-all">Kopírovať celý avatar</button>
    <button type="button" class="btn btn-secondary" id="print">Tlačiť / uložiť PDF</button>
    <a class="btn btn-secondary" href="/makler/avatar.html?typ=${esc(row.typ)}">Nový avatar</a>
  </div>
  <nav class="jump no-print" aria-label="Časti avatara">${nav}</nav>
</section>`;

  const sA = section('profil', 'A', 'Profil', 'Kto to je', `
<dl class="facts">
  <dt>Meno</dt><dd>${esc(p.meno)}</dd>
  <dt>Vek</dt><dd>${esc(p.vek)}</dd>
  <dt>Rodina</dt><dd>${esc(p.rodina)}</dd>
  <dt>Práca a príjem</dt><dd>${esc(p.praca_a_prijem)}</dd>
  <dt>Situácia</dt><dd>${esc(p.situacia)}</dd>
  <dt>Prečo práve teraz</dt><dd>${esc(p.spustac)}</dd>
</dl>`);

  const sB = section('psychologia', 'B', 'Psychológia', 'Čo sa mu deje v hlave', `
<h3>Hlavná bolesť</h3><p class="big">${esc(b.hlavna_bolest)}</p>
<h3>Skryté obavy</h3>${quotes(b.skryte_obavy)}
<h3>Falošné presvedčenia</h3>
<div class="pairs">${list(b.falosne_presvedcenia).map((f) => `
  <div class="pair"><p class="said">„${esc(f.presvedcenie)}“</p><p class="truth"><span>Realita</span>${esc(f.realita)}</p></div>`).join('')}
</div>
<h3>Čo naozaj chce</h3>${ul(b.tuzby)}
<h3>Na čom mu záleží</h3>${chips(b.na_com_mu_zalezi)}`);

  const sC = section('dialog', 'C', 'Vnútorný dialóg', 'Čo si hovorí večer doma', `<blockquote class="dialog">${esc(a.c_vnutorny_dialog)}</blockquote>`);

  const sD = section('jazyk', 'D', 'Jazyk zákazníka', 'Ako hovorí a čo chce počuť', `
<h3>Takto hovorí na prvom stretnutí</h3>${quotes(j.ako_hovori)}
<h3>Slová, ktoré zaberú</h3>${chips(j.slova_ktore_zaberu)}
<h3>Slová, ktoré ho odradia</h3>${chips(j.slova_ktore_odpudia, 'muted')}`);

  const sE = section('namietky', 'E', 'Námietky', 'Námietky s pripravenými odpoveďami', list(a.e_namietky).map((n) => `
<div class="card objection">
  <p class="said">„${esc(n.namietka)}“</p>
  <p class="lbl">Čo je pod tým</p><p>${esc(n.co_je_pod_tym)}</p>
  <p class="lbl">Čo mu povieš</p><div class="copy-row"><p>${esc(n.odpoved)}</p>${copyBtn(n.odpoved)}</div>
</div>`).join(''));

  const sF = section('cena', 'F', 'Cenová stratégia', row.typ === 'kupujuci' ? 'Ako s ním hovoriť o cene a vyjednávať' : 'Ako s ním nastaviť cenu a obhájiť províziu', `
<p class="badge">Cenová citlivosť: <strong>${esc(c.cenova_citlivost)}</strong></p>
<h3>Ako vníma cenu</h3><p>${esc(c.ako_vnima_cenu)}</p>
<h3>Odporúčaná stratégia</h3><p class="big">${esc(c.odporucana_strategia)}</p>
<h3>Postup krok za krokom</h3>${ol(c.kroky)}
<h3>Vety o cene, ktoré môžeš použiť</h3>${copyRow(c.vety_o_cene)}
<h3>Vyjednávanie</h3>${ul(c.vyjednavanie)}
<h3>${row.typ === 'kupujuci' ? 'Hodnota tvojej služby' : 'Hodnota služby a provízia'}</h3><p>${esc(c.hodnota_sluzby)}</p>
<h3>Čomu sa vyhnúť</h3>${ul(c.chyby, 'warn')}`);

  const sG = section('siete', 'G', 'Sociálne siete', `Podklady pre ${v.kanal}`, `
<h3>Kde ho nájdeš</h3><p>${esc(s.kde_ho_najdes)}</p>
<h3>Cielenie reklamy</h3>
<dl class="facts">
  <dt>Vek</dt><dd>${esc(s.cielenie.vek)}</dd>
  <dt>Lokalita</dt><dd>${esc(s.cielenie.lokalita)}</dd>
  <dt>Záujmy a správanie</dt><dd>${chips(s.cielenie.zaujmy)}</dd>
  <dt>Životné udalosti</dt><dd>${chips(s.cielenie.zivotne_udalosti)}</dd>
</dl>
<p class="note">Reklamy na nehnuteľnosti môže Meta zaradiť do špeciálnej kategórie Bývanie. Vtedy nedovolí cieliť na vek a časť záujmov. Lokalitu a texty použiješ vždy.</p>
<h3>Úvodné vety do reels a reklám</h3>${copyRow(s.hacky)}
<h3>Hotové reklamy</h3>
<div class="ads">${list(s.reklamy).map((r, i) => {
    const full = `${r.nadpis}\n\n${r.text}\n\n${r.vyzva}`;
    return `
  <div class="card ad">
    <p class="lbl">Reklama ${i + 1}</p>
    <p class="ad-title">${esc(r.nadpis)}</p>
    <p>${esc(r.text)}</p>
    <p class="ad-cta">${esc(r.vyzva)}</p>
    <p class="lbl">Vizuál</p><p class="muted">${esc(r.vizual)}</p>
    ${copyBtn(full, 'Kopírovať reklamu')}
  </div>`;
  }).join('')}
</div>
<h3>Nápady na obsah</h3>
<ul class="list content">${list(s.obsah).map((o) => `<li><span class="format">${esc(o.format)}</span>${esc(o.tema)}</li>`).join('')}</ul>`);

  const sH = section('overit', 'H', 'Overenie', 'Čo si over u skutočných zákazníkov', `
<p class="muted">Avatar je postavený z krátkeho zadania a zo znalosti trhu. Tieto otázky polož na najbližších stretnutiach. Ak odpovede sedia, máš potvrdený profil. Ak nie, uprav zadanie a vytvor nového avatara.</p>
${ol(a.h_overit)}`);

  const danger = `
<section class="block no-print danger">
  <form method="post" action="/api/makler/report?token=${esc(row.token)}" id="delete-form">
    <input type="hidden" name="akcia" value="vymazat">
    <button type="submit" class="btn-link">Vymazať avatara</button>
  </form>
</section>`;

  const textJson = JSON.stringify(renderAvatarText(row)).replace(/</g, '\\u003c');
  const script = `<script type="application/json" id="avatar-text">${textJson}</script>
<script src="/makler/copy.js"></script>`;

  return page({ title: a.archetyp, body: head + sA + sB + sC + sD + sE + sF + sG + sH + danger, script });
}

function renderAvatarText(row) {
  const a = row.avatar;
  const typ = FORM.TYPY[row.typ] || FORM.TYPY.predavajuci;
  const v = row.vstupy || {};
  const p = a.a_profil;
  const b = a.b_psychologia;
  const j = a.d_jazyk;
  const c = a.f_cenova_strategia;
  const s = a.g_socialne_siete;
  const bullets = (items) => list(items).map((i) => `- ${i}`).join('\n');
  const numbered = (items) => list(items).map((i, n) => `${n + 1}. ${i}`).join('\n');
  const head = (t) => `\n\n${t.toUpperCase()}\n${'-'.repeat(t.length)}`;

  return [
    `${a.archetyp}`,
    `${typ.title} · ${v.region} · ${v.nehnutelnost} · ${v.cena} · ${v.kanal}`,
    '',
    a.esencia,
    head('A Profil'),
    `Meno: ${p.meno}\nVek: ${p.vek}\nRodina: ${p.rodina}\nPráca a príjem: ${p.praca_a_prijem}\nSituácia: ${p.situacia}\nPrečo práve teraz: ${p.spustac}`,
    head('B Psychológia'),
    `Hlavná bolesť: ${b.hlavna_bolest}`,
    `\nSkryté obavy:\n${bullets(b.skryte_obavy)}`,
    `\nFalošné presvedčenia:\n${list(b.falosne_presvedcenia).map((f) => `- „${f.presvedcenie}“ → ${f.realita}`).join('\n')}`,
    `\nČo naozaj chce:\n${bullets(b.tuzby)}`,
    `\nNa čom mu záleží: ${list(b.na_com_mu_zalezi).join(', ')}`,
    head('C Vnútorný dialóg'),
    a.c_vnutorny_dialog,
    head('D Jazyk zákazníka'),
    `Takto hovorí:\n${bullets(j.ako_hovori)}`,
    `\nSlová, ktoré zaberú: ${list(j.slova_ktore_zaberu).join(', ')}`,
    `Slová, ktoré ho odradia: ${list(j.slova_ktore_odpudia).join(', ')}`,
    head('E Námietky'),
    list(a.e_namietky).map((n) => `„${n.namietka}“\nPod tým: ${n.co_je_pod_tym}\nOdpoveď: ${n.odpoved}`).join('\n\n'),
    head('F Cenová stratégia'),
    `Cenová citlivosť: ${c.cenova_citlivost}`,
    `Ako vníma cenu: ${c.ako_vnima_cenu}`,
    `\nOdporúčaná stratégia: ${c.odporucana_strategia}`,
    `\nPostup:\n${numbered(c.kroky)}`,
    `\nVety o cene:\n${bullets(c.vety_o_cene)}`,
    `\nVyjednávanie:\n${bullets(c.vyjednavanie)}`,
    `\nHodnota služby: ${c.hodnota_sluzby}`,
    `\nČomu sa vyhnúť:\n${bullets(c.chyby)}`,
    head('G Sociálne siete'),
    `Kde ho nájdeš: ${s.kde_ho_najdes}`,
    `\nCielenie: vek ${s.cielenie.vek}; lokalita ${s.cielenie.lokalita}`,
    `Záujmy: ${list(s.cielenie.zaujmy).join(', ')}`,
    `Životné udalosti: ${list(s.cielenie.zivotne_udalosti).join(', ')}`,
    `\nÚvodné vety (hooks):\n${bullets(s.hacky)}`,
    `\nReklamy:\n${list(s.reklamy).map((r, i) => `${i + 1}. ${r.nadpis}\n${r.text}\n${r.vyzva}\nVizuál: ${r.vizual}`).join('\n\n')}`,
    `\nNápady na obsah:\n${list(s.obsah).map((o) => `- ${o.format}: ${o.tema}`).join('\n')}`,
    head('H Čo si over u skutočných zákazníkov'),
    numbered(a.h_overit)
  ].join('\n');
}

function renderPending(row) {
  return page({
    title: 'Avatar sa pripravuje',
    body: `<section class="state"><p class="kicker">Pracujem na tom</p><h1>Avatar sa ešte skladá</h1>
<p class="lead">Zvyčajne to trvá 1–2 minúty. Stránka sa obnoví sama, keď bude hotový.</p>
<p class="spinner" aria-hidden="true"></p></section>`,
    script: `<script>setTimeout(function(){location.reload()},5000)</script>`
  });
}

function renderFailed(row) {
  return page({
    title: 'Avatara sa nepodarilo vytvoriť',
    body: `<section class="state"><p class="kicker">Nepodarilo sa</p><h1>Avatara sa nepodarilo vytvoriť</h1>
<p class="lead">AI generovanie zlyhalo. Zadanie je uložené, stačí to skúsiť znova. Ak to zlyhá opakovane, pošli Silvii technický detail nižšie.</p>
<form method="post" action="/api/makler/report?token=${esc(row.token)}" class="actions">
  <input type="hidden" name="akcia" value="znova">
  <button type="submit" class="btn">Skúsiť znova</button>
  <a class="btn btn-secondary" href="/makler/">Späť na prehľad</a>
</form>
<details class="detail"><summary>Technický detail</summary><pre>${esc(row.error || 'bez detailu')}</pre></details></section>`
  });
}

function renderNotFound() {
  return page({
    title: 'Avatar sa nenašiel',
    body: `<section class="state"><p class="kicker">404</p><h1>Tento avatar neexistuje</h1>
<p class="lead">Možno ho niekto vymazal alebo je odkaz neúplný.</p>
<div class="actions"><a class="btn" href="/makler/">Späť na prehľad</a></div></section>`
  });
}

module.exports = { renderAvatar, renderAvatarText, renderPending, renderFailed, renderNotFound, page };
