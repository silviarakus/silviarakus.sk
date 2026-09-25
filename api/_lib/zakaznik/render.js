const { escapeHtml: esc } = require('./security');
const config = require('./config');

const HEAD = "Sora,'Segoe UI',Arial,sans-serif";
const BODY = "Manrope,'Segoe UI',Arial,sans-serif";
const LINE = 'rgba(245,241,232,.10)';
const LINE_COPPER = 'rgba(198,106,43,.28)';
const COPPER_TINT = 'rgba(198,106,43,.08)';

/* Jedna sada štýlov: e-mail ich dostane inline, web ako triedy .rk-* */
const S = {
  page: `background-color:#0B0D10;color:#F5F1E8;font-family:${BODY};font-size:16px;line-height:1.65;`,
  header: `padding:8px 0 28px;border-bottom:1px solid ${LINE};`,
  logo: 'display:block;width:150px;height:auto;border:0;',
  kicker: `margin:28px 0 0;font-family:${BODY};font-size:12px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#C66A2B;`,
  h1: `margin:10px 0 0;font-family:${HEAD};font-size:34px;line-height:1.15;font-weight:800;color:#F5F1E8;`,
  lead: 'margin:14px 0 0;font-size:18px;line-height:1.6;color:#F5F1E8;',
  meta: 'margin:16px 0 0;font-size:14px;line-height:1.6;color:#8E8E8E;',
  section: `padding:36px 0 16px;border-bottom:1px solid ${LINE};`,
  eyebrow: `margin:0;font-family:${BODY};font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#C66A2B;`,
  h2: `margin:8px 0 18px;font-family:${HEAD};font-size:24px;line-height:1.25;font-weight:700;color:#F5F1E8;`,
  h3: `margin:22px 0 8px;font-family:${BODY};font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#8E8E8E;`,
  p: 'margin:0 0 12px;color:#F5F1E8;',
  pLarge: 'margin:0 0 12px;font-size:18px;line-height:1.6;color:#F5F1E8;',
  quote: `margin:0 0 12px;padding:4px 0 4px 16px;border-left:3px solid #C66A2B;font-size:17px;line-height:1.6;color:#F5F1E8;`,
  chips: 'margin:0 0 4px;line-height:1;',
  chip: `display:inline-block;margin:0 6px 8px 0;padding:7px 12px;border:1px solid #C66A2B;background-color:${COPPER_TINT};border-radius:999px;font-size:14px;line-height:1.3;color:#F5F1E8;`,
  chipMuted: 'display:inline-block;margin:0 6px 8px 0;padding:7px 12px;border:1px dashed #8E8E8E;border-radius:999px;font-size:14px;line-height:1.3;color:#8E8E8E;',
  table: 'width:100%;border-collapse:collapse;',
  dt: `width:32%;padding:12px 14px 12px 0;vertical-align:top;border-top:1px solid ${LINE};font-size:13px;font-weight:600;color:#8E8E8E;`,
  dd: `padding:12px 0;vertical-align:top;border-top:1px solid ${LINE};color:#F5F1E8;`,
  list: 'margin:0 0 12px;padding-left:22px;color:#F5F1E8;',
  li: 'margin:0 0 8px;',
  missing: `margin:28px 0 0;padding:20px;border:1px solid #C66A2B;background-color:${COPPER_TINT};`,
  missingTitle: `margin:0 0 10px;font-family:${HEAD};font-size:18px;font-weight:700;color:#F5F1E8;`,
  ppHead: `width:50%;padding:0 14px 10px 0;font-family:${HEAD};font-size:15px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#C66A2B;text-align:left;`,
  ppHeadPo: `width:50%;padding:0 0 10px 14px;border-left:1px solid ${LINE_COPPER};font-family:${HEAD};font-size:15px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#C66A2B;text-align:left;`,
  ppLabel: `padding:14px 0 6px;border-top:1px solid ${LINE};font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#8E8E8E;`,
  ppCell: 'width:50%;padding:0 14px 12px 0;vertical-align:top;color:#F5F1E8;',
  ppCellPo: `width:50%;padding:0 0 12px 14px;vertical-align:top;border-left:1px solid ${LINE_COPPER};color:#F5F1E8;`,
  ppTag: 'display:none;',
  objection: `margin:0 0 16px;padding:18px 18px 8px;background-color:#1C2128;border:1px solid ${LINE};`,
  objLabel: `margin:10px 0 4px;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#8E8E8E;`,
  cta: `margin:36px 0 0;padding:24px;background-color:#1C2128;border:1px solid ${LINE_COPPER};`,
  ctaTitle: `margin:0 0 8px;font-family:${HEAD};font-size:20px;line-height:1.3;font-weight:700;color:#F5F1E8;`,
  btn: `display:inline-block;margin-top:8px;padding:14px 22px;background-color:#C66A2B;color:#0B0D10;font-family:${HEAD};font-size:15px;font-weight:700;text-decoration:none;border-radius:4px;`,
  footer: 'padding:32px 0 8px;text-align:center;',
  sign: `margin:0;font-family:${HEAD};font-size:16px;font-weight:600;color:#F5F1E8;`,
  small: 'margin:8px 0 0;font-size:13px;line-height:1.6;color:#8E8E8E;',
  link: 'color:#C66A2B;text-decoration:underline;'
};

