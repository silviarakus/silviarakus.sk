// Vercel Routing Middleware: zóny chránené heslom.
//   /klient/*  – zóna pre klientov, heslo v KLIENT_HESLO
//   /makler/*  – nástroje pre maklérov Moderného makléra, heslo v MAKLER_HESLO
// Heslá sú v env premenných (Vercel → Project → Settings → Environment Variables).
// Po zmene hesla sa všetci prihlásení v danej zóne automaticky odhlásia.

export const config = {
  matcher: ['/klient', '/klient/:path*', '/makler', '/makler/:path*'],
};

const ZONY = {
  klient: { env: 'KLIENT_HESLO', verejne: ['/klient/prihlasenie', '/klient/prihlasenie.html'] },
  makler: { env: 'MAKLER_HESLO', verejne: ['/makler/prihlasenie', '/makler/prihlasenie.html'] },
};

async function token(heslo, zona) {
  const data = new TextEncoder().encode(heslo + '|silviarakus-' + zona);
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
  const nazov = url.pathname.split('/')[1];
  const zona = ZONY[nazov];
  if (!zona || zona.verejne.includes(url.pathname)) return;

  const heslo = process.env[zona.env];
  if (heslo && cookie(request, nazov) === (await token(heslo, nazov))) return;

  const login = new URL('/' + nazov + '/prihlasenie.html', url);
  login.searchParams.set('next', url.pathname);
  return Response.redirect(login, 307);
}
