// Vercel Routing Middleware: zóna pre klientov (/klient/*) je chránená heslom.
// Heslo je v env premennej KLIENT_HESLO (Vercel → Project → Settings → Environment Variables).
// Po zmene hesla sa všetci prihlásení automaticky odhlásia.

export const config = {
  matcher: ['/klient', '/klient/:path*'],
};

const VEREJNE = ['/klient/prihlasenie', '/klient/prihlasenie.html'];

async function token(heslo) {
  const data = new TextEncoder().encode(heslo + '|silviarakus-klient');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function cookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  const m = raw.split(/;\s*/).find((c) => c.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : '';
}

export default async function middleware(request) {
  const url = new URL(request.url);
  if (VEREJNE.includes(url.pathname)) return;

  const heslo = process.env.KLIENT_HESLO;
  if (heslo && cookie(request, 'klient') === (await token(heslo))) return;

  const login = new URL('/klient/prihlasenie.html', url);
  login.searchParams.set('next', url.pathname);
  return Response.redirect(login, 307);
}
