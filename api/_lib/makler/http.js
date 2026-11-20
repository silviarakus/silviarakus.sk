const crypto = require('crypto');

const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

function newToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function isValidToken(token) {
  return typeof token === 'string' && TOKEN_RE.test(token);
}

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || String(req.headers['x-real-ip'] || '') || (req.socket && req.socket.remoteAddress) || '';
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(`${ip}|silviarakus-makler`).digest('hex');
}

function readBody(req) {
  const body = req.body;
  if (!body) return {};
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return Object.fromEntries(new URLSearchParams(body)); }
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
  res.statusCode = status;
  res.end(body);
}

function queryParam(req, name) {
  if (req.query && req.query[name] !== undefined) return String(req.query[name]);
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get(name) || '';
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { newToken, isValidToken, clientIp, hashIp, readBody, json, html, queryParam, escapeHtml };