function renderer(mode) {
  const a = (key) => (mode === 'email' ? ` style="${S[key]}"` : ` class="rk-${key}"`);
  const el = (tag, key, inner, attrs = '') => `<${tag}${a(key)}${attrs}>${inner}</${tag}>`;
  return { a, el };
}

const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);

function renderReport(profile, meta, mode) {
  const { a, el } = renderer(mode);
  const t = (v) => esc(v);
  const para = (v, key = 'p') => el('p', key, t(v));
  const h3 = (label) => el('h3', 'h3', t(label));
  const quotes = (items) => list(items).map((q) => el('blockquote', 'quote', t(q))).join('');
  const chips = (items, key = 'chip') =>
    el('p', 'chips', list(items).map((c) => el('span', key, t(c))).join(' '));
  const ol = (items, tag = 'ol') =>
    `<${tag}${a('list')}>${list(items).map((i) => el('li', 'li', t(i))).join('')}</${tag}>`;
  const section = (letter, eyebrow, title, body) =>
    `<div${a('section')}>${el('p', 'eyebrow', `${letter} — ${t(eyebrow)}`)}${el('h2', 'h2', t(title))}${body}</div>`;

  const d = profile.a_demografia;
  const b = profile.b_psychografia;
  const j = profile.d_jazyk_zakaznika;
  const pp = profile.f_pred_po;
  const m = profile.h_marketingove_materialy;
  const missing = list(profile.chyba_v_zadani);

  const logo = `<img src="${esc(config.siteUrl)}/assets/fenix-logo-horizontal.png" width="150" height="39" alt="FENIX"${a('logo')}>`;
  const metaLine = [meta.segment && `Segment: ${meta.segment}`, meta.date && `Vytvorené ${meta.date}`]
    .filter(Boolean)
    .map(t)
    .join(' · ');

  const header =
    `<div${a('header')}>${logo}` +
    el('p', 'kicker', 'Kto je môj zákazník?') +
    el('h1', 'h1', t(profile.archetyp)) +
    el('p', 'lead', t(profile.esencia)) +
    (metaLine ? el('p', 'meta', metaLine) : '') +
    (missing.length
      ? `<div${a('missing')}>${el('p', 'missingTitle', 'Čo ešte potrebuješ zistiť')}` +
        el('p', 'p', 'Na tieto otázky tvoje odpovede nestačili, preto ich profil nedomýšľa. Zisti ich od zákazníkov a profil bude presnejší.') +
        `${ol(missing)}</div>`
      : '') +
    '</div>';

  const demoRows = [
    ['Meno', d.meno], ['Vek', d.vek], ['Profesia', d.profesia], ['Príjem', d.prijem],
    ['Rodina', d.rodina], ['Lokalita', d.lokalita], ['Denný rytmus', d.denny_rytmus], ['Aktuálny stav', d.aktualny_stav]
  ];
  const sA = section('A', 'Demografia', 'Kto to je',
    `<table role="presentation"${a('table')}>${demoRows
      .map(([k, v]) => `<tr>${el('td', 'dt', t(k))}${el('td', 'dd', t(v))}</tr>`)
      .join('')}</table>`);

  const sB = section('B', 'Psychografia', 'Čo sa mu deje v hlave',
    h3('Hlavná bolesť') + para(b.hlavna_bolest, 'pLarge') +
    h3('Najväčšia frustrácia') + para(b.najvacsia_frustracia) +
    h3('Najväčší strach') + para(b.najvacsi_strach) +
    h3('Čo už skúšal') + para(b.co_uz_skusal) +
    h3('Prečo to nefungovalo') + para(b.preco_to_nefungovalo) +
    h3('Falošné presvedčenia') + quotes(b.falosne_presvedcenia) +
    h3('Skrytá túžba') + para(b.skryta_tuzba) +
    h3('Vysnený výsledok') + para(b.vysneny_vysledok) +
    h3('Ako sa chce cítiť') + para(b.ako_sa_chce_citit) +
    h3('Kým sa chce stať') + para(b.kym_sa_chce_stat) +
    h3('Ako ho má vidieť okolie') + para(b.socialny_rozmer) +
    h3('Hodnoty') + chips(b.hodnoty) +
    h3('Strachy') + chips(b.strachy) +
    h3('Statusové symboly') + chips(b.statusove_symboly));

  const sC = section('C', 'Vnútorný dialóg', 'Čo si hovorí večer doma', el('blockquote', 'quote', t(profile.c_vnutorny_dialog)));

  const sD = section('D', 'Jazyk zákazníka', 'Ako hovorí',
    h3('Štýl komunikácie') + para(j.styl_komunikacie) +
    h3('Ako opisuje problém') + quotes(j.ako_opisuje_problem) +
    h3('Ako hovorí o peniazoch') + quotes(j.ako_hovori_o_peniazoch) +
    h3('Ako hovorí o riziku') + quotes(j.ako_hovori_o_riziku) +
    h3('Ako opisuje výsledok') + quotes(j.ako_opisuje_vysledok) +
    h3('Slová, ktoré chce počuť') + chips(j.spustacie_slova) +
    h3('Slová, ktoré ho odpudzujú') + chips(j.odpudzujuce_slova, 'chipMuted'));

  const sE = section('E', 'Kamarátovi pri káve', 'Ako to povie kamarátovi', quotes(profile.e_kamaradovi));

  const ppRows = [
    ['Čo má', 'co_ma'], ['Čo robí', 'co_robi'], ['Ako sa cíti', 'ako_sa_citi'], ['Ako sa vníma', 'ako_sa_vnima']
  ];
  const sF = section('F', 'Pred a po', 'Odkiaľ a kam ide',
    `<table role="presentation"${a('table')}><tr>${el('th', 'ppHead', 'Pred')}${el('th', 'ppHeadPo', 'Po')}</tr>` +
    ppRows
      .map(([label, key]) =>
        `<tr>${el('td', 'ppLabel', t(label), ' colspan="2"')}</tr>` +
        `<tr>${el('td', 'ppCell', el('span', 'ppTag', 'Pred') + t(pp.pred[key]))}` +
        `${el('td', 'ppCellPo', el('span', 'ppTag', 'Po') + t(pp.po[key]))}</tr>`)
      .join('') +
    '</table>');

  const sG = section('G', 'Námietky', 'Prečo ešte nekúpil a čo mu odpovedať',
    list(profile.g_namietky)
      .map((n) =>
        `<div${a('objection')}>${el('blockquote', 'quote', t(n.namietka))}` +
        el('p', 'objLabel', 'Čo je pod tým') + para(n.co_je_pod_tym) +
        el('p', 'objLabel', 'Čo mu odpovedať') + para(n.odpoved) +
        '</div>')
      .join(''));

  const sH = section('H', 'Marketingové materiály', 'Vety, ktoré môžeš použiť hneď',
    h3('Headliny') + ol(m.headliny) +
    h3('Podnadpisy') + ol(m.podnadpisy) +
    h3('Úvodné vety na hovor') + ol(m.uvodne_vety_na_hovor) +
    h3('Nápady na obsah') + ol(m.napady_na_obsah));

  const cta =
    `<div${a('cta')}>` +
    el('p', 'ctaTitle', 'Vieš, komu predávaš. Ďalší krok je hodnota, ktorú mu ponúkneš.') +
    el('p', 'p', 'Profil zákazníka je základ. Na ňom sa stavia ponuka, cena a komunikácia, ktorú trh pochopí, ocení a zaplatí.') +
    `<a href="${esc(config.ctaUrl)}"${a('btn')}>${t(config.ctaLabel)}</a></div>`;

  const footer =
    `<div${a('footer')}>` +
    el('p', 'sign', 'Výsledok je dôsledok, nie náhoda.') +
    el('p', 'small', 'Silvia Rakus · FENIX · silviarakus.sk') +
    '</div>';

  return header + sA + sB + sC + sD + sE + sF + sG + sH + cta + footer;
}

