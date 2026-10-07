const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zakaznik-test-'));
process.env.ZAKAZNIK_MOCK = '1';
process.env.ZAKAZNIK_DEV_DATA = dataDir;
process.env.MOCK_AI_DELAY_MS = '5';

const ROOT = path.join(__dirname, '..');
const FORM = require('../assets/zakaznik/form.js');
const { profileSchema, toolInputSchema } = require('../api/_lib/zakaznik/schema');
const prompt = require('../api/_lib/zakaznik/prompt');
const { renderReport, renderReportText } = require('../api/_lib/zakaznik/render');
const fixture = require('../scripts/dev/fixture-profile.json');
const deep = require('./fixtures/answers-deep.json');

function mockReq({ method = 'GET', body, query = {}, headers = {} } = {}) {
  return { method, body, query, url: '/', headers: { 'user-agent': 'test', 'x-forwarded-for': headers.ip || '203.0.113.1', ...headers } };
}
function mockRes() {
  const res = { statusCode: 200, headers: {}, body: '' };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.end = (b) => { res.body = b || ''; res.done = true; };
  res.json = () => JSON.parse(res.body);
  return res;
}
async function call(handler, req) {
  const res = mockRes();
  await handler(req, res);
  return res;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('každé povinné pole má konkrétnu výzvu, nie generické „pole je povinné“', () => {
  for (const f of FORM.allFields()) {
    if (f.optional) continue;
    const empty = f.type === 'chips' ? [] : '';
    const msg = FORM.fieldError(f, empty);
    assert.ok(msg && msg.length > 30, `${f.id} nemá výzvu`);
    assert.doesNotMatch(msg, /povinné/i);
  }
});

test('minimá dĺžok a počtu položiek zodpovedajú zadaniu', () => {
  const mins = { produkt: 80, segment: 60, vek_situacia: 60, profesia: 60, aktualny_stav: 100, problem_technicky: 40,
    problem_emocny: 80, strach: 80, cena_necinnosti: 60, co_skusal: 80, preco_nefungovalo: 60, vysledok: 80,
    skryta_tuzba: 80, pocit: 40, identita: 60, kamaradovi: 100 };
  for (const f of FORM.allFields()) {
    if (mins[f.id] !== undefined) {
      assert.equal(f.min, mins[f.id], f.id);
      assert.ok(FORM.fieldError(f, 'x'.repeat(f.min - 1)));
      assert.equal(FORM.fieldError(f, 'x'.repeat(f.min)), null);
    }
    if (f.type === 'chips') {
      assert.equal(f.minItems, 3);
      assert.ok(FORM.fieldError(f, ['jedna', 'dve']));
      assert.ok(FORM.fieldError(f, ['jedna', 'dve', 'x']), 'príliš krátka položka sa nepočíta');
      assert.equal(FORM.fieldError(f, ['jedna', 'dve', 'tri']), null);
    }
  }
  assert.equal(FORM.fieldError(FORM.allFields().find((f) => f.id === 'kde_zije'), ''), null);
});

test('výzva pri problem_emocny a namietky je presne podľa briefu', () => {
  const byId = Object.fromEntries(FORM.allFields().map((f) => [f.id, f]));
  assert.equal(byId.problem_emocny.hint, 'Skús ísť o úroveň hlbšie. Čo pre neho ten problém znamená? Čo kvôli tomu nemôže robiť alebo čoho sa bojí?');
  assert.match(byId.namietky.hint, /Skús si vybaviť posledné tri hovory, ktoré nedopadli\.$/);
});

test('mäkký hint pri prázdnych frázach — aj bez diakritiky, len pri krátkych odpovediach', () => {
  assert.match(FORM.emptyPhraseHint('Chce ušetriť.'), /Na čom presne chce ušetriť/);
  assert.match(FORM.emptyPhraseHint('chce usetrit a nema cas'), /ušetriť/);
  assert.ok(FORM.emptyPhraseHint('Ocení individuálny prístup'));
  assert.equal(FORM.emptyPhraseHint('Štve ho, že každý rok platí viac a nemá nad tým žiadnu kontrolu.'), null);
  assert.equal(FORM.emptyPhraseHint(`chce ušetriť ${'x'.repeat(200)}`), null);
});

test('ukážkový výstup prechádza zod schémou a tool schéma má všetky bloky 6.4', () => {
  assert.equal(profileSchema.safeParse(fixture).success, true);
  const schema = toolInputSchema();
  assert.equal(schema.type, 'object');
  assert.equal(schema.$schema, undefined);
  for (const key of ['archetyp', 'esencia', 'a_demografia', 'b_psychografia', 'c_vnutorny_dialog', 'd_jazyk_zakaznika',
    'e_kamaradovi', 'f_pred_po', 'g_namietky', 'h_marketingove_materialy', 'chyba_v_zadani']) {
    assert.ok(schema.required.includes(key), key);
  }
  const broken = JSON.parse(JSON.stringify(fixture));
  delete broken.g_namietky;
  broken.e_kamaradovi = ['len jedna'];
  assert.equal(profileSchema.safeParse(broken).success, false);
});

test('system prompt je doslovný, dosadí kontext a pri malom objeme pridá zákaz domýšľania', () => {
  const sys = prompt.buildSystemPrompt(deep);
  assert.match(sys, /^Si expert na tvorbu marketingových avatarov podľa metodiky Silvie Rakus\./);
  assert.ok(sys.includes(`Predmet predaja: ${deep.produkt}`));
  assert.ok(sys.includes('Cenová hladina: provízia z transakcie'));
  assert.ok(!sys.includes('{{'));
  assert.equal(prompt.isLowInput(deep), false);
  assert.ok(!sys.includes('OBMEDZENÉ VSTUPY'));

  const shallow = { produkt: 'byty', segment: 'dedičia', cena: 'do 500 €', namietky: ['drahé', 'počkám', 'neverím'] };
  assert.equal(prompt.isLowInput(shallow), true);
  assert.ok(prompt.buildSystemPrompt(shallow).includes('chyba_v_zadani'));
  assert.ok(prompt.buildSystemPrompt(shallow).includes('Nič nedomýšľaj'));
});

test('user message obsahuje všetky polia v poradí krokov, doslovne', () => {
  const msg = prompt.buildUserMessage(deep);
  let last = -1;
  for (const f of FORM.allFields()) {
    const idx = msg.indexOf(`[${f.id}] ${f.label}`);
    assert.ok(idx > last, `${f.id} je mimo poradia`);
    last = idx;
  }
  assert.ok(msg.includes('- Nechcem kúpiť mačku vo vreci.'));
  assert.ok(msg.includes(deep.kamaradovi));
  assert.ok(msg.trim().endsWith('Použi priamo formulácie zákazníka tam, kde ich mám v odpovediach.'));
});

test('report escapuje HTML a web/e-mail používajú rovnaký obsah', () => {
  const evil = JSON.parse(JSON.stringify(fixture));
  evil.archetyp = '<script>alert(1)</script>';
  evil.c_vnutorny_dialog = '"><img src=x onerror=alert(1)>';
  const web = renderReport(evil, { segment: 'Test <b>', date: '1. 1. 2026' }, 'web');
  const email = renderReport(evil, { segment: 'Test <b>', date: '1. 1. 2026' }, 'email');
  for (const out of [web, email]) {
    assert.ok(!out.includes('<script>'));
    assert.ok(!out.includes('<img src=x'));
    assert.ok(out.includes('&lt;script&gt;'));
    for (const l of ['A —', 'B —', 'C —', 'D —', 'E —', 'F —', 'G —', 'H —']) assert.ok(out.includes(l), l);
    assert.ok(out.includes('Výsledok je dôsledok, nie náhoda.'));
  }
  assert.ok(!web.includes('style="'));
  assert.ok(!email.includes('class="rk-'));
  assert.ok(!web.includes('Čo ešte potrebuješ zistiť'));

  const withGaps = { ...fixture, chyba_v_zadani: ['Aké vety od neho počuješ?'] };
  assert.ok(renderReport(withGaps, {}, 'web').includes('Čo ešte potrebuješ zistiť'));
  assert.ok(renderReportText(withGaps, {}).includes('ČO EŠTE POTREBUJEŠ ZISTIŤ'));
});

test('brand: nové súbory používajú len farby z palety 9.1 a len Sora + Manrope', () => {
  const palette = new Set(['#0B0D10', '#1C2128', '#F5F1E8', '#C66A2B', '#FF7A1A', '#8E8E8E', '#11151A', '#E84A1A', '#D8C7AA']);
  const files = ['kto-je-moj-zakaznik.html', 'ochrana-osobnych-udajov.html', 'assets/zakaznik/wizard.js',
    'api/_lib/zakaznik/render.js', 'api/_lib/zakaznik/mail.js', 'api/zakaznik/report.js'];
  for (const file of files) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const hex of src.match(/#[0-9a-fA-F]{6}\b/g) || []) {
      assert.ok(palette.has(hex.toUpperCase()), `${file}: ${hex} nie je v palete`);
    }
    for (const rgba of src.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/g) || []) {
      assert.ok(/rgba\((245,241,232|198,106,43|11,13,16)/.test(rgba.replace(/\s/g, '')), `${file}: ${rgba}`);
    }
    for (const fam of src.match(/family=[A-Za-z+]+/g) || []) {
      assert.ok(['family=Sora', 'family=Manrope'].includes(fam), `${file}: ${fam}`);
    }
    assert.ok(!/FÉNIX|Fénix/.test(src), `${file}: FENIX s diakritikou`);
  }
  const page = fs.readFileSync(path.join(ROOT, 'kto-je-moj-zakaznik.html'), 'utf8');
  const signalUses = page.match(/var\(--signal\)/g) || [];
  const signalLines = page.split('\n').filter((l) => l.includes('var(--signal)'));
  assert.ok(signalUses.length > 0);
  for (const l of signalLines) assert.match(l, /invalid|error/, `--signal mimo chybového stavu: ${l}`);
  assert.ok(!/background[^;]*var\(--sand\)/.test(page), '--sand ako pozadie');
});

