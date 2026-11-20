const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'makler-test-'));
process.env.MAKLER_MOCK = '1';
process.env.MAKLER_DEV_DATA = dataDir;
process.env.MOCK_AI_DELAY_MS = '5';
delete process.env.MAKLER_HESLO;

const ROOT = path.join(__dirname, '..');
const FORM = require('../makler/form.js');
const { avatarSchema, outputSchema } = require('../api/_lib/makler/schema');
const prompt = require('../api/_lib/makler/prompt');
const render = require('../api/_lib/makler/render');
const auth = require('../api/_lib/makler/auth');
const predavajuci = require('../scripts/dev/fixture-predavajuci.json');
const kupujuci = require('../scripts/dev/fixture-kupujuci.json');

const VSTUPY = {
  situacia: 'Zdedila byt po mame v Trenčíne, býva v Bratislave a nevie, koľko pýtať.',
  region: 'Trenčín a okolie',
  nehnutelnost: 'Byt',
  cena: '100 000 – 200 000 €',
  kanal: 'Facebook a Instagram',
  doplnok: 'Často počujem: „Najprv to skúsim predať sám.“',
  autor: 'Jana Testová'
};

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

async function waitForStatus(token, wanted) {
  const status = require('../api/makler/status');
  let s;
  for (let i = 0; i < 100; i++) {
    s = (await call(status, mockReq({ query: { token } }))).json();
    if (wanted.includes(s.status)) return s;
    await wait(10);
  }
  return s;
}

test('formulár: dva typy, povinné polia s konkrétnou výzvou, kupujúci má financovanie', () => {
  assert.deepEqual(Object.keys(FORM.TYPY), ['predavajuci', 'kupujuci']);
  assert.deepEqual(FORM.fields('predavajuci').map((f) => f.id), ['situacia', 'region', 'nehnutelnost', 'cena', 'kanal', 'doplnok', 'autor']);
  assert.ok(FORM.fields('kupujuci').some((f) => f.id === 'financovanie'));
  assert.deepEqual(FORM.fields('neexistuje'), []);
  for (const typ of Object.keys(FORM.TYPY)) {
    for (const f of FORM.fields(typ)) {
      if (f.optional) {
        assert.equal(FORM.fieldError(f, ''), null);
        continue;
      }
      assert.ok(FORM.fieldError(f, '').length > 10, `${typ}.${f.id}`);
      assert.doesNotMatch(FORM.fieldError(f, ''), /povinné/i);
    }
    const sit = FORM.fields(typ)[0];
    assert.ok(sit.moznosti.length >= 5);
    for (const m of sit.moznosti) assert.equal(FORM.fieldError(sit, m), null, m);
  }
});

test('ukážkové avatary prechádzajú schémou a API schéma spĺňa obmedzenia structured outputs', () => {
  assert.equal(avatarSchema.safeParse(predavajuci).success, true);
  assert.equal(avatarSchema.safeParse(kupujuci).success, true);
  const schema = outputSchema();
  for (const key of ['archetyp', 'a_profil', 'b_psychologia', 'c_vnutorny_dialog', 'd_jazyk', 'e_namietky',
    'f_cenova_strategia', 'g_socialne_siete', 'h_overit']) {
    assert.ok(schema.required.includes(key), key);
  }
  const walk = (node, at) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'object') assert.equal(node.additionalProperties, false, at);
    assert.ok(!('minLength' in node) && !('maxLength' in node) && !('$schema' in node), at);
    if ('minItems' in node) assert.ok(node.minItems <= 1, at);
    for (const [k, v] of Object.entries(node)) walk(v, `${at}.${k}`);
  };
  walk(schema, 'root');
  const broken = JSON.parse(JSON.stringify(predavajuci));
  delete broken.f_cenova_strategia;
  assert.equal(avatarSchema.safeParse(broken).success, false);
});