function webCss() {
  const base = Object.entries(S).map(([k, v]) => `.rk-${k}{${v}}`).join('\n');
  return `${base}
@media (max-width:600px){
  .rk-h1{font-size:28px}
  .rk-dt,.rk-dd{display:block;width:auto}
  .rk-dt{padding-bottom:2px}
  .rk-dd{border-top:0;padding-top:0}
  .rk-ppHead,.rk-ppHeadPo{display:none}
  .rk-ppCell,.rk-ppCellPo{display:block;width:auto;padding:0 0 12px 14px;border-left:1px solid ${LINE_COPPER}}
  .rk-ppTag{display:block;margin-bottom:2px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#C66A2B}
}
@media print{
  .rk-page,.rk-page *{background-color:#F5F1E8 !important;color:#0B0D10 !important}
  .rk-quote{border-left-color:#C66A2B !important}
  .rk-chip,.rk-missing,.rk-cta{border-color:#C66A2B !important}
  .rk-section,.rk-header,.rk-dt,.rk-dd,.rk-ppLabel{border-color:rgba(11,13,16,.18) !important}
  .rk-btn{border:1px solid #C66A2B !important}
  .rk-objection{border-color:rgba(11,13,16,.18) !important;break-inside:avoid}
  .rk-section{break-inside:auto}
  .rk-h2,.rk-h3{break-after:avoid}
}`;
}