test('end-to-end (mock): submit → generovanie → e-mail → report → výmaz', async () => {
  const submit = require('../api/zakaznik/submit');
  const status = require('../api/zakaznik/status');
  const report = require('../api/zakaznik/report');
  const del = require('../api/zakaznik/delete');

  const body = { odpovede: deep, meno: 'Jana', email: 'Jana@Example.sk', gdpr_suhlas: true, marketing_suhlas: true, utm: { utm_source: 'ig', evil: 'x' } };
  const r = await call(submit, mockReq({ method: 'POST', body }));
  assert.equal(r.statusCode, 200, r.body);
  const { token } = r.json();
  assert.match(token, /^[A-Za-z0-9_-]{32}$/);

  let s;
  for (let i = 0; i < 50; i++) {
    s = (await call(status, mockReq({ query: { token } }))).json();
    if (s.status === 'done' && s.email_sent) break;
    await wait(20);
  }
  assert.deepEqual(s, { status: 'done', email_sent: true });

  const mails = fs.readdirSync(path.join(dataDir, 'mail')).filter((f) => f.endsWith('.txt'));
  const mail = fs.readFileSync(path.join(dataDir, 'mail', mails[0]), 'utf8');
  assert.match(mail, /^To: jana@example\.sk\nSubject: Kto je tvoj zákazník: Opatrný Peter/);
  assert.ok(mail.includes(`/kto-je-moj-zakaznik/report/${token}`));

  const db = require('../api/_lib/zakaznik/db');
  const row = await db.getByToken(token);
  assert.equal(row.ip_hash.length, 64);
  assert.ok(!JSON.stringify(row).includes('203.0.113.1'));
  assert.deepEqual(row.utm, { utm_source: 'ig' });
  assert.equal(row.marketing_suhlas, true);
  assert.ok(row.gdpr_cas);

  const page = await call(report, mockReq({ query: { token } }));
  assert.equal(page.statusCode, 200);
  assert.ok(page.body.includes('Opatrný Peter'));
  assert.equal(page.headers['x-robots-tag'], 'noindex, nofollow');

  const missing = await call(report, mockReq({ query: { token: 'A'.repeat(32) } }));
  assert.equal(missing.statusCode, 404);
  assert.ok(!missing.body.includes('Opatrný'));
  assert.equal((await call(report, mockReq({ query: { token: '../etc' } }))).statusCode, 404);

  assert.equal((await call(del, mockReq({ method: 'POST', body: { token, email: 'iny@example.sk' } }))).statusCode, 400);
  assert.equal((await call(del, mockReq({ method: 'POST', body: { token, email: 'JANA@example.sk' } }))).statusCode, 200);
  assert.equal((await call(report, mockReq({ query: { token } }))).statusCode, 404);
});

