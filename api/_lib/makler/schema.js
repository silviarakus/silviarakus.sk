const { z } = require('zod');

const text = (description) => z.string().trim().min(1).describe(description);
const list = (min, description) => z.array(z.string().trim().min(1)).min(min).describe(description);

const avatarSchema = z.object({
  archetyp: text('2–4 slová, pamätateľný label s menom, napr. "Opatrná dedička Jana"'),
  esencia: text('1–2 vety: kto je, čo chce a čoho sa bojí'),
  a_profil: z.object({
    meno: text('vymyslené slovenské krstné meno'),
    vek: text('vek alebo vekové rozpätie, napr. "52 rokov"'),
    rodina: text('rodinná situácia'),
    praca_a_prijem: text('čím sa živí a ako je na tom finančne, opis bez čísel'),
    situacia: text('3–4 vety: v akej situácii je s nehnuteľnosťou práve teraz'),
    spustac: text('čo ho prinúti konať práve teraz, nie o rok')
  }),
  b_psychologia: z.object({
    hlavna_bolest: text('3–4 vety, emocionálne: pocit, ktorý situácia vyrába'),
    skryte_obavy: list(3, '4–5 obáv, o ktorých nahlas nehovorí, v 1. osobe'),
    falosne_presvedcenia: z
      .array(z.object({
        presvedcenie: text('v 1. osobe, doslova, ako to povie'),
        realita: text('1–2 vety: ako to v skutočnosti je a ako mu to maklér vysvetlí')
      }))
      .min(3)
      .describe('4 položky'),
    tuzby: list(3, '3–4 položky: čo naozaj chce, hlbšie než peniaze'),
    na_com_mu_zalezi: list(3, '5 hodnôt, 1–3 slová')
  }),
  c_vnutorny_dialog: text('5–7 viet, 1. osoba, hovorovo, ako sa rozpráva sám so sebou večer doma'),
  d_jazyk: z.object({
    ako_hovori: list(4, '5–6 viet presne tak, ako ich povie na prvom stretnutí s maklérom'),
    slova_ktore_zaberu: list(5, '8–10 slov alebo krátkych fráz, ktoré chce počuť'),
    slova_ktore_odpudia: list(3, '4–6 slov alebo fráz, ktoré ho odradia')
  }),
  e_namietky: z
    .array(z.object({
      namietka: text('námietka v 1. osobe, doslova'),
      co_je_pod_tym: text('čoho sa v skutočnosti bojí'),
      odpoved: text('2–4 vety, ktoré maklér povie zákazníkovi, vykanie')
    }))
    .min(4)
    .describe('presne 6 položiek'),
  f_cenova_strategia: z.object({
    ako_vnima_cenu: text('3–4 vety: ako o cene premýšľa, z čoho si ju odvodzuje a čo považuje za férové'),
    cenova_citlivost: z.enum(['nízka', 'stredná', 'vysoká']).describe('ako silno reaguje na cenu'),
    odporucana_strategia: text('4–6 viet: konkrétna cenová stratégia pre tento typ zákazníka'),
    kroky: list(3, '4–6 krokov v poradí, ako stratégiu použiť v praxi'),
    vety_o_cene: list(3, '4–5 viet, ktoré maklér povie zákazníkovi o cene, vykanie'),
    vyjednavanie: list(3, '3–5 rád k vyjednávaniu s týmto človekom'),
    hodnota_sluzby: text('3–4 vety: ako mu ukázať hodnotu služby makléra a obhájiť províziu'),
    chyby: list(2, '3–4 najčastejšie chyby makléra pri cene s týmto zákazníkom')
  }),
  g_socialne_siete: z.object({
    kde_ho_najdes: text('2–3 vety: kde a kedy na sieti trávi čas a čo tam sleduje'),
    cielenie: z.object({
      vek: text('vekové rozpätie na cielenie, napr. "45–65"'),
      lokalita: text('lokalita a okruh na cielenie'),
      zaujmy: list(5, '8–10 záujmov alebo správaní, ktoré sa dajú zadať v reklamnom systéme'),
      zivotne_udalosti: list(1, '2–4 životné udalosti alebo situácie na cielenie')
    }),
    hacky: list(5, 'presne 6 úvodných viet (hooks) pre reels alebo reklamu, max 12 slov'),
    reklamy: z
      .array(z.object({
        nadpis: text('nadpis reklamy, max 8 slov'),
        text: text('hlavný text reklamy, 3–6 krátkych viet, vykanie'),
        vyzva: text('výzva na akciu, napr. "Napíšte mi správu"'),
        vizual: text('čo má byť na fotke alebo vo videu')
      }))
      .min(2)
      .describe('presne 3 reklamy s rôznym uhlom'),
    obsah: z
      .array(z.object({
        format: text('reels, karusel, príspevok alebo story'),
        tema: text('téma a uhol príspevku v 1–2 vetách')
      }))
      .min(4)
      .describe('presne 6 nápadov na obsah')
  }),
  h_overit: list(3, '3–5 otázok, ktorými si maklér overí avatar u skutočných zákazníkov')
});

/* Structured outputs na API prijímajú len podmnožinu JSON Schema: bez dĺžok reťazcov,
   minItems iba 0 alebo 1 a každý objekt s additionalProperties: false. */
function apiSchema(node) {
  if (Array.isArray(node)) return node.map(apiSchema);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (['$schema', 'minLength', 'maxLength', 'maxItems', 'pattern'].includes(key)) continue;
    if (key === 'minItems') { out.minItems = Math.min(1, value); continue; }
    out[key] = apiSchema(value);
  }
  if (out.type === 'object') out.additionalProperties = false;
  return out;
}

function outputSchema() {
  return apiSchema(z.toJSONSchema(avatarSchema));
}

function formatIssues(error) {
  return error.issues
    .slice(0, 25)
    .map((i) => `${i.path.join('.') || '(koreň)'}: ${i.message}`)
    .join('\n');
}

module.exports = { avatarSchema, outputSchema, formatIssues };