test('prompt: kontext Moderného makléra, zadanie a cenová stratégia podľa typu', () => {
  const sys = prompt.buildSystemPrompt('predavajuci', VSTUPY);
  assert.match(sys, /Moderný maklér/);
  assert.ok(sys.includes(`Situácia: ${VSTUPY.situacia}`));
  assert.ok(sys.includes('Lokalita: Trenčín a okolie'));
  assert.ok(sys.includes('CENOVÁ STRATÉGIA PRE PREDÁVAJÚCEHO'));
  assert.ok(sys.includes('Facebook a Instagram bez prepisovania'));
  assert.ok(!sys.includes('{{'));

  const buy = prompt.buildSystemPrompt('kupujuci', { ...VSTUPY, financovanie: 'Hypotéka' });
  assert.ok(buy.includes('CENOVÁ STRATÉGIA PRE KUPUJÚCEHO'));
  assert.ok(buy.includes('Financovanie: Hypotéka'));
  assert.ok(!buy.includes('PRE PREDÁVAJÚCEHO'));

  const msg = prompt.buildUserMessage('predavajuci', VSTUPY);
  assert.ok(msg.includes(VSTUPY.doplnok));
  assert.ok(!msg.includes(VSTUPY.autor), 'meno makléra nejde do AI');
});

test('požiadavka na Anthropic: structured outputs, bez temperature a bez vynúteného nástroja', async () => {
  const realFetch = global.fetch;
  let sent;
  process.env.MAKLER_MOCK = '0';
  process.env.ANTHROPIC_API_KEY = 'test-key';
  global.fetch = async (url, init) => {
    sent = { url, body: JSON.parse(init.body), headers: init.headers };
    return new Response(JSON.stringify({
      stop_reason: 'end_turn',
      content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(predavajuci) }],
      usage: { input_tokens: 10, output_tokens: 20 }
    }), { status: 200 });
  };
  try {
    const { generateAvatar } = require('../api/_lib/makler/generate');
    const result = await generateAvatar('predavajuci', VSTUPY);
    assert.equal(result.avatar.archetyp, predavajuci.archetyp);
    assert.equal(sent.url, 'https://api.anthropic.com/v1/messages');
    assert.equal(sent.body.model, 'claude-opus-5-5');
    assert.equal(sent.body.output_config.format.type, 'json_schema');
    assert.equal(sent.body.output_config.effort, 'medium');
    for (const forbidden of ['temperature', 'tool_choice', 'tools', 'thinking', 'top_p']) {
      assert.ok(!(forbidden in sent.body), forbidden);
    }
  } finally {
    global.fetch = realFetch;
    process.env.MAKLER_MOCK = '1';
    delete process.env.ANTHROPIC_API_KEY;
  }
});

test('neznámy model: druhý pokus ide na záložný model', async () => {
  const realFetch = global.fetch;
  const models = [];
  process.env.MAKLER_MOCK = '0';
  process.env.ANTHROPIC_API_KEY = 'test-key';
  global.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    models.push(body.model);
    if (models.length === 1) return new Response('{"type":"error","error":{"type":"not_found_error"}}', { status: 404 });
    return new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(kupujuci) }], usage: {} }), { status: 200 });
  };
  try {
    const { generateAvatar } = require('../api/_lib/makler/generate');
    const result = await generateAvatar('kupujuci', { ...VSTUPY, financovanie: 'Hypotéka' });
    assert.deepEqual(models, ['claude-opus-5-5', 'claude-sonnet-5-5']);
    assert.equal(result.model, 'claude-sonnet-5-5');
  } finally {
    global.fetch = realFetch;
    process.env.MAKLER_MOCK = '1';
    delete process.env.ANTHROPIC_API_KEY;
  }
});

