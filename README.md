# Diagnostiky

Interaktívne diagnostiky a nástroje — Silvia Rakus, HVSA.

Statické stránky (`index.html`, `fenix.html`, `Diagnostika_Manazera.html`,
`Diagnostika_Metaprogramov.html`) plus jedna serverless funkcia v `api/`, ktorá
ukladá výsledky diagnostiky do Notion. V produkcii to beží na Verceli.

## Lokálne spustenie

Potrebuješ len Node 18 alebo novší (`node --version`). Žiadne `npm install`.

```bash
git clone https://github.com/silviarakus/silviarakus.sk.git
cd silviarakus.sk
cp .env.example .env      # doplň NOTION_TOKEN a NOTION_DB_ID
node server.js
```

Otvor **http://localhost:3000**.

`server.js` servíruje statické stránky z koreňa projektu a požiadavky na
`/api/*` posiela funkciám v priečinku `api/` — teda `/api/save-diagnostika`
spustí `api/save-diagnostika.js`, rovnako ako na Verceli. Funkcia sa načítava
pri každej požiadavke, takže po jej úprave stačí obnoviť stránku; pri zmene
`server.js` server reštartuj.

Iný port: `PORT=8080 node server.js` (alebo `PORT=8080` v `.env`).

### Premenné prostredia

Server ich číta zo súboru `.env` v koreni projektu (vzor: `.env.example`).
Ten istý súbor `.env` sa nikdy nekomituje — je v `.gitignore`.

| Premenná | Povinná | Význam |
|---|---|---|
| `NOTION_TOKEN` | áno | Secret internej Notion integrácie (`ntn_...`) |
| `NOTION_DB_ID` | áno | ID Notion databázy s výsledkami |
| `ALLOWED_ORIGIN` | nie | Povolený origin pre CORS, default `*` |
| `PORT` | nie | Port lokálneho servera, default `3000` |

Ak `NOTION_TOKEN` alebo `NOTION_DB_ID` chýba, server na to pri štarte upozorní.
Diagnostiky aj tak bežia a výsledok sa klientovi zobrazí — len sa neuloží
(`/api/save-diagnostika` vráti 500 a stránka zlyhanie ticho ignoruje).

Notion integrácia musí mať k databáze prístup: v Notion otvor databázu →
menu `···` → **Connections** → pridaj integráciu. Bez toho vráti API 502.

### Overenie, že API funguje

```bash
curl -X POST http://localhost:3000/api/save-diagnostika \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","readinessTotal":72,"tier":"Ideálny kandidát"}'
```

- `{"ok":true}` — uložené, skontroluj riadok v Notion databáze
- `{"error":"Chýba NOTION_TOKEN alebo NOTION_DB_ID"}` — chýba alebo sa nenačítal `.env`
- `{"error":"Notion API zlyhalo","detail":"..."}` — Notion odmietol požiadavku,
  `detail` povie prečo (zlý token, nezdieľaná databáza, nesúhlasiace stĺpce)

### Alternatíva: Vercel CLI

Ak chceš prostredie čo najbližšie produkcii vrátane routovania Vercelu:

```bash
npm i -g vercel
vercel dev
```

`server.js` je jednoduchšia cesta — nevyžaduje účet, prihlásenie ani inštaláciu.

## Štruktúra

```
index.html                      rozcestník
fenix.html                      FENIX — stratégia hodnoty
Diagnostika_Manazera.html       diagnostika manažéra a lídra
Diagnostika_Metaprogramov.html  diagnostika metaprogramov (ukladá do Notion)
api/save-diagnostika.js         serverless funkcia — zápis do Notion
assets/                         logá a fotky
server.js                       lokálny dev server (nepoužíva sa v produkcii)
fenixbrandmanual.md             brand manuál FENIX
```