function renderReportText(profile, meta) {
  const L = [];
  const b = profile.b_psychografia;
  const d = profile.a_demografia;
  const j = profile.d_jazyk_zakaznika;
  const m = profile.h_marketingove_materialy;
  const add = (...lines) => L.push(...lines);
  const items = (arr, prefix = '- ') => list(arr).forEach((i, n) => add(`${prefix === '#' ? `${n + 1}. ` : prefix}${i}`));
  const quoteLines = (arr) => list(arr).forEach((q) => add(`„${q}“`));

  add('KTO JE MÔJ ZÁKAZNÍK?', '', profile.archetyp.toUpperCase(), profile.esencia, '');
  if (meta.segment) add(`Segment: ${meta.segment}`, '');
  if (list(profile.chyba_v_zadani).length) {
    add('ČO EŠTE POTREBUJEŠ ZISTIŤ');
    items(profile.chyba_v_zadani, '#');
    add('');
  }
  add('A — KTO TO JE',
    `Meno: ${d.meno}`, `Vek: ${d.vek}`, `Profesia: ${d.profesia}`, `Príjem: ${d.prijem}`,
    `Rodina: ${d.rodina}`, `Lokalita: ${d.lokalita}`, `Denný rytmus: ${d.denny_rytmus}`, `Aktuálny stav: ${d.aktualny_stav}`, '');
  add('B — ČO SA MU DEJE V HLAVE',
    `Hlavná bolesť: ${b.hlavna_bolest}`, `Najväčšia frustrácia: ${b.najvacsia_frustracia}`,
    `Najväčší strach: ${b.najvacsi_strach}`, `Čo už skúšal: ${b.co_uz_skusal}`,
    `Prečo to nefungovalo: ${b.preco_to_nefungovalo}`, 'Falošné presvedčenia:');
  quoteLines(b.falosne_presvedcenia);
  add(`Skrytá túžba: ${b.skryta_tuzba}`, `Vysnený výsledok: ${b.vysneny_vysledok}`,
    `Ako sa chce cítiť: ${b.ako_sa_chce_citit}`, `Kým sa chce stať: ${b.kym_sa_chce_stat}`,
    `Ako ho má vidieť okolie: ${b.socialny_rozmer}`,
    `Hodnoty: ${list(b.hodnoty).join(', ')}`, `Strachy: ${list(b.strachy).join(', ')}`,
    `Statusové symboly: ${list(b.statusove_symboly).join(', ')}`, '');
  add('C — VNÚTORNÝ DIALÓG', `„${profile.c_vnutorny_dialog}“`, '');
  add('D — AKO HOVORÍ', `Štýl komunikácie: ${j.styl_komunikacie}`, 'Ako opisuje problém:');
  quoteLines(j.ako_opisuje_problem);
  add('Ako hovorí o peniazoch:');
  quoteLines(j.ako_hovori_o_peniazoch);
  add('Ako hovorí o riziku:');
  quoteLines(j.ako_hovori_o_riziku);
  add('Ako opisuje výsledok:');
  quoteLines(j.ako_opisuje_vysledok);
  add(`Slová, ktoré chce počuť: ${list(j.spustacie_slova).join(', ')}`,
    `Slová, ktoré ho odpudzujú: ${list(j.odpudzujuce_slova).join(', ')}`, '');
  add('E — AKO TO POVIE KAMARÁTOVI');
  quoteLines(profile.e_kamaradovi);
  add('');
  const pp = profile.f_pred_po;
  add('F — PRED A PO');
  [['Čo má', 'co_ma'], ['Čo robí', 'co_robi'], ['Ako sa cíti', 'ako_sa_citi'], ['Ako sa vníma', 'ako_sa_vnima']]
    .forEach(([label, key]) => add(`${label} — PRED: ${pp.pred[key]}`, `${label} — PO: ${pp.po[key]}`));
  add('', 'G — NÁMIETKY');
  list(profile.g_namietky).forEach((n) => add(`„${n.namietka}“`, `Čo je pod tým: ${n.co_je_pod_tym}`, `Čo mu odpovedať: ${n.odpoved}`, ''));
  add('H — VETY, KTORÉ MÔŽEŠ POUŽIŤ HNEĎ', 'Headliny:');
  items(m.headliny, '#');
  add('Podnadpisy:');
  items(m.podnadpisy, '#');
  add('Úvodné vety na hovor:');
  items(m.uvodne_vety_na_hovor, '#');
  add('Nápady na obsah:');
  items(m.napady_na_obsah, '#');
  add('', `${config.ctaLabel}: ${config.ctaUrl}`, '', 'Výsledok je dôsledok, nie náhoda.', 'Silvia Rakus · FENIX · silviarakus.sk');
  return L.join('\n');
}

module.exports = { renderReport, renderReportText, webCss, S };