test('rate limit: 1 / e-mail / 10 min a 3 / IP / hodinu', async () => {
  const submit = require('../api/zakaznik/submit');
  const send = (email, ip) => call(submit, mockReq({ method: 'POST', headers: { ip }, body: { odpovede: deep, meno: 'X', email, gdpr_suhlas: true } }));
  assert.equal((await send('a@example.sk', '198.51.100.7')).statusCode, 200);
  assert.equal((await send('a@example.sk', '198.51.100.8')).statusCode, 429);
  assert.equal((await send('b@example.sk', '198.51.100.7')).statusCode, 200);
  assert.equal((await send('c@example.sk', '198.51.100.7')).statusCode, 200);
  const fourth = await send('d@example.sk', '198.51.100.7');
  assert.equal(fourth.statusCode, 429);
  assert.match(fourth.json().error, /hodinu/);
  await wait(100);
});

test('server odmietne krátke odpovede, chýbajúci súhlas a vyplnený honeypot', async () => {
  const submit = require('../api/zakaznik/submit');
  const post = (body) => call(submit, mockReq({ method: 'POST', headers: { ip: '192.0.2.50' }, body }));
  const short = await post({ odpovede: { ...deep, problem_emocny: 'štve ho to' }, meno: 'X', email: 'short@example.sk', gdpr_suhlas: true });
  assert.equal(short.statusCode, 400);
  assert.equal(short.json().field, 'problem_emocny');
  const noGdpr = await post({ odpovede: deep, meno: 'X', email: 'nogdpr@example.sk', gdpr_suhlas: false });
  assert.equal(noGdpr.json().field, 'gdpr_suhlas');
  const bot = await post({ odpovede: deep, meno: 'X', email: 'bot@example.sk', gdpr_suhlas: true, web: 'http://spam' });
  assert.equal(bot.statusCode, 400);
});

