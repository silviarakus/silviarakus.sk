#!/usr/bin/env node
/**
 * Lokálny dev server pre silviarakus.sk.
 *
 * Servíruje statické stránky z koreňa projektu a zároveň spúšťa serverless
 * funkcie z priečinka api/ — rovnako, ako to robí Vercel v produkcii.
 * Bez závislostí, stačí Node 18+.
 *
 *   node server.js            → http://localhost:3000
 *   PORT=8080 node server.js  → iný port
 *
 * Premenné prostredia sa načítajú zo súboru .env (vzor je v .env.example).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const API_DIR = path.join(ROOT, 'api');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/* ============ .env ============ */
function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    // voliteľné "export ", medzery okolo "=", orezané medzery na konci hodnoty
    const m = line.match(/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])([\s\S]*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

/* ============ API ============ */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Doplní res o Vercel-ovské pomocníky, ktoré funkcie v api/ používajú.
function decorate(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return res;
  };
  res.send = (data) => { res.end(data); return res; };
  return res;
}

async function handleApi(req, res, route) {
  const file = path.join(API_DIR, route + '.js');
  if (!file.startsWith(API_DIR + path.sep) || !fs.existsSync(file)) return false;

  const raw = await readBody(req);
  const type = req.headers['content-type'] || '';
  if (raw && type.includes('application/json')) {
    try {
      req.body = JSON.parse(raw);
    } catch {
      decorate(res).status(400).json({ error: 'Neplatný JSON v tele požiadavky' });
      return true;
    }
  } else {
    req.body = raw;
  }

  delete require.cache[require.resolve(file)]; // hot reload pri editovaní funkcie
  const handler = require(file);
  await handler(req, decorate(res));
  return true;
}

/* ============ statické súbory ============ */
function serveStatic(req, res, pathname) {
  const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const file = path.join(ROOT, rel);

  if (!file.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end('403 Forbidden');
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1><p>Stránka sa nenašla. <a href="/">Späť na úvod</a></p>');
    return;
  }

  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-cache', // dev: vždy čerstvá verzia po uložení súboru
  });
  fs.createReadStream(file).pipe(res);
}

/* ============ server ============ */
loadEnv(); // musí bežať skôr, než čítame PORT a odovzdáme env funkciám v api/
const PORT = Number(process.env.PORT) || 3000;

http
  .createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    try {
      if (pathname.startsWith('/api/')) {
        const handled = await handleApi(req, res, pathname.slice('/api/'.length));
        if (handled) {
          console.log(`${req.method} ${pathname} → ${res.statusCode}`);
          return;
        }
      }
      serveStatic(req, res, pathname);
    } catch (err) {
      console.error(`${req.method} ${pathname} zlyhalo:`, err);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: String((err && err.message) || err) }));
    }
  })
  .listen(PORT, () => {
    const notion = process.env.NOTION_TOKEN && process.env.NOTION_DB_ID;
    console.log(`\n  Web beží na http://localhost:${PORT}`);
    console.log(`  API:        http://localhost:${PORT}/api/save-diagnostika`);
    console.log(
      notion
        ? '  Notion:     NOTION_TOKEN aj NOTION_DB_ID sú nastavené — výsledky sa budú ukladať.'
        : '  Notion:     chýba NOTION_TOKEN / NOTION_DB_ID — diagnostiky pobežia, ukladanie vráti chybu 500.\n              Skopíruj .env.example do .env a doplň hodnoty.'
    );
    console.log('\n  Ukončenie: Ctrl+C\n');
  });