test('report escapuje HTML, má všetky bloky a textovú verziu', () => {
  const evil = JSON.parse(JSON.stringify(predavajuci));
  evil.archetyp = '<script>alert(1)</script>';
  evil.c_vnutorny_dialog = '"><img src=x onerror=alert(1)>';
  const row = { token: 'A'.repeat(32), typ: 'predavajuci', autor: 'Jana <b>', vstupy: VSTUPY, avatar: evil, created_at: new Date().toISOString() };
  const out = render.renderAvatar(row);
  assert.ok(!out.includes('<script>alert'));
  assert.ok(!out.includes('<img src=x'));
  assert.ok(out.includes('&lt;script&gt;'));
  for (const l of ['A · Profil', 'B · Psychológia', 'C · Vnútorný dialóg', 'D · Jazyk', 'E · Námietky', 'F · Cenová stratégia', 'G · Sociálne siete', 'H · Overenie']) {
    assert.ok(out.includes(l), l);
  }
  assert.ok(out.includes('Hodnota služby a provízia'));
  assert.ok(out.includes('Kopírovať reklamu'));
  assert.ok(!/<script type="application\/json" id="avatar-text">[^]*<\/script>[^]*<\/script>[^]*<\/script>[^]*<\/script>/.test(out), 'JSON neukončí script');
  const text = render.renderAvatarText({ ...row, avatar: predavajuci });
  assert.ok(text.startsWith('Opatrná dedička Jana'));
  assert.ok(text.includes('F CENOVÁ STRATÉGIA'));
  assert.ok(render.renderAvatar({ ...row, typ: 'kupujuci', avatar: kupujuci }).includes('Ako s ním hovoriť o cene a vyjednávať'));
});

test('heslo: bez cookie sa API nepustí, prihlásenie nastaví cookie', async () => {
  process.env.MAKLER_HESLO = 'tajne-heslo-123';
  process.env.MAKLER_MOCK = '0';
  try {
    const submit = require('../api/makler/submit');
    const list = require('../api/makler/list');
    const report = require('../api/makler/report');
    const login = require('../api/makler-login');
    assert.equal((await call(submit, mockReq({ method: 'POST', body: {} }))).statusCode, 401);
    assert.equal((await call(list, mockReq())).statusCode, 401);
    const rep = await call(report, mockReq({ query: { token: 'A'.repeat(32) } }));
    assert.equal(rep.statusCode, 303);
    assert.equal(rep.headers.location, '/makler/prihlasenie.html');

    const bad = await call(login, mockReq({ method: 'POST', body: { heslo: 'zle', next: '/makler/' } }));
    assert.match(bad.headers.location, /chyba=1/);
    assert.equal(bad.headers['set-cookie'], undefined);

    const ok = await call(login, mockReq({ method: 'POST', body: 'heslo=tajne-heslo-123&next=%2Fmakler%2Favatar.html', headers: { ip: '198.51.100.40' } }));
    assert.equal(ok.headers.location, '/makler/avatar.html');
    const cookie = ok.headers['set-cookie'].split(';')[0];
    assert.match(ok.headers['set-cookie'], /HttpOnly; Secure; SameSite=Lax/);
    assert.equal(auth.isAuthorized({ headers: { cookie } }), true);
    assert.equal(auth.isAuthorized({ headers: { cookie: 'makler=' + 'x'.repeat(64) } }), false);

    const evil = await call(login, mockReq({ method: 'POST', body: { heslo: 'tajne-heslo-123', next: '//evil.com' }, headers: { ip: '198.51.100.41' } }));
    assert.equal(evil.headers.location, '/makler/');
  } finally {
    delete process.env.MAKLER_HESLO;
    process.env.MAKLER_MOCK = '1';
  }
});

