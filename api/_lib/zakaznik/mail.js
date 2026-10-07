const config = require('./config');
const { renderReport, renderReportText, S } = require('./render');
const { escapeHtml: esc } = require('./security');

async function send({ to, subject, html, text }) {
  if (config.mock) return require('../../../scripts/dev/mock-mail').send({ to, subject, html, text });
  if (!config.resendKey) throw new Error('Chýba RESEND_API_KEY');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: config.mailFrom, reply_to: config.mailReplyTo, to: [to], subject, html, text })
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

function reportUrl(token) {
  return `${config.siteUrl}/kto-je-moj-zakaznik/report/${token}`;
}

function formatDate(iso) {
  const d = new Date(iso || Date.now());
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

function emailShell({ title, preheader, inner }) {
  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#0B0D10;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B0D10" style="background-color:#0B0D10;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;">
<tr><td style="${S.page}">${inner}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function sendReport(row) {
  const url = reportUrl(row.token);
  const profile = row.avatar;
  const meta = { segment: row.segment_label, date: formatDate(row.generated_at) };
  const intro =
    `<p style="${S.p}">Ahoj ${esc(row.meno)},</p>` +
    `<p style="${S.p}">tu je profil tvojho zákazníka. Použi ho pri písaní reklamy, webu aj pred ďalším obchodným hovorom — najsilnejšie sú vety, ktoré sú napísané jeho slovami.</p>` +
    `<p style="${S.small}">Report máš uložený aj online: <a href="${esc(url)}" style="${S.link}">Otvoriť v prehliadači</a></p>`;
  const html = emailShell({
    title: `Kto je tvoj zákazník: ${profile.archetyp}`,
    preheader: profile.esencia,
    inner: `<div style="padding:0 0 24px;border-bottom:1px solid rgba(245,241,232,.10);">${intro}</div>${renderReport(profile, meta, 'email')}`
  });
  const text =
    `Ahoj ${row.meno},\n\ntu je profil tvojho zákazníka. Online ho nájdeš tu:\n${url}\n\n` +
    renderReportText(profile, meta);
  return send({ to: row.email, subject: `Kto je tvoj zákazník: ${profile.archetyp}`, html, text });
}

async function sendFailureToUser(row) {
  const url = reportUrl(row.token);
  const inner =
    `<img src="${esc(config.siteUrl)}/assets/fenix-logo-horizontal.png" width="150" height="39" alt="FENIX" style="${S.logo}">` +
    `<p style="${S.kicker}">Kto je môj zákazník?</p>` +
    `<h1 style="${S.h1}">Nedopadlo to, skúšame znova</h1>` +
    `<p style="${S.lead}">Ahoj ${esc(row.meno)}, tvoje odpovede máme uložené, ale profil sa napoprvé nepodarilo dokončiť.</p>` +
    `<p style="${S.p}">Nemusíš nič vypĺňať znova. Skúsime to ešte raz a hotový report ti pošleme na tento e-mail. Stav si môžeš pozrieť aj tu:</p>` +
    `<p style="${S.p}"><a href="${esc(url)}" style="${S.btn}">Stav reportu</a></p>` +
    `<p style="${S.small}">Ak by ti report neprišiel do 24 hodín, odpíš na tento e-mail.</p>`;
  return send({
    to: row.email,
    subject: 'Nedopadlo to, skúšame znova',
    html: emailShell({ title: 'Nedopadlo to, skúšame znova', preheader: 'Tvoje odpovede máme uložené.', inner }),
    text: `Ahoj ${row.meno},\n\ntvoje odpovede máme uložené, ale profil sa napoprvé nepodarilo dokončiť. Nemusíš nič vypĺňať znova — skúsime to ešte raz a report ti pošleme na tento e-mail.\n\nStav reportu: ${url}\n\nAk by ti report neprišiel do 24 hodín, odpíš na tento e-mail.`
  });
}

async function notifyOwner(row, error) {
  const url = reportUrl(row.token);
  const lines = [
    'Generovanie profilu zákazníka zlyhalo.',
    '',
    `Meno: ${row.meno}`,
    `E-mail: ${row.email}`,
    `Firma: ${row.firma || '—'}`,
    `Segment: ${row.segment_label || '—'}`,
    `Pokusy: ${row.attempts}`,
    `Chyba: ${error}`,
    `ID v databáze: ${row.id}`,
    `Report: ${url}`
  ];
  return send({
    to: config.notifyEmail,
    subject: `[Kto je môj zákazník] Zlyhanie: ${row.meno}`,
    html: `<pre style="font-family:Menlo,Consolas,monospace;font-size:13px;white-space:pre-wrap;">${esc(lines.join('\n'))}</pre>`,
    text: lines.join('\n')
  });
}

module.exports = { sendReport, sendFailureToUser, notifyOwner, reportUrl, formatDate, emailShell };
