/* Lokálny server, ktorý napodobňuje Vercel: statické súbory, rewrites z vercel.json a /api funkcie.
   Spustenie: npm run dev  (ZAKAZNIK_MOCK=1 → databáza, AI aj e-mail sú simulované) */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/plain; charset=utf-8'
};

const rewrites = (vercel.rewrites || []).map((r) => {
  const names = [];
  const re = new RegExp('^' + r.source.replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+)'; }) + '$');
  return { re, names, destination: r.destination };
});

function applyRewrites(pathname) {
  for (const r of rewrites) {
    const m = pathname.match(r.re);
    if (!m) continue;
    let dest = r.destination;
    r.names.forEach((n, i) => { dest = dest.replace(`:${n}`, encodeURIComponent(decodeURIComponent(m[i + 1]))); });
    return dest;
  }
  return pathname;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      if (!data) return resolve(undefined);
      try { resolve(JSON.parse(data)); } catch { resolve(data); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const target = new URL(applyRewrites(url.pathname), url);
  url.searchParams.forEach((v, k) => { if (!target.searchParams.has(k)) target.searchParams.set(k, v); });

  if (target.pathname.startsWith('/api/')) {
    const file = path.join(ROOT, `${target.pathname}.js`);
    if (!file.startsWith(path.join(ROOT, 'api')) || target.pathname.includes('/_') || !fs.existsSync(file)) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    req.query = Object.fromEntries(target.searchParams);
    req.body = await readBody(req);
    req.url = target.pathname + target.search;
    try {
      await require(file)(req, res);
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.end('Internal error');
    }
    return;
  }

  let file = path.join(ROOT, decodeURIComponent(target.pathname));
  if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Dev server: http://localhost:${PORT}/kto-je-moj-zakaznik  (mock: ${process.env.ZAKAZNIK_MOCK === '1'})`);
});