test('middleware: zóna /makler má vlastné heslo, zóna /klient funguje ako predtým', async () => {
  const { default: middleware } = await import(path.join(ROOT, 'middleware.js'));
  process.env.MAKLER_HESLO = 'makler-heslo';
  process.env.KLIENT_HESLO = 'klient-heslo';
  try {
    const go = (p, cookie) => middleware(new Request('https://silviarakus.sk' + p, { headers: cookie ? { cookie } : {} }));
    const r1 = await go('/makler/avatar/abc');
    assert.equal(r1.status, 307);
    assert.equal(new URL(r1.headers.get('location')).pathname, '/makler/prihlasenie.html');
    assert.equal(await go('/makler/prihlasenie.html'), undefined);
    assert.equal(await go('/makler/', 'makler=' + auth.token('makler-heslo')), undefined);
    assert.equal((await go('/makler/', 'klient=' + auth.token('makler-heslo'))).status, 307, 'cookie z inej zóny neplatí');

    const crypto = require('crypto');
    const klientToken = crypto.createHash('sha256').update('klient-heslo|silviarakus-klient').digest('hex');
    assert.equal(await go('/klient/manazer.html', 'klient=' + klientToken), undefined);
    assert.equal((await go('/klient/manazer.html', 'makler=' + auth.token('makler-heslo'))).status, 307);
  } finally {
    delete process.env.MAKLER_HESLO;
    delete process.env.KLIENT_HESLO;
  }
});

test('heslo: medzery okolo a iný zápis diakritiky prejdú, chýbajúce heslo na serveri má vlastnú hlášku', async () => {
  const { default: middleware } = await import(path.join(ROOT, 'middleware.js'));
  const login = require('../api/makler-login');
  process.env.MAKLER_MOCK = '0';
  try {
    delete process.env.MAKLER_HESLO;
    const chyba = await call(login, mockReq({ method: 'POST', body: { heslo: 'cokolvek' }, headers: { ip: '198.51.100.50' } }));
    assert.match(chyba.headers.location, /chyba=nastavenie/);

    process.env.MAKLER_HESLO = ' Maklér2026 \n';
    const ok = await call(login, mockReq({ method: 'POST', body: { heslo: 'Maklér2026'.normalize('NFD') + ' ' }, headers: { ip: '198.51.100.51' } }));
    assert.equal(ok.headers.location, '/makler/');
    const cookie = ok.headers['set-cookie'].split(';')[0];
    assert.equal(auth.isAuthorized({ headers: { cookie } }), true);
    assert.equal(await middleware(new Request('https://silviarakus.sk/makler/', { headers: { cookie } })), undefined);

    const zle = await call(login, mockReq({ method: 'POST', body: { heslo: 'makler2026' }, headers: { ip: '198.51.100.52' } }));
    assert.match(zle.headers.location, /chyba=1/);
  } finally {
    delete process.env.MAKLER_HESLO;
    process.env.MAKLER_MOCK = '1';
  }
});

test('end-to-end (mock): zadanie → generovanie → report → prehľad tímu → výmaz', async () => {
  const submit = require('../api/makler/submit');
  const report = require('../api/makler/report');
  const list = require('../api/makler/list');

  const r = await call(submit, mockReq({ method: 'POST', body: { typ: 'predavajuci', vstupy: VSTUPY } }));
  assert.equal(r.statusCode, 200, r.body);
  const { token } = r.json();
  assert.match(token, /^[A-Za-z0-9_-]{32}$/);
  assert.equal((await waitForStatus(token, ['done'])).status, 'done');

  const page = await call(report, mockReq({ query: { token } }));
  assert.equal(page.statusCode, 200);
  assert.ok(page.body.includes('Opatrná dedička Jana'));
  assert.ok(page.body.includes('Vytvoril(a) Jana Testová'));
  assert.equal(page.headers['x-robots-tag'], 'noindex, nofollow');

  const db = require('../api/_lib/makler/db');
  const row = await db.getByToken(token);
  assert.equal(row.archetyp, 'Opatrná dedička Jana');
  assert.equal(row.model, 'claude-opus-5-5');
  assert.ok(!JSON.stringify(row).includes('203.0.113.1'));

  const team = (await call(list, mockReq())).json().avatary;
  assert.ok(team.some((a) => a.token === token && a.typ === 'predavajuci' && a.autor === 'Jana Testová'));
  assert.ok(!('vstupy' in team[0]) && !('avatar' in team[0]));

  const del = await call(report, mockReq({ method: 'POST', query: { token }, body: 'akcia=vymazat' }));
  assert.equal(del.headers.location, '/makler/?vymazane=1');
  assert.equal((await call(report, mockReq({ query: { token } }))).statusCode, 404);
  assert.equal((await call(report, mockReq({ query: { token: '../etc' } }))).statusCode, 404);
});

