function readBody(req) {
  const body = req.body;
  if (!body) return {};
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return {}; }
  }
  return body;
}

function json(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

function html(res, status, body) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.statusCode = status;
  res.end(body);
}

function queryParam(req, name) {
  if (req.query && req.query[name] !== undefined) return String(req.query[name]);
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get(name) || '';
}

module.exports = { readBody, json, html, queryParam };