test('nevalidný výstup AI spustí jeden opravný re-prompt', async () => {
  process.env.MOCK_AI_INVALID = '1';
  try {
    const { generateProfile } = require('../api/_lib/zakaznik/generate');
    const result = await generateProfile(deep);
    assert.equal(profileSchema.safeParse(result.profile).success, true);
    assert.equal(result.tokensOut, 8400, 'dve volania: pôvodné + oprava');
  } finally {
    delete process.env.MOCK_AI_INVALID;
  }
});

test('zlyhanie AI: submission ostane v DB, status failed, používateľ aj Silvia dostanú e-mail', async () => {
  process.env.MOCK_AI_FAIL = '1';
  try {
    const submit = require('../api/zakaznik/submit');
    const status = require('../api/zakaznik/status');
    const r = await call(submit, mockReq({ method: 'POST', headers: { ip: '192.0.2.99' }, body: { odpovede: deep, meno: 'Fail', email: 'fail@example.sk', gdpr_suhlas: true } }));
    const { token } = r.json();
    let s;
    for (let i = 0; i < 50; i++) {
      s = (await call(status, mockReq({ query: { token } }))).json();
      if (s.status === 'failed') break;
      await wait(20);
    }
    assert.equal(s.status, 'failed');
    await wait(50);
    const subjects = fs.readdirSync(path.join(dataDir, 'mail')).filter((f) => f.endsWith('.txt'))
      .map((f) => fs.readFileSync(path.join(dataDir, 'mail', f), 'utf8').split('\n').slice(0, 2).join(' '));
    assert.ok(subjects.some((s) => s.includes('fail@example.sk') && s.includes('Nedopadlo to, skúšame znova')));
    assert.ok(subjects.some((s) => s.includes('silvia@fenixos.sk') && s.includes('Zlyhanie: Fail')));
    const db = require('../api/_lib/zakaznik/db');
    const row = await db.getByToken(token);
    assert.equal(row.attempts, 1);
    assert.ok(row.error.includes('nedostupné'));
  } finally {
    delete process.env.MOCK_AI_FAIL;
  }
});