test('server odmietne neplatný typ, krátku situáciu a vyplnený honeypot', async () => {
  const submit = require('../api/makler/submit');
  const post = (body) => call(submit, mockReq({ method: 'POST', headers: { ip: '192.0.2.50' }, body }));
  assert.equal((await post({ typ: 'iny', vstupy: VSTUPY })).json().field, 'typ');
  const short = await post({ typ: 'predavajuci', vstupy: { ...VSTUPY, situacia: 'dedič' } });
  assert.equal(short.statusCode, 400);
  assert.equal(short.json().field, 'situacia');
  const noFin = await post({ typ: 'kupujuci', vstupy: VSTUPY });
  assert.equal(noFin.json().field, 'financovanie');
  assert.equal((await post({ typ: 'predavajuci', vstupy: VSTUPY, web: 'http://spam' })).statusCode, 400);
});

test('limit počtu avatarov z jedného pripojenia za hodinu', async () => {
  process.env.MAKLER_LIMIT_ZA_HODINU = '2';
  try {
    const submit = require('../api/makler/submit');
    const send = () => call(submit, mockReq({ method: 'POST', headers: { ip: '198.51.100.7' }, body: { typ: 'predavajuci', vstupy: VSTUPY } }));
    assert.equal((await send()).statusCode, 200);
    assert.equal((await send()).statusCode, 200);
    const third = await send();
    assert.equal(third.statusCode, 429);
    assert.match(third.json().error, /hodinu/);
    await wait(50);
  } finally {
    delete process.env.MAKLER_LIMIT_ZA_HODINU;
  }
});

test('zlyhanie AI: stav failed s technickým detailom, „Skúsiť znova“ avatara dokončí', async () => {
  const submit = require('../api/makler/submit');
  const report = require('../api/makler/report');
  process.env.MOCK_AI_FAIL = '1';
  let token;
  try {
    const r = await call(submit, mockReq({ method: 'POST', headers: { ip: '192.0.2.99' }, body: { typ: 'kupujuci', vstupy: { ...VSTUPY, financovanie: 'Hypotéka' } } }));
    token = r.json().token;
    assert.equal((await waitForStatus(token, ['failed'])).status, 'failed');
    const page = await call(report, mockReq({ query: { token } }));
    assert.ok(page.body.includes('Skúsiť znova'));
    assert.ok(page.body.includes('Anthropic API je nedostupné'));
  } finally {
    delete process.env.MOCK_AI_FAIL;
  }
  const retry = await call(report, mockReq({ method: 'POST', query: { token }, body: { akcia: 'znova' } }));
  assert.equal(retry.headers.location, `/makler/avatar/${token}`);
  assert.equal((await waitForStatus(token, ['done'])).status, 'done');
  assert.ok((await call(report, mockReq({ query: { token } }))).body.includes('Nájomníci Martin a Lucia'));
});

test('brand: zóna /makler používa len farby z palety a písma Sora + Manrope', () => {
  const palette = new Set(['#0B0D10', '#1C2128', '#F5F1E8', '#C66A2B', '#FF7A1A', '#8E8E8E', '#11151A', '#E84A1A', '#D8C7AA']);
  const files = ['makler/index.html', 'makler/avatar.html', 'makler/prihlasenie.html', 'makler/makler.css', 'makler/app.js', 'api/_lib/makler/render.js'];
  for (const file of files) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8').split('@media print')[0];
    for (const hex of src.match(/#[0-9a-fA-F]{6}\b/g) || []) {
      assert.ok(palette.has(hex.toUpperCase()), `${file}: ${hex} nie je v palete`);
    }
    for (const fam of src.match(/family=[A-Za-z+]+/g) || []) {
      assert.ok(['family=Sora', 'family=Manrope'].includes(fam), `${file}: ${fam}`);
    }
  }
});
