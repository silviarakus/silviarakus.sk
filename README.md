# Diagnostiky
Interaktívne diagnostiky a nástroje — Silvia Rakus, HVSA
Pridanie diagnostiky manažéra v1.0

## Kto je môj zákazník? (`/kto-je-moj-zakaznik`)

Dotazník o ideálnom zákazníkovi. Odpovede spracuje AI (Anthropic) a hotový profil príde na e-mail (Resend). Všetko sa ukladá do databázy (Supabase).

| Čo | Kde |
|---|---|
| Stránka a dotazník | `kto-je-moj-zakaznik.html`, `assets/zakaznik/` (texty otázok sú v `form.js`) |
| Serverové funkcie | `api/zakaznik/` (submit, status, report, delete, config, cron) |
| AI prompt, schéma, e-mail, report | `api/_lib/zakaznik/` |
| Databáza | `supabase/migrations/001_zakaznik_submissions.sql` |
| Ochrana osobných údajov | `ochrana-osobnych-udajov.html` (pracovná verzia, treba doplniť údaje prevádzkovateľa) |

### Nastavenie pred spustením

1. **Supabase** — založ projekt (región EU, napr. Frankfurt). V *SQL Editor* spusti celý súbor `supabase/migrations/001_zakaznik_submissions.sql`. V *Project Settings → API* skopíruj *Project URL* a kľúč *service_role*.
2. **Anthropic** — na console.anthropic.com vytvor API kľúč a nastav si mesačný limit.
3. **Resend** — pridaj doménu `silviarakus.sk`, vlož DNS záznamy, ktoré Resend ukáže (SPF, DKIM), počkaj na „Verified“ a vytvor API kľúč.
4. **Cloudflare Turnstile** — pridaj widget pre `silviarakus.sk` a skopíruj *Site Key* a *Secret Key*.
5. **Vercel → Project → Settings → Environment Variables** (Production):

| Premenná | Hodnota |
|---|---|
| `ANTHROPIC_API_KEY` | kľúč z Anthropic |
| `SUPABASE_URL` | Project URL zo Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role kľúč zo Supabase |
| `RESEND_API_KEY` | kľúč z Resend |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | kľúče z Cloudflare |
| `IP_HASH_SALT` | ľubovoľný dlhý náhodný reťazec |
| `CRON_SECRET` | ľubovoľný dlhý náhodný reťazec |

Voliteľné: `ZAKAZNIK_MODEL` (default `claude-opus-5`), `ZAKAZNIK_FALLBACK_MODEL` (default `claude-sonnet-5`), `ZAKAZNIK_MAIL_FROM` (default `Silvia Rakus <zakaznik@silviarakus.sk>`), `ZAKAZNIK_NOTIFY_EMAIL` (default `silvia@fenixos.sk`), `ZAKAZNIK_CTA_LABEL` a `ZAKAZNIK_CTA_URL` (tlačidlo na konci reportu).

6. **Vercel → Settings → Functions** — skontroluj, že je zapnutý *Fluid Compute* (generovanie môže trvať až 5 minút).
7. **Notion (voliteľné)** — ak chceš leady aj v Notion, vytvor databázu so stĺpcami `Meno` (title), `E-mail` (email), `Firma` (text), `Segment` (text), `Cena` (select), `Archetyp` (text), `Report` (url), `Marketing súhlas` (checkbox), `Dátum` (date), pridaj k nej existujúcu integráciu a jej ID nastav do `NOTION_ZAKAZNIK_DB_ID`.

### Lokálne spustenie a testy

```bash
npm install
npm run dev   # http://localhost:3000/kto-je-moj-zakaznik — databáza, AI aj e-mail sú simulované
npm test
```

Simulované e-maily sa ukladajú do `.dev-data/mail/`.
