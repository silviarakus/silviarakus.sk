# Diagnostiky
Interaktívne diagnostiky a nástroje — Silvia Rakus, HVSA
Pridanie diagnostiky manažéra v1.0

## Avatar zákazníka pre maklérov (`/makler`)

Interný nástroj pre maklérov Moderného makléra, chránený vlastným heslom (`MAKLER_HESLO`, oddelené od zóny `/klient`).
Maklér vyberie avatara predávajúceho alebo kupujúceho a opíše situáciu, lokalitu, typ a cenu nehnuteľnosti
a sociálnu sieť. AI (Anthropic) dopracuje psychológiu, námietky s odpoveďami, cenovú stratégiu a podklady
pre reklamu a obsah. Avatary sa ukladajú do Supabase a celý tím ich vidí v prehľade.

| Čo | Kde |
|---|---|
| Stránky zóny | `makler/` (prihlásenie, prehľad, formulár, štýly; texty polí sú v `makler/form.js`) |
| Serverové funkcie | `api/makler/` (submit, status, report, list), `api/makler-login.js`, `api/makler-logout.js` |
| AI prompt, schéma, report | `api/_lib/makler/` |
| Ochrana heslom | `middleware.js` |
| Databáza | `supabase/migrations/001_makler_avatary.sql` |

### Nastavenie pred spustením

1. **Supabase** — v *SQL Editor* spusti celý súbor `supabase/migrations/001_makler_avatary.sql`.
2. **Vercel → Project → Settings → Environment Variables** (Production aj Preview):

| Premenná | Hodnota |
|---|---|
| `MAKLER_HESLO` | heslo, ktoré dáš maklérom |
| `ANTHROPIC_API_KEY` | kľúč z Anthropic |
| `SUPABASE_URL` | Project URL zo Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | secret (`sb_secret_…`) alebo legacy service_role kľúč |

Voliteľné: `MAKLER_MODEL` (default `claude-opus-5-5`), `MAKLER_FALLBACK_MODEL` (default `claude-sonnet-5-5`),
`MAKLER_EFFORT` (default `medium`), `MAKLER_LIMIT_ZA_HODINU` (default 20 avatarov z jedného pripojenia).

3. **Vercel → Settings → Functions** — zapnutý *Fluid Compute* (generovanie môže trvať až 5 minút).

Zmena `MAKLER_HESLO` odhlási všetkých maklérov.

### Lokálne spustenie a testy

```bash
npm install
npm run dev   # http://localhost:3000/makler/ — databáza aj AI sú simulované, bez hesla
npm test
```
